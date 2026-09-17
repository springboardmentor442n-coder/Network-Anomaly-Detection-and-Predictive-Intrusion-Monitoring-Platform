"""
Analytics Service.

Two data domains:

* **Corpus analytics** - streamed from the CICIDS2017 CSVs in chunks (never
  loaded whole) and cached for ``NETSHIELD_ANALYTICS_CACHE_SECONDS`` so the
  dashboard does not re-scan gigabytes on every refresh.
* **Operational analytics** - aggregated in SQL over detections, alerts and
  incidents produced by this platform.

Every number returned here comes from a file on disk or a row in the database.
Nothing is sampled up, estimated or synthesised.
"""

from __future__ import annotations

import logging
import threading
import time
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.config import settings
from ..ml.data_loader import (
    discover_dataset_files,
    find_label_column,
    iter_dataset_chunks,
)
from ..models import Alert, Detection, Incident, TrafficRecord

logger = logging.getLogger(__name__)

BENIGN_LABELS = {"benign", "normal"}

# IANA protocol numbers that appear in the CICIDS2017 "Protocol" column.
PROTOCOL_NAMES = {"6": "TCP", "17": "UDP", "1": "ICMP", "0": "HOPOPT", "58": "ICMPv6"}


def protocol_label(value: Any) -> str:
    text = str(value).strip()
    if text.endswith(".0"):
        text = text[:-2]
    return PROTOCOL_NAMES.get(text, text or "UNKNOWN")


class _TtlCache:
    """Tiny thread-safe TTL cache so repeated dashboard loads stay cheap."""

    def __init__(self) -> None:
        self._store: Dict[str, Tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str, ttl: int) -> Optional[Any]:
        if ttl <= 0:
            return None
        with self._lock:
            entry = self._store.get(key)
            if not entry:
                return None
            stored_at, value = entry
            if time.monotonic() - stored_at > ttl:
                self._store.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._store[key] = (time.monotonic(), value)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


class AnalyticsService:
    _cache = _TtlCache()

    def __init__(self, data_root: Path):
        self.data_root = Path(data_root)

    @classmethod
    def clear_cache(cls) -> None:
        cls._cache.clear()

    # ------------------------------------------------------ corpus analytics --
    def get_traffic_analytics(
        self, sample_limit: Optional[int] = None, use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Stream the local corpus in chunks and aggregate label/protocol/IP counts.

        ``total_records_sampled`` is the exact number of rows read - it is
        deliberately not extrapolated to the full corpus size.
        """
        limit = sample_limit or settings.analytics_sample_limit
        cache_key = f"traffic:{self.data_root}:{limit}"

        if use_cache:
            cached = self._cache.get(cache_key, settings.analytics_cache_seconds)
            if cached is not None:
                return {**cached, "cached": True}

        files = discover_dataset_files(self.data_root)
        if not files:
            return {
                "dataset": "cicids2017",
                "status": "not_found",
                "message": (
                    f"No CICIDS2017 CSV files found under {self.data_root}. "
                    "See data/README.md for placement instructions."
                ),
                "total_records_sampled": 0,
                "normal_records": 0,
                "anomalous_records": 0,
                "attack_distribution": [],
                "protocol_distribution": [],
                "top_sources": [],
                "top_destinations": [],
                "cached": False,
            }

        labels: Counter = Counter()
        protocols: Counter = Counter()
        sources: Counter = Counter()
        destinations: Counter = Counter()
        total = 0

        try:
            for chunk in iter_dataset_chunks(files, settings.analytics_chunk_size):
                label_column = find_label_column(chunk.columns.tolist())
                labels.update(chunk[label_column].astype(str).str.strip())

                protocol_column = next(
                    (col for col in chunk.columns if col.casefold() == "protocol"), None
                )
                if protocol_column:
                    protocols.update(
                        chunk[protocol_column].map(protocol_label).astype(str)
                    )

                for column in ("Src IP", "Source IP"):
                    if column in chunk.columns:
                        sources.update(chunk[column].astype(str))
                        break
                for column in ("Dst IP", "Destination IP"):
                    if column in chunk.columns:
                        destinations.update(chunk[column].astype(str))
                        break

                total += len(chunk)
                if total >= limit:
                    break
        except Exception as exc:  # noqa: BLE001 - a corrupt CSV must not 500 the dashboard
            logger.error("Traffic analytics failed: %s", exc)
            return {
                "dataset": "cicids2017",
                "status": "error",
                "message": str(exc),
                "total_records_sampled": total,
                "normal_records": 0,
                "anomalous_records": 0,
                "attack_distribution": [],
                "protocol_distribution": [],
                "top_sources": [],
                "top_destinations": [],
                "cached": False,
            }

        normal = sum(
            count for label, count in labels.items() if label.casefold() in BENIGN_LABELS
        )

        result = {
            "dataset": "cicids2017",
            "status": "ready",
            "file_count": len(files),
            "total_records_sampled": total,
            "sample_limit": limit,
            "normal_records": normal,
            "anomalous_records": total - normal,
            "distinct_labels": len(labels),
            "attack_distribution": labels.most_common(12),
            "protocol_distribution": protocols.most_common(12),
            "top_sources": sources.most_common(8),
            "top_destinations": destinations.most_common(8),
        }
        self._cache.set(cache_key, result)
        return {**result, "cached": False}

    # ------------------------------------------------- operational analytics --
    def get_security_metrics(self, db: Session, hours: int = 24) -> Dict[str, Any]:
        """Overview tiles for the SOC dashboard, all from SQL aggregates."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        total_traffic = db.query(func.count(Detection.id)).scalar() or 0
        benign_traffic = (
            db.query(func.count(Detection.id))
            .filter(func.lower(Detection.prediction).in_(list(BENIGN_LABELS)))
            .scalar()
            or 0
        )
        anomalous_traffic = (
            db.query(func.count(Detection.id))
            .filter(Detection.is_anomaly.is_(True))
            .scalar()
            or 0
        )
        high_risk = (
            db.query(func.count(Detection.id)).filter(Detection.risk_score >= 65).scalar()
            or 0
        )
        critical_alerts = (
            db.query(func.count(Alert.id)).filter(Alert.severity == "CRITICAL").scalar() or 0
        )
        open_incidents = (
            db.query(func.count(Incident.id))
            .filter(Incident.status.in_(["OPEN", "INVESTIGATING"]))
            .scalar()
            or 0
        )
        recent = (
            db.query(func.count(Detection.id))
            .filter(Detection.created_at >= cutoff)
            .scalar()
            or 0
        )

        return {
            "total_traffic": total_traffic,
            "benign_traffic": benign_traffic,
            "anomalous_traffic": anomalous_traffic,
            "total_attacks": total_traffic - benign_traffic,
            "high_risk_detections": high_risk,
            "critical_alerts": critical_alerts,
            "open_incidents": open_incidents,
            "recent_detections": recent,
            "window_hours": hours,
        }

    def get_severity_distribution(self, db: Session) -> Dict[str, int]:
        rows = (
            db.query(Detection.severity, func.count(Detection.id))
            .group_by(Detection.severity)
            .all()
        )
        distribution = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        for severity, count in rows:
            distribution[str(severity)] = count
        return distribution

    def get_alert_status_distribution(self, db: Session) -> Dict[str, int]:
        rows = db.query(Alert.status, func.count(Alert.id)).group_by(Alert.status).all()
        return {str(status): count for status, count in rows}

    def get_attack_trends(
        self, db: Session, hours: int = 24
    ) -> List[Dict[str, Any]]:
        """Hourly detection counts bucketed by severity, over the last N hours."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        rows = (
            db.query(Detection.created_at, Detection.severity, Detection.is_anomaly)
            .filter(Detection.created_at >= cutoff)
            .order_by(Detection.created_at)
            .all()
        )

        buckets: Dict[str, Dict[str, Any]] = {}
        for created_at, severity, is_anomaly in rows:
            if created_at is None:
                continue
            bucket_time = created_at.replace(minute=0, second=0, microsecond=0)
            key = bucket_time.isoformat()
            bucket = buckets.setdefault(
                key,
                {
                    "timestamp": key,
                    "total": 0,
                    "anomalies": 0,
                    "LOW": 0,
                    "MEDIUM": 0,
                    "HIGH": 0,
                    "CRITICAL": 0,
                },
            )
            bucket["total"] += 1
            if is_anomaly:
                bucket["anomalies"] += 1
            if severity in bucket:
                bucket[severity] += 1

        return [buckets[key] for key in sorted(buckets)]

    def get_top_attacks(self, db: Session, limit: int = 10) -> List[Tuple[str, int]]:
        rows = (
            db.query(Detection.prediction, func.count(Detection.id).label("count"))
            .filter(~func.lower(Detection.prediction).in_(list(BENIGN_LABELS)))
            .group_by(Detection.prediction)
            .order_by(func.count(Detection.id).desc())
            .limit(limit)
            .all()
        )
        return [(str(prediction), count) for prediction, count in rows]

    def get_top_source_ips(self, db: Session, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Most active source IPs observed by this platform.

        Sourced from alerts (which carry IPs) and traffic records written by the
        monitoring scan. Returns an empty list until monitoring has run - it does
        not fall back to corpus data, because the two are different populations.
        """
        alert_rows = (
            db.query(
                Alert.source_ip,
                func.count(Alert.id).label("alerts"),
                func.max(Alert.risk_score).label("max_risk"),
            )
            .filter(Alert.source_ip.isnot(None))
            .group_by(Alert.source_ip)
            .order_by(func.count(Alert.id).desc())
            .limit(limit)
            .all()
        )
        if alert_rows:
            return [
                {"ip": ip, "count": count, "max_risk_score": max_risk}
                for ip, count, max_risk in alert_rows
            ]

        traffic_rows = (
            db.query(TrafficRecord.source_ip, func.count(TrafficRecord.id))
            .filter(TrafficRecord.source_ip.isnot(None))
            .group_by(TrafficRecord.source_ip)
            .order_by(func.count(TrafficRecord.id).desc())
            .limit(limit)
            .all()
        )
        return [{"ip": ip, "count": count, "max_risk_score": None} for ip, count in traffic_rows]

    def get_top_destination_ips(self, db: Session, limit: int = 10) -> List[Dict[str, Any]]:
        alert_rows = (
            db.query(Alert.destination_ip, func.count(Alert.id))
            .filter(Alert.destination_ip.isnot(None))
            .group_by(Alert.destination_ip)
            .order_by(func.count(Alert.id).desc())
            .limit(limit)
            .all()
        )
        if alert_rows:
            return [{"ip": ip, "count": count} for ip, count in alert_rows]

        traffic_rows = (
            db.query(TrafficRecord.destination_ip, func.count(TrafficRecord.id))
            .filter(TrafficRecord.destination_ip.isnot(None))
            .group_by(TrafficRecord.destination_ip)
            .order_by(func.count(TrafficRecord.id).desc())
            .limit(limit)
            .all()
        )
        return [{"ip": ip, "count": count} for ip, count in traffic_rows]

    def get_detection_stats_by_type(self, db: Session) -> Dict[str, int]:
        rows = (
            db.query(Detection.prediction, func.count(Detection.id))
            .group_by(Detection.prediction)
            .all()
        )
        return {str(prediction): count for prediction, count in rows}

    def get_recent_detections(
        self, db: Session, limit: int = 20
    ) -> List[Dict[str, Any]]:
        rows = (
            db.query(Detection)
            .order_by(Detection.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": row.id,
                "prediction": row.prediction,
                "confidence": row.confidence,
                "risk_score": row.risk_score,
                "severity": row.severity,
                "is_anomaly": row.is_anomaly,
                "created_at": row.created_at,
            }
            for row in rows
        ]

    # ------------------------------------------------------------- overview ---
    def get_dashboard_overview(self, db: Session, hours: int = 24) -> Dict[str, Any]:
        """Single call that backs the whole SOC overview page."""
        return {
            "metrics": self.get_security_metrics(db, hours=hours),
            "severity_distribution": self.get_severity_distribution(db),
            "alert_status_distribution": self.get_alert_status_distribution(db),
            "attack_trends": self.get_attack_trends(db, hours=hours),
            "top_attacks": [
                {"attack_type": name, "count": count}
                for name, count in self.get_top_attacks(db)
            ],
            "top_source_ips": self.get_top_source_ips(db),
            "top_destination_ips": self.get_top_destination_ips(db),
            "recent_detections": self.get_recent_detections(db, limit=10),
        }
