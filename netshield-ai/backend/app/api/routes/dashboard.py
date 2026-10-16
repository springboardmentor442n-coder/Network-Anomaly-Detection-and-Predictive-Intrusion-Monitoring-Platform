"""Dashboard routes - KPI metrics and summary data."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from app.database.session import get_db
from app.database.models import TrafficRecord, Alert, Incident, ScanJob, ModelRun
from app.api.deps import get_current_user
from app.database.models import User

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard KPI statistics."""
    total_traffic = db.query(TrafficRecord).count()
    malicious_traffic = db.query(TrafficRecord).filter(TrafficRecord.is_malicious == True).count()
    benign_traffic = total_traffic - malicious_traffic

    active_threats = db.query(Alert).filter(
        Alert.status.in_(["NEW", "INVESTIGATING"])
    ).count()

    critical_alerts = db.query(Alert).filter(
        Alert.risk_level == "Critical",
        Alert.status != "RESOLVED",
        Alert.status != "FALSE_POSITIVE",
    ).count()

    anomalies = db.query(Alert).filter(
        Alert.risk_level.in_(["High", "Critical"])
    ).count()

    avg_risk = db.query(func.avg(Alert.risk_score)).scalar() or 0.0

    # Detection rate
    detection_rate = (malicious_traffic / total_traffic * 100) if total_traffic > 0 else 0.0

    # Active model
    from app.ml.predictor import get_active_predictor
    predictor = get_active_predictor()
    active_model = db.query(ModelRun).filter(ModelRun.is_active == True).first()
    if not predictor or not active_model:
        from app.ml.loader import ensure_active_model_loaded
        ensure_active_model_loaded(db)
        active_model = db.query(ModelRun).filter(ModelRun.is_active == True).first()
        predictor = get_active_predictor()

    is_model_active = (active_model is not None) and (predictor is not None)

    # Metadata diagnostic stats
    records_with_src_ip = db.query(TrafficRecord).filter(
        and_(TrafficRecord.source_ip != None, TrafficRecord.source_ip != "N/A", TrafficRecord.source_ip != "nan")
    ).count()
    has_real_ips = records_with_src_ip > 0

    metadata_diag = {
        "has_real_endpoints": has_real_ips,
        "records_with_endpoint_metadata": records_with_src_ip,
        "status": "ACTIVE" if has_real_ips else "MISSING_IN_SOURCE_CSV",
        "message": (
            "Network endpoints (Source IP, Destination IP, Protocol) mapped and active."
            if has_real_ips else
            "Columns for Source IP, Destination IP, or Protocol were not found in scanned dataset. Fields will display as N/A until a dataset with standard CICIDS2017 flow headers is scanned."
        )
    }

    return {
        "total_traffic": total_traffic,
        "malicious_traffic": malicious_traffic,
        "benign_traffic": benign_traffic,
        "active_threats": active_threats,
        "critical_alerts": critical_alerts,
        "anomalies_detected": anomalies,
        "avg_risk_score": round(float(avg_risk), 1),
        "detection_rate": round(detection_rate, 1),
        "model_active": is_model_active,
        "model_name": active_model.name if (active_model and is_model_active) else None,
        "active_model_name": active_model.name if (active_model and is_model_active) else None,
        "demo_mode": not is_model_active,
        "metadata_diagnostics": metadata_diag,
    }


@router.get("/live-threats")
async def get_live_threats(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recent threat activity."""
    records = (
        db.query(TrafficRecord)
        .filter(TrafficRecord.is_malicious == True)
        .order_by(TrafficRecord.created_at.desc())
        .limit(limit)
        .all()
    )
    threat_list = []
    proto_map = {"6": "TCP", "17": "UDP", "1": "ICMP", "0": "HOPOPT"}
    for r in records:
        proto_raw = str(r.protocol).strip() if (r.protocol and r.protocol not in ("None", "nan", "")) else "N/A"
        proto_display = proto_map.get(proto_raw, proto_raw.upper()) if proto_raw != "N/A" else "N/A"

        threat_list.append({
            "id": r.id,
            "timestamp": r.timestamp.isoformat(),
            "source_ip": r.source_ip if (r.source_ip and r.source_ip not in ("None", "nan", "")) else "N/A",
            "destination_ip": r.destination_ip if (r.destination_ip and r.destination_ip not in ("None", "nan", "")) else "N/A",
            "destination_port": r.destination_port or "N/A",
            "protocol": proto_display,
            "predicted_attack": r.predicted_class,
            "confidence": round(r.confidence, 4) if r.confidence else None,
            "risk_score": r.risk_score,
            "risk_level": r.risk_level,
            "status": "ACTIVE",
        })
    return threat_list


@router.get("/attack-distribution")
async def get_attack_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get distribution of attack types."""
    results = (
        db.query(TrafficRecord.predicted_class, func.count(TrafficRecord.id).label("count"))
        .filter(TrafficRecord.predicted_class != None)
        .group_by(TrafficRecord.predicted_class)
        .order_by(func.count(TrafficRecord.id).desc())
        .all()
    )
    return [{"attack_type": r[0], "count": r[1]} for r in results]


@router.get("/traffic-over-time")
async def get_traffic_over_time(
    hours: int = 24,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get traffic volume over time (hourly buckets)."""
    since = datetime.utcnow() - timedelta(hours=hours)
    records = (
        db.query(TrafficRecord)
        .filter(TrafficRecord.created_at >= since)
        .all()
    )

    # Bucket by hour
    buckets = {}
    for r in records:
        hour_key = r.created_at.strftime("%Y-%m-%dT%H:00:00")
        if hour_key not in buckets:
            buckets[hour_key] = {"time": hour_key, "total": 0, "malicious": 0, "benign": 0}
        buckets[hour_key]["total"] += 1
        if r.is_malicious:
            buckets[hour_key]["malicious"] += 1
        else:
            buckets[hour_key]["benign"] += 1

    return sorted(buckets.values(), key=lambda x: x["time"])


@router.get("/system-health")
async def get_system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get system component health status."""
    # Check DB
    try:
        db.execute(func.now())
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    # Check active model
    active_model = db.query(ModelRun).filter(ModelRun.is_active == True).first()
    model_status = "active" if active_model else "no_model"

    # Check running scans
    running_scans = db.query(ScanJob).filter(ScanJob.status == "RUNNING").count()

    return {
        "backend": {"status": "healthy", "message": "FastAPI running"},
        "database": {"status": db_status, "message": "PostgreSQL connected"},
        "ml_model": {
            "status": model_status,
            "message": f"Model: {active_model.name}" if active_model else "No active model",
        },
        "streaming": {
            "status": "active" if running_scans > 0 else "idle",
            "message": f"{running_scans} active scan(s)",
        },
        "api": {"status": "healthy", "message": "All endpoints operational"},
    }


@router.get("/top-source-ips")
async def get_top_source_ips(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get top suspicious source IPs."""
    results = (
        db.query(
            Alert.source_ip,
            func.count(Alert.id).label("alert_count"),
            func.avg(Alert.risk_score).label("avg_risk"),
            func.max(Alert.risk_score).label("max_risk"),
        )
        .filter(and_(
            Alert.source_ip != None,
            Alert.source_ip != "N/A",
            Alert.source_ip != "nan",
            Alert.source_ip != "None",
            Alert.source_ip != "",
        ))
        .group_by(Alert.source_ip)
        .order_by(func.count(Alert.id).desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "source_ip": r[0],
            "alert_count": r[1],
            "avg_risk": round(float(r[2]), 1),
            "max_risk": r[3],
        }
        for r in results
    ]
