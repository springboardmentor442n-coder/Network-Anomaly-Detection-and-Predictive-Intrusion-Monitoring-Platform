"""Alerts routes."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.database.models import Alert, User, AuditLog
from app.api.deps import get_current_user, require_operator, require_analyst

router = APIRouter()


class UpdateAlertRequest(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None


@router.get("/")
async def list_alerts(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    attack_type: Optional[str] = None,
    source_ip: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if risk_level:
        query = query.filter(Alert.risk_level == risk_level)
    if attack_type:
        query = query.filter(Alert.attack_type == attack_type)
    if source_ip:
        query = query.filter(Alert.source_ip == source_ip)

    total = query.count()
    alerts = query.order_by(desc(Alert.created_at)).offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": [_alert_dict(a) for a in alerts],
    }


@router.get("/{alert_id}")
async def get_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _alert_dict(alert)


@router.patch("/{alert_id}")
async def update_alert(
    alert_id: str,
    body: UpdateAlertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    valid_statuses = ["NEW", "ACKNOWLEDGED", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"]
    if body.status and body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}")

    if body.status:
        alert.status = body.status
    if body.assigned_to:
        alert.assigned_to = body.assigned_to
    if body.notes:
        alert.notes = body.notes

    db.commit()
    db.refresh(alert)

    # Audit log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="ALERT_UPDATED",
        resource_type="alert",
        resource_id=alert_id,
        result="SUCCESS",
        details={"status": body.status, "assigned_to": body.assigned_to},
    )
    db.add(log)
    db.commit()

    return _alert_dict(alert)


def _alert_dict(alert: Alert) -> dict:
    return {
        "id": alert.id,
        "timestamp": alert.timestamp.isoformat() if alert.timestamp else None,
        "source_ip": alert.source_ip,
        "destination_ip": alert.destination_ip,
        "destination_port": alert.destination_port,
        "protocol": alert.protocol,
        "attack_type": alert.attack_type,
        "confidence": round(alert.confidence, 4) if alert.confidence else None,
        "base_risk_score": alert.base_risk_score,
        "risk_score": alert.risk_score,
        "risk_level": alert.risk_level,
        "status": alert.status,
        "assigned_to": alert.assigned_to,
        "escalated": alert.escalated,
        "notes": alert.notes,
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
        "updated_at": alert.updated_at.isoformat() if alert.updated_at else None,
    }
