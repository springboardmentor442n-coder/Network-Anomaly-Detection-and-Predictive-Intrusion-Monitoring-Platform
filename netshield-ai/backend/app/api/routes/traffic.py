"""Traffic records routes."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.database.models import TrafficRecord, User
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/")
async def list_traffic(
    skip: int = 0, limit: int = 100,
    source_ip: Optional[str] = None,
    predicted_class: Optional[str] = None,
    is_malicious: Optional[bool] = None,
    scan_job_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(TrafficRecord)
    if source_ip:
        query = query.filter(TrafficRecord.source_ip == source_ip)
    if predicted_class:
        query = query.filter(TrafficRecord.predicted_class == predicted_class)
    if is_malicious is not None:
        query = query.filter(TrafficRecord.is_malicious == is_malicious)
    if scan_job_id:
        query = query.filter(TrafficRecord.scan_job_id == scan_job_id)

    total = query.count()
    records = query.order_by(desc(TrafficRecord.created_at)).offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "source_ip": r.source_ip,
                "destination_ip": r.destination_ip,
                "destination_port": r.destination_port,
                "protocol": r.protocol,
                "predicted_class": r.predicted_class,
                "confidence": round(r.confidence, 4) if r.confidence else None,
                "risk_score": r.risk_score,
                "risk_level": r.risk_level,
                "is_malicious": r.is_malicious,
                "scan_job_id": r.scan_job_id,
            }
            for r in records
        ],
    }
