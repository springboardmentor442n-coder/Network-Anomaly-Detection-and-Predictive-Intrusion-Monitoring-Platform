"""
Alert Management API Routes.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import AlertResponse, AlertUpdateRequest, AlertListResponse
from ..services import AlertService
from ..core.errors import NotFoundError, ValidationError
from .dependencies import current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=AlertListResponse)
def list_alerts(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List alerts with optional filtering."""
    try:
        total, alerts = AlertService.list_alerts(
            db, status=status, severity=severity, limit=limit, offset=offset
        )
        return AlertListResponse(
            total=total,
            alerts=[AlertResponse.model_validate(alert) for alert in alerts],
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Get a specific alert."""
    try:
        alert = AlertService.get_alert(db, alert_id)
        return AlertResponse.model_validate(alert)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.patch("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: int,
    request: AlertUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Update an alert (acknowledge, resolve, etc.)."""
    try:
        alert = AlertService.update_alert_status(
            db,
            alert_id,
            request.status,
            user.email,
            notes=request.notes,
        )
        return AlertResponse.model_validate(alert)
    except (NotFoundError, ValidationError) as e:
        raise HTTPException(
            status_code=404 if isinstance(e, NotFoundError) else 400,
            detail=e.message,
        )


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Acknowledge an alert."""
    try:
        alert = AlertService.acknowledge_alert(db, alert_id, user.email)
        return AlertResponse.model_validate(alert)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Resolve an alert."""
    try:
        alert = AlertService.resolve_alert(db, alert_id, user.email)
        return AlertResponse.model_validate(alert)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.post("/{alert_id}/false-positive", response_model=AlertResponse)
def mark_false_positive(
    alert_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Mark an alert as false positive."""
    try:
        alert = AlertService.mark_false_positive(db, alert_id, user.email)
        return AlertResponse.model_validate(alert)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
