from collections import Counter

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models, schemas
from app.dependencies import require_role, get_current_user
from app.models import RoleEnum

router = APIRouter(prefix="/traffic", tags=["Network Monitoring"])


@router.get("/", response_model=list[schemas.TrafficRecordOut])
def list_traffic(
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),  # any logged-in role can view
    limit: int = Query(100, le=1000),
    only_anomalous: bool = False,
):
    q = db.query(models.TrafficRecord)
    if only_anomalous:
        q = q.filter(models.TrafficRecord.is_anomalous == True)  # noqa: E712
    return q.order_by(models.TrafficRecord.timestamp.desc()).limit(limit).all()


@router.get("/stats", response_model=schemas.TrafficStats)
def traffic_stats(
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    """Powers the 'Traffic analytics dashboard' required for Milestone 1."""
    total = db.query(func.count(models.TrafficRecord.id)).scalar() or 0
    anomalous = (
        db.query(func.count(models.TrafficRecord.id))
        .filter(models.TrafficRecord.is_anomalous == True)  # noqa: E712
        .scalar()
        or 0
    )
    protocols = db.query(models.TrafficRecord.protocol).all()
    protocol_counts = dict(Counter([p[0] for p in protocols if p[0]]))
    avg_risk = db.query(func.avg(models.TrafficRecord.risk_score)).scalar() or 0.0

    return schemas.TrafficStats(
        total_flows=total,
        anomalous_flows=anomalous,
        benign_flows=total - anomalous,
        top_protocols=protocol_counts,
        avg_risk_score=round(float(avg_risk), 2),
    )


@router.post("/ingest")
def ingest_record(
    record: dict,
    db: Session = Depends(get_db),
    _analyst: models.User = Depends(require_role(RoleEnum.admin, RoleEnum.soc_analyst)),
):
    """Simple ingestion endpoint — later this gets called by the packet
    capture / dataset-loading pipeline for each processed flow."""
    row = models.TrafficRecord(**{k: v for k, v in record.items() if hasattr(models.TrafficRecord, k)})
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "status": "ingested"}
