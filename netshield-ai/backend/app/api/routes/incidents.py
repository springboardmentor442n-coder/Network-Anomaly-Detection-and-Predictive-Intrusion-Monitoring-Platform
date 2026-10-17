"""Incidents routes."""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.database.models import Incident, Alert, User, AuditLog
from app.api.deps import get_current_user, require_analyst

router = APIRouter()


class CreateIncidentRequest(BaseModel):
    title: str
    description: Optional[str] = None
    severity: str = "MEDIUM"
    source_ip: Optional[str] = None
    attack_type: Optional[str] = None
    assigned_to: Optional[str] = None
    alert_ids: Optional[list] = None


class UpdateIncidentRequest(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None


@router.post("/")
async def create_incident(
    body: CreateIncidentRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    incident = Incident(
        title=body.title,
        description=body.description,
        severity=body.severity,
        source_ip=body.source_ip,
        attack_type=body.attack_type,
        assigned_to=body.assigned_to,
        status="OPEN",
        status_history=[{
            "status": "OPEN",
            "changed_by": current_user.username,
            "timestamp": datetime.utcnow().isoformat(),
        }],
    )
    db.add(incident)
    db.flush()

    # Link alerts
    if body.alert_ids:
        for alert_id in body.alert_ids:
            alert = db.query(Alert).filter(Alert.id == alert_id).first()
            if alert:
                alert.incident_id = incident.id

    db.commit()
    db.refresh(incident)

    # Audit
    client_ip = request.client.host if request.client else None
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="INCIDENT_CREATED",
        resource_type="incident",
        resource_id=incident.id,
        ip_address=client_ip,
        result="SUCCESS",
        details={"title": body.title},
    )
    db.add(log)
    db.commit()

    return _incident_dict(incident)


@router.get("/")
async def list_incidents(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)

    total = query.count()
    incidents = query.order_by(desc(Incident.created_at)).offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": [_incident_dict(i) for i in incidents],
    }


@router.get("/{incident_id}")
async def get_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    result = _incident_dict(incident)
    # Include related alerts
    result["alerts"] = [
        {
            "id": a.id,
            "attack_type": a.attack_type,
            "risk_score": a.risk_score,
            "risk_level": a.risk_level,
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
        }
        for a in incident.alerts
    ]
    return result


@router.patch("/{incident_id}")
async def update_incident(
    incident_id: str,
    body: UpdateIncidentRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if body.status:
        history = incident.status_history or []
        history.append({
            "status": body.status,
            "changed_by": current_user.username,
            "timestamp": datetime.utcnow().isoformat(),
        })
        incident.status = body.status
        incident.status_history = history

    if body.severity:
        incident.severity = body.severity
    if body.description:
        incident.description = body.description
    if body.notes:
        incident.notes = body.notes
    if body.assigned_to:
        incident.assigned_to = body.assigned_to

    incident.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(incident)

    client_ip = request.client.host if request.client else None
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="INCIDENT_UPDATED",
        resource_type="incident",
        resource_id=incident_id,
        ip_address=client_ip,
        result="SUCCESS",
        details={"status": body.status},
    )
    db.add(log)
    db.commit()

    return _incident_dict(incident)


def _incident_dict(incident: Incident) -> dict:
    return {
        "id": incident.id,
        "title": incident.title,
        "description": incident.description,
        "severity": incident.severity,
        "source_ip": incident.source_ip,
        "attack_type": incident.attack_type,
        "assigned_to": incident.assigned_to,
        "status": incident.status,
        "risk_score": incident.risk_score,
        "notes": incident.notes,
        "status_history": incident.status_history or [],
        "created_at": incident.created_at.isoformat() if incident.created_at else None,
        "updated_at": incident.updated_at.isoformat() if incident.updated_at else None,
    }
