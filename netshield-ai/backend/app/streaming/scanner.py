"""
NETSHIELD AI - SSE Streaming Scanner
Processes CICIDS2017 CSV chunk by chunk and streams results via SSE.
Extracts and preserves real network flow endpoints (Source IP, Destination IP, Protocol, Port)
with 1-to-1 prediction alignment and diagnostic reporting.
"""
import asyncio
import json
import logging
import re
import time
from datetime import datetime
from typing import AsyncIterator, Optional, Dict, Tuple, Any, List
import pandas as pd
from sqlalchemy.orm import Session

from app.core.config import settings
from app.ml.predictor import get_active_predictor
from app.risk.scorer import compute_risk_score
from app.alerts.alert_service import should_create_alert, create_alert
from app.database.models import TrafficRecord, ScanJob
from app.database.session import SessionLocal

logger = logging.getLogger(__name__)

# In-memory scan control flags: scan_id -> should_stop
_scan_stop_flags: dict[str, bool] = {}

# IANA Protocol Number to Name Mapping
PROTOCOL_MAP = {
    6: "TCP", "6": "TCP", "6.0": "TCP",
    17: "UDP", "17": "UDP", "17.0": "UDP",
    1: "ICMP", "1": "ICMP", "1.0": "ICMP",
    0: "HOPOPT", "0": "HOPOPT", "0.0": "HOPOPT",
    2: "IGMP", "2": "IGMP",
    47: "GRE", "47": "GRE",
    50: "ESP", "50": "ESP",
    51: "AH", "51": "AH",
    58: "IPv6-ICMP", "58": "IPv6-ICMP",
    89: "OSPF", "89": "OSPF",
    132: "SCTP", "132": "SCTP",
}


def stop_scan(scan_id: str):
    _scan_stop_flags[scan_id] = True


def is_scan_stopped(scan_id: str) -> bool:
    return _scan_stop_flags.get(scan_id, False)


def clear_scan_flag(scan_id: str):
    _scan_stop_flags.pop(scan_id, None)


def _clean_str(val: Any) -> Optional[str]:
    """Safely return stripped string or None if empty / NaN / null string."""
    if val is None or pd.isna(val):
        return None
    s = str(val).strip()
    if s.lower() in ("", "none", "nan", "null", "n/a", "undefined"):
        return None
    return s


def _format_protocol(val: Any) -> Optional[str]:
    """Format protocol code or string into standard protocol name (e.g. TCP, UDP, ICMP)."""
    if val is None or pd.isna(val):
        return None
    val_str = str(val).strip()
    if val_str in PROTOCOL_MAP:
        return PROTOCOL_MAP[val_str]
    try:
        val_int = int(float(val_str))
        if val_int in PROTOCOL_MAP:
            return PROTOCOL_MAP[val_int]
    except (ValueError, TypeError):
        pass
    if val_str.lower() in ("", "none", "nan", "null", "n/a"):
        return None
    return val_str.upper()


def _safe_int(val: Any) -> Optional[int]:
    """Safely parse integer port number."""
    if val is None or pd.isna(val):
        return None
    try:
        return int(float(str(val).strip()))
    except (ValueError, TypeError):
        return None


def _parse_timestamp(val: Any) -> datetime:
    """Parse timestamp string or return current UTC datetime."""
    if val is None or pd.isna(val):
        return datetime.utcnow()
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ("none", "nan", "null"):
        return datetime.utcnow()
    try:
        return pd.to_datetime(val_str).to_pydatetime()
    except Exception:
        return datetime.utcnow()


def detect_metadata_columns(columns: List[str]) -> Tuple[Dict[str, Optional[str]], Dict[str, Any]]:
    """
    Robustly match source IP, destination IP, ports, protocol, and timestamp from raw CSV columns.
    Handles leading/trailing whitespace, camelCase, snake_case, and standard CICIDS2017 naming.
    Returns: (col_mapping, diagnostics)
    """
    def _norm(name: str) -> str:
        return re.sub(r"[^a-z0-9]", "", str(name).strip().lower())

    norm_to_orig: Dict[str, str] = {}
    for c in columns:
        k = _norm(c)
        if k not in norm_to_orig:
            norm_to_orig[k] = c

    # Matching lists in order of priority
    src_patterns = ["sourceip", "srcip", "sourceipaddress", "srcaddr", "sourceaddress", "ipsrc", "source", "src"]
    dst_patterns = ["destinationip", "dstip", "destinationipaddress", "dstaddr", "destinationaddress", "ipdst", "destination", "dst"]
    port_patterns = ["destinationport", "dstport", "destport", "dport", "destinationportnumber", "targetport"]
    src_port_patterns = ["sourceport", "srcport", "sport", "sourceportnumber"]
    proto_patterns = ["protocol", "proto", "protocolname", "ipproto", "transportprotocol"]
    time_patterns = ["timestamp", "time", "flowtimestamp", "datetime", "date"]

    src_col = next((norm_to_orig[p] for p in src_patterns if p in norm_to_orig), None)
    dst_col = next((norm_to_orig[p] for p in dst_patterns if p in norm_to_orig), None)
    port_col = next((norm_to_orig[p] for p in port_patterns if p in norm_to_orig), None)
    src_port_col = next((norm_to_orig[p] for p in src_port_patterns if p in norm_to_orig), None)
    proto_col = next((norm_to_orig[p] for p in proto_patterns if p in norm_to_orig), None)
    time_col = next((norm_to_orig[p] for p in time_patterns if p in norm_to_orig), None)

    col_mapping = {
        "source_ip": src_col,
        "dest_ip": dst_col,
        "dest_port": port_col,
        "src_port": src_port_col,
        "protocol": proto_col,
        "timestamp": time_col,
    }

    missing_fields = []
    if not src_col: missing_fields.append("Source IP")
    if not dst_col: missing_fields.append("Destination IP")
    if not proto_col: missing_fields.append("Protocol")

    has_full_metadata = (len(missing_fields) == 0)

    if has_full_metadata:
        diagnostic_message = (
            f"Network endpoint metadata detected: Source IP='{src_col}', "
            f"Destination IP='{dst_col}', Protocol='{proto_col}'."
        )
    else:
        missing_str = ", ".join(missing_fields)
        diagnostic_message = (
            f"Metadata notice: Column(s) [{missing_str}] not found in CSV header. "
            f"These fields will display as N/A in the dashboard. Standard CICIDS2017 flow headers expected: "
            f"'Source IP', 'Destination IP', 'Protocol'."
        )

    diagnostics = {
        "source_ip_column": src_col,
        "dest_ip_column": dst_col,
        "dest_port_column": port_col,
        "protocol_column": proto_col,
        "timestamp_column": time_col,
        "has_full_metadata": has_full_metadata,
        "missing_fields": missing_fields,
        "diagnostic_message": diagnostic_message,
    }

    return col_mapping, diagnostics


def _extract_ip_columns(df: pd.DataFrame, col_mapping: Dict[str, Optional[str]]) -> Dict[int, Dict[str, Any]]:
    """
    Extract original network metadata for each row in the chunk BEFORE dropping
    non-feature columns for ML prediction.
    Maintains strict 1-to-1 positional indexing with chunk rows.
    """
    results: Dict[int, Dict[str, Any]] = {}
    src_col = col_mapping.get("source_ip")
    dst_col = col_mapping.get("dest_ip")
    port_col = col_mapping.get("dest_port")
    proto_col = col_mapping.get("protocol")
    time_col = col_mapping.get("timestamp")

    has_src = src_col is not None and src_col in df.columns
    has_dst = dst_col is not None and dst_col in df.columns
    has_port = port_col is not None and port_col in df.columns
    has_proto = proto_col is not None and proto_col in df.columns
    has_time = time_col is not None and time_col in df.columns

    for i in range(len(df)):
        row = df.iloc[i]
        results[i] = {
            "source_ip": _clean_str(row[src_col]) if has_src else None,
            "dest_ip": _clean_str(row[dst_col]) if has_dst else None,
            "dest_port": _safe_int(row[port_col]) if has_port else None,
            "protocol": _format_protocol(row[proto_col]) if has_proto else None,
            "timestamp": _parse_timestamp(row[time_col]) if has_time else datetime.utcnow(),
        }

    return results


def _demo_predictions(chunk_df: pd.DataFrame) -> list:
    """Generate demo predictions when no real model is available."""
    import random
    demo_classes = [
        "BENIGN", "BENIGN", "BENIGN", "PortScan", "DDoS",
        "Bot", "Web Attack - Brute Force", "DoS Hulk", "BENIGN", "BENIGN"
    ]
    results = []
    for _ in range(len(chunk_df)):
        cls = random.choice(demo_classes)
        conf = round(random.uniform(0.75, 0.99), 4)
        results.append({"predicted_class": cls, "confidence": conf, "demo": True})
    return results


async def stream_scan(
    scan_id: str,
    csv_path: str,
    chunk_size: int = None,
) -> AsyncIterator[str]:
    """
    Generator that:
    1. Detects metadata columns from CSV headers
    2. Reads CICIDS2017 CSV in chunks
    3. Extracts & preserves original flow metadata
    4. Runs ML prediction using active CICIDS2017 model
    5. Computes risk score
    6. Persists TrafficRecord and Alert
    7. Streams SSE events
    """
    chunk_size = chunk_size or settings.CHUNK_SIZE
    predictor = get_active_predictor()
    if predictor is None:
        from app.ml.loader import ensure_active_model_loaded
        predictor = ensure_active_model_loaded()
    demo_mode = predictor is None

    def _sse(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    # Mark scan started in DB
    db = SessionLocal()
    try:
        scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
        if scan:
            scan.status = "RUNNING"
            scan.started_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()

    # Pre-inspect CSV header to identify metadata columns
    try:
        header_cols = pd.read_csv(csv_path, nrows=0).columns.tolist()
        col_mapping, metadata_diag = detect_metadata_columns(header_cols)
    except Exception as ex:
        logger.warning(f"Failed to inspect CSV header for {csv_path}: {ex}")
        col_mapping, metadata_diag = detect_metadata_columns([])

    logger.info(f"Scan {scan_id} metadata diagnostic: {metadata_diag['diagnostic_message']}")

    # Yield scan_started event with metadata diagnostics
    yield _sse("scan_started", {
        "scan_id": scan_id,
        "demo_mode": demo_mode,
        "timestamp": datetime.utcnow().isoformat(),
        "message": "DEMO MODE - No trained CICIDS2017 model." if demo_mode else "CICIDS2017 MODEL ACTIVE",
        "metadata_diagnostics": metadata_diag,
    })

    processed_rows = 0
    threats_detected = 0
    critical_alerts = 0
    start_time = time.time()
    last_heartbeat = time.time()

    try:
        # Count total rows for progress tracking
        try:
            total_rows = sum(1 for _ in open(csv_path, encoding="utf-8", errors="replace")) - 1
        except Exception:
            total_rows = None

        db = SessionLocal()
        try:
            scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
            if scan and total_rows:
                scan.total_rows = total_rows
                db.commit()
        finally:
            db.close()

        # Stream chunks
        for chunk_df in pd.read_csv(csv_path, chunksize=chunk_size, low_memory=False):
            if is_scan_stopped(scan_id):
                yield _sse("scan_error", {"message": "Scan stopped by user.", "scan_id": scan_id})
                break

            # Heartbeat check
            now = time.time()
            if now - last_heartbeat >= 20:
                yield _sse("heartbeat", {
                    "scan_id": scan_id,
                    "processed": processed_rows,
                    "threats": threats_detected,
                    "elapsed": round(now - start_time, 1),
                })
                last_heartbeat = now

            # Step 1: Preserve original metadata BEFORE preprocessing/dropping features
            ip_cols = _extract_ip_columns(chunk_df, col_mapping)

            # Step 2: Run predictions on the chunk
            if demo_mode:
                results = _demo_predictions(chunk_df)
            else:
                predictions = predictor.predict_chunk(chunk_df)
                if not predictions:
                    processed_rows += len(chunk_df)
                    continue
                results = predictions

            # Step 3: Process each row with 1-to-1 metadata alignment
            db = SessionLocal()
            try:
                for i, pred in enumerate(results):
                    if is_scan_stopped(scan_id):
                        break

                    predicted_class = pred.get("predicted_class", "UNKNOWN")
                    confidence = pred.get("confidence", 0.0)

                    risk_result = compute_risk_score(predicted_class, confidence)
                    risk_score = risk_result["final_risk"]
                    risk_level = risk_result["risk_level"]
                    is_malicious = predicted_class.upper() != "BENIGN"

                    # Get aligned metadata from raw chunk row
                    row_ip = ip_cols.get(i, {})
                    src_ip = row_ip.get("source_ip")
                    dst_ip = row_ip.get("dest_ip")
                    dst_port = row_ip.get("dest_port")
                    protocol = row_ip.get("protocol")
                    row_ts = row_ip.get("timestamp") or datetime.utcnow()

                    # Persist traffic record
                    traffic_record = TrafficRecord(
                        scan_job_id=scan_id,
                        timestamp=row_ts,
                        source_ip=src_ip,
                        destination_ip=dst_ip,
                        destination_port=dst_port,
                        protocol=protocol,
                        predicted_class=predicted_class,
                        confidence=confidence,
                        risk_score=risk_score,
                        risk_level=risk_level,
                        is_malicious=is_malicious,
                    )
                    db.add(traffic_record)
                    db.flush()

                    # Create alert if needed
                    alert_id = None
                    if should_create_alert(risk_score, predicted_class):
                        alert = create_alert(
                            db=db,
                            scan_job_id=scan_id,
                            traffic_record_id=traffic_record.id,
                            source_ip=src_ip,
                            destination_ip=dst_ip,
                            destination_port=dst_port,
                            protocol=protocol,
                            attack_type=predicted_class,
                            confidence=confidence,
                            base_risk_score=risk_score,
                            risk_level=risk_level,
                        )
                        alert_id = alert.id
                        threats_detected += 1
                        if risk_level == "Critical":
                            critical_alerts += 1

                        yield _sse("alert_created", {
                            "alert_id": alert_id,
                            "source_ip": src_ip or "N/A",
                            "attack_type": predicted_class,
                            "risk_score": alert.risk_score,
                            "risk_level": alert.risk_level,
                            "escalated": alert.escalated,
                        })

                    processed_rows += 1

                    # Yield traffic result event with real mapped metadata
                    yield _sse("traffic_result", {
                        "id": traffic_record.id,
                        "timestamp": traffic_record.timestamp.isoformat(),
                        "source_ip": src_ip or "N/A",
                        "destination_ip": dst_ip or "N/A",
                        "destination_port": dst_port,
                        "protocol": protocol or "N/A",
                        "predicted_class": predicted_class,
                        "confidence": round(confidence, 4),
                        "risk_score": risk_score,
                        "risk_level": risk_level,
                        "is_malicious": is_malicious,
                        "alert_id": alert_id,
                        "demo_mode": demo_mode,
                    })

                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Error persisting chunk: {e}", exc_info=True)
            finally:
                db.close()

            # Emit progress update event
            elapsed = time.time() - start_time
            rate = processed_rows / elapsed if elapsed > 0 else 0
            progress_pct = round((processed_rows / total_rows * 100), 1) if total_rows else 0

            yield _sse("scan_progress", {
                "scan_id": scan_id,
                "processed_rows": processed_rows,
                "total_rows": total_rows,
                "threats_detected": threats_detected,
                "critical_alerts": critical_alerts,
                "processing_rate": round(rate, 1),
                "elapsed_seconds": round(elapsed, 1),
                "progress": progress_pct,
            })

            # Small async yield to allow other coroutines
            await asyncio.sleep(0)

        # Update final scan status
        db = SessionLocal()
        try:
            scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
            if scan:
                final_status = "STOPPED" if is_scan_stopped(scan_id) else "COMPLETED"
                scan.status = final_status
                scan.processed_rows = processed_rows
                scan.threats_detected = threats_detected
                scan.critical_alerts = critical_alerts
                scan.completed_at = datetime.utcnow()
                elapsed = time.time() - start_time
                scan.processing_rate = processed_rows / elapsed if elapsed > 0 else 0
                db.commit()
        finally:
            db.close()

        clear_scan_flag(scan_id)

        yield _sse("scan_completed", {
            "scan_id": scan_id,
            "processed_rows": processed_rows,
            "threats_detected": threats_detected,
            "critical_alerts": critical_alerts,
            "total_rows": total_rows,
            "elapsed_seconds": round(time.time() - start_time, 1),
            "metadata_diagnostics": metadata_diag,
        })

    except Exception as e:
        logger.error(f"Scan error: {e}", exc_info=True)
        db = SessionLocal()
        try:
            scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
            if scan:
                scan.status = "FAILED"
                scan.error_message = str(e)
                db.commit()
        finally:
            db.close()

        yield _sse("scan_error", {
            "scan_id": scan_id,
            "error": str(e),
        })
