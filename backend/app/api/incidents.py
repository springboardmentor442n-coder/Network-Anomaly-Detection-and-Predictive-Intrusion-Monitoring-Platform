"""
Incident Management API Routes.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import (
    IncidentResponse,
    IncidentDetailResponse,
    IncidentCreateRequest,
    IncidentUpdateRequest,
    IncidentAddNoteRequest,
    IncidentNoteResponse,
)
from ..services import IncidentService
from ..core.errors import NotFoundError, ValidationError
from .dependencies import current_user

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    request: IncidentCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Create a new incident."""
    try:
        incident = IncidentService.create_incident(
            db,
            title=request.title,
            severity=request.severity,
            description=request.description,
            priority=request.priority,
            assigned_analyst=request.assigned_analyst,
        )
        return IncidentResponse.model_validate(incident)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)


@router.get("", response_model=dict)
def list_incidents(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List incidents with optional filtering."""
    try:
        total, incidents = IncidentService.list_incidents(
            db,
            status=status_filter,
            severity=severity,
            limit=limit,
            offset=offset,
        )
        return {
            "total": total,
            "incidents": [
                IncidentResponse.model_validate(incident)
                for incident in incidents
            ],
        }
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)


@router.get("/{incident_id}", response_model=IncidentDetailResponse)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Get a specific incident with details."""
    try:
        incident = IncidentService.get_incident(db, incident_id)
        notes = IncidentService.get_incident_notes(db, incident_id)
        result = IncidentDetailResponse.model_validate(incident)
        result.notes = [
            IncidentNoteResponse.model_validate(note) for note in notes
        ]
        return result
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: int,
    request: IncidentUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Update an incident."""
    try:
        update_data = request.model_dump(exclude_unset=True)
        incident = IncidentService.update_incident(db, incident_id, **update_data)
        return IncidentResponse.model_validate(incident)
    except (NotFoundError, ValidationError) as e:
        raise HTTPException(
            status_code=404 if isinstance(e, NotFoundError) else 400,
            detail=e.message,
        )


@router.post("/{incident_id}/notes", response_model=IncidentNoteResponse)
def add_note(
    incident_id: int,
    request: IncidentAddNoteRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Add a note to an incident."""
    try:
        note = IncidentService.add_note(
            db,
            incident_id,
            user.email,
            request.note,
        )
        return IncidentNoteResponse.model_validate(note)
    except (NotFoundError, ValidationError) as e:
        raise HTTPException(
            status_code=404 if isinstance(e, NotFoundError) else 400,
            detail=e.message,
        )


@router.post("/{incident_id}/link-alert/{alert_id}")
def link_alert(
    incident_id: int,
    alert_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Link an alert to an incident."""
    try:
        IncidentService.link_alert(db, incident_id, alert_id)
        return {"status": "ok", "message": "Alert linked to incident"}
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
