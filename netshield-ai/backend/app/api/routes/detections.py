"""Detections routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database.session import get_db
from app.database.models import TrafficRecord, Alert, User
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/summary")
async def get_detections_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total = db.query(TrafficRecord).filter(TrafficRecord.is_malicious == True).count()
    by_class = (
        db.query(TrafficRecord.predicted_class, func.count(TrafficRecord.id).label("count"))
        .filter(TrafficRecord.is_malicious == True)
        .group_by(TrafficRecord.predicted_class)
        .order_by(func.count(TrafficRecord.id).desc())
        .all()
    )
    avg_confidence = db.query(func.avg(TrafficRecord.confidence)).filter(
        TrafficRecord.is_malicious == True
    ).scalar() or 0.0

    return {
        "total_detections": total,
        "avg_confidence": round(float(avg_confidence), 4),
        "by_attack_class": [{"attack_type": r[0], "count": r[1]} for r in by_class],
    }


@router.get("/timeline")
async def get_detection_timeline(
    hours: int = 24,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime, timedelta
    since = datetime.utcnow() - timedelta(hours=hours)
    records = (
        db.query(TrafficRecord)
        .filter(TrafficRecord.is_malicious == True, TrafficRecord.created_at >= since)
        .all()
    )

    buckets = {}
    for r in records:
        hour_key = r.created_at.strftime("%Y-%m-%dT%H:00:00")
        if hour_key not in buckets:
            buckets[hour_key] = {"time": hour_key, "count": 0}
        buckets[hour_key]["count"] += 1

    return sorted(buckets.values(), key=lambda x: x["time"])
