"""
Analytics & Metrics API Routes.

Backs the SOC dashboard. Corpus figures come from the CICIDS2017 CSVs; all
operational figures come from SQL aggregates over this platform's own tables.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..core.config import settings
from ..database import get_db
from ..ml.risk import policy as risk_policy
from ..models import User
from ..services import AnalyticsService, MLService
from .dependencies import current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

_analytics_service = AnalyticsService(settings.data_root)
_ml_service = MLService(settings.model_root)


@router.get("/traffic")
def get_traffic_analytics(
    user: User = Depends(current_user),
    refresh: bool = Query(False, description="Bypass the analytics cache"),
):
    """Corpus-level traffic analytics (chunk-streamed, cached)."""
    analytics = _analytics_service.get_traffic_analytics(use_cache=not refresh)
    analytics["model_ready"] = _ml_service.is_ready()
    return analytics


@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    hours: int = Query(24, ge=1, le=720),
):
    """Everything the SOC overview page needs, in one call."""
    return _analytics_service.get_dashboard_overview(db, hours=hours)


@router.get("/security-metrics")
def get_security_metrics(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    hours: int = Query(24, ge=1, le=720),
):
    """Overview counters: traffic, attacks, high-risk, critical alerts, incidents."""
    return _analytics_service.get_security_metrics(db, hours=hours)


@router.get("/attack-trends")
def get_attack_trends(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    hours: int = Query(24, ge=1, le=720),
):
    """Hourly detection counts bucketed by severity."""
    return {"trends": _analytics_service.get_attack_trends(db, hours=hours)}


@router.get("/severity-distribution")
def get_severity_distribution(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Detection counts per severity band."""
    return {"severity_distribution": _analytics_service.get_severity_distribution(db)}


@router.get("/top-attacks")
def get_top_attacks(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    limit: int = Query(10, ge=1, le=50),
):
    """Most frequent non-benign classifications produced by this platform."""
    return {
        "top_attacks": [
            {"attack_type": name, "count": count}
            for name, count in _analytics_service.get_top_attacks(db, limit=limit)
        ]
    }


@router.get("/top-ips")
def get_top_ips(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    limit: int = Query(10, ge=1, le=50),
):
    """
    Most active source and destination IPs observed by this platform.

    Empty until monitoring or prediction has recorded IP-bearing events; corpus
    IP counts are reported separately by /api/analytics/traffic.
    """
    return {
        "top_source_ips": _analytics_service.get_top_source_ips(db, limit=limit),
        "top_destination_ips": _analytics_service.get_top_destination_ips(db, limit=limit),
    }


@router.get("/detections-by-type")
def get_detections_by_type(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Detection counts grouped by predicted class."""
    return {"detection_stats": _analytics_service.get_detection_stats_by_type(db)}


@router.get("/recent-detections")
def get_recent_detections(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    limit: int = Query(20, ge=1, le=200),
):
    """Most recent detections."""
    return {"detections": _analytics_service.get_recent_detections(db, limit=limit)}


@router.get("/model-metrics")
def get_model_metrics(user: User = Depends(current_user)):
    """
    Model performance as recorded at training time.

    Values are read from models/metadata.json - the numbers produced by the
    actual evaluation run, never hardcoded.
    """
    metadata = _ml_service.get_model_info()
    if metadata.get("status") == "not_trained":
        return {
            "status": "not_trained",
            "message": "Run 'python -m backend.scripts.train_models' to train models.",
        }

    metrics = metadata.get("metrics", {}) or {}
    return {
        "status": "trained",
        "model_version": metadata.get("model_version"),
        "dataset": metadata.get("dataset"),
        "trained_at": metadata.get("trained_at"),
        "sample_rows": metadata.get("sample_rows"),
        "classes": metadata.get("classes", []),
        "feature_count": len(metadata.get("features", []) or []),
        "accuracy": metrics.get("accuracy"),
        "precision_macro": metrics.get("precision_macro"),
        "recall_macro": metrics.get("recall_macro"),
        "f1_macro": metrics.get("f1_macro"),
        "f1_weighted": metrics.get("f1_weighted"),
        "confusion_matrix": metrics.get("confusion_matrix"),
        "classification_report": metrics.get("classification_report"),
    }


@router.get("/risk-policy")
def get_risk_policy(user: User = Depends(current_user)):
    """The exact weights and thresholds used to compute risk scores."""
    return risk_policy()
