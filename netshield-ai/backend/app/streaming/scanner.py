"""
NETSHIELD AI - SSE Streaming Scanner
Processes CICIDS2017 CSV chunk by chunk and streams results via SSE.
"""
import asyncio
import json
import logging
import time
from datetime import datetime
from typing import AsyncIterator, Optional
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


def stop_scan(scan_id: str):
    _scan_stop_flags[scan_id] = True


def is_scan_stopped(scan_id: str) -> bool:
    return _scan_stop_flags.get(scan_id, False)


def clear_scan_flag(scan_id: str):
    _scan_stop_flags.pop(scan_id, None)


async def stream_scan(
    scan_id: str,
    csv_path: str,
    chunk_size: int = None,
) -> AsyncIterator[str]:
    """
    Generator that:
    1. Reads CICIDS2017 CSV in chunks
    2. Preprocesses each chunk
    3. Runs ML prediction
    4. Computes risk score
    5. Persists results
    6. Yields SSE events
    """
    chunk_size = chunk_size or settings.CHUNK_SIZE
    predictor = get_active_predictor()
    if predictor is None:
        from app.ml.loader import ensure_active_model_loaded
        predictor = ensure_active_model_loaded()
    demo_mode = predictor is None

    def _sse(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    # Mark scan started
    db = SessionLocal()
    try:
        scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
        if scan:
            scan.status = "RUNNING"
            scan.started_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()

    yield _sse("scan_started", {
        "scan_id": scan_id,
        "demo_mode": demo_mode,
        "timestamp": datetime.utcnow().isoformat(),
        "message": "DEMO MODE - No trained CICIDS2017 model." if demo_mode else "CICIDS2017 MODEL ACTIVE",
    })

    processed_rows = 0
    threats_detected = 0
    critical_alerts = 0
    start_time = time.time()
    last_heartbeat = time.time()

    try:
        # Count total rows for progress
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

            # Heartbeat
            now = time.time()
            if now - last_heartbeat >= 20:
                yield _sse("heartbeat", {
                    "scan_id": scan_id,
                    "processed": processed_rows,
                    "threats": threats_detected,
                    "elapsed": round(now - start_time, 1),
                })
                last_heartbeat = now

            # Get metadata columns before preprocessing
            ip_cols = _extract_ip_columns(chunk_df)

            # Run predictions
            if demo_mode:
                results = _demo_predictions(chunk_df)
            else:
                predictions = predictor.predict_chunk(chunk_df)
                if not predictions:
                    processed_rows += len(chunk_df)
                    continue
                results = predictions

            # Process each row
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

                    # Get IP from raw chunk row
                    row_ip = ip_cols.get(i, {})
                    src_ip = row_ip.get("source_ip")
                    dst_ip = row_ip.get("dest_ip")
                    dst_port = row_ip.get("dest_port")
                    protocol = row_ip.get("protocol")

                    # Persist traffic record
                    traffic_record = TrafficRecord(
                        scan_job_id=scan_id,
                        timestamp=datetime.utcnow(),
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
                            "source_ip": src_ip,
                            "attack_type": predicted_class,
                            "risk_score": alert.risk_score,
                            "risk_level": alert.risk_level,
                            "escalated": alert.escalated,
                        })

                    processed_rows += 1

                    # Yield traffic result
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

                # Update scan progress
                elapsed = time.time() - start_time
                rate = processed_rows / elapsed if elapsed > 0 else 0
                progress = (processed_rows / total_rows * 100) if total_rows else 0

                yield _sse("scan_progress", {
                    "scan_id": scan_id,
                    "processed_rows": processed_rows,
                    "total_rows": total_rows,
                    "threats_detected": threats_detected,
                    "critical_alerts": critical_alerts,
                    "processing_rate": round(rate, 1),
                    "elapsed_seconds": round(elapsed, 1),
                    "progress": round(progress, 1),
                })

            finally:
                db.close()

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


def _extract_ip_columns(df: pd.DataFrame) -> dict:
    """Extract IP/port/protocol info from raw dataframe chunk."""
    # Normalize column names
    col_map = {c.strip().lower(): c for c in df.columns}
    results = {}

    src_col = col_map.get("source ip") or col_map.get("src ip") or col_map.get("source_ip")
    dst_col = col_map.get("destination ip") or col_map.get("dst ip") or col_map.get("destination_ip")
    port_col = col_map.get("destination port") or col_map.get("dst port") or col_map.get("destination_port")
    proto_col = col_map.get("protocol") or col_map.get("proto")

    for i in range(len(df)):
        row = df.iloc[i]
        results[i] = {
            "source_ip": str(row[src_col]) if src_col and src_col in df.columns else None,
            "dest_ip": str(row[dst_col]) if dst_col and dst_col in df.columns else None,
            "dest_port": int(row[port_col]) if port_col and port_col in df.columns else None,
            "protocol": str(row[proto_col]) if proto_col and proto_col in df.columns else None,
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
