from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.core.auth import get_current_user
from backend.app.core.database import get_db
from backend.app.models.alert import Alert
from backend.app.models.incident import Incident


router = APIRouter(
    prefix="/incidents",
    tags=["Incidents"],
)


ALLOWED_SEVERITIES = {
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
}

ALLOWED_STATUSES = {
    "OPEN",
    "INVESTIGATING",
    "RESOLVED",
    "CLOSED",
}


class IncidentCreateRequest(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=200,
    )

    severity: str = "MEDIUM"

    description: str | None = None

    alert_id: int | None = None

    risk_score: float | None = None

    source: str | None = None

    destination: str | None = None

    attack_type: str | None = None

    assigned_to: str | None = None

    investigation_notes: str | None = None


class IncidentUpdateRequest(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    severity: str | None = None

    status: str | None = None

    description: str | None = None

    assigned_to: str | None = None

    investigation_notes: str | None = None


class IncidentNoteRequest(BaseModel):
    note: str = Field(
        min_length=1,
        max_length=5000,
    )


class IncidentResponse(BaseModel):
    incident_id: int
    alert_id: int | None
    title: str
    attack_type: str
    severity: str
    status: str
    risk_score: float
    source: str | None
    destination: str | None
    description: str | None
    investigation_notes: str | None
    assigned_to: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def serialize_incident(
    incident: Incident,
) -> IncidentResponse:
    return IncidentResponse.model_validate(
        incident
    )


# ---------------------------------------------------------
# LIST INCIDENTS
# ---------------------------------------------------------

@router.get(
    "",
    response_model=list[IncidentResponse],
)
def list_incidents(
    severity: str | None = None,
    incident_status: str | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        get_current_user
    ),
):
    query = db.query(Incident)

    if severity:
        severity = severity.upper()

        if severity not in ALLOWED_SEVERITIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid severity.",
            )

        query = query.filter(
            Incident.severity == severity
        )

    if incident_status:
        incident_status = incident_status.upper()

        if incident_status not in ALLOWED_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid incident status.",
            )

        query = query.filter(
            Incident.status == incident_status
        )

    incidents = (
        query
        .order_by(Incident.incident_id.desc())
        .all()
    )

    return [
        serialize_incident(item)
        for item in incidents
    ]


# ---------------------------------------------------------
# GET SINGLE INCIDENT
# ---------------------------------------------------------

@router.get(
    "/{incident_id}",
    response_model=IncidentResponse,
)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        get_current_user
    ),
):
    incident = (
        db.query(Incident)
        .filter(
            Incident.incident_id == incident_id
        )
        .first()
    )

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    return serialize_incident(
        incident
    )


# ---------------------------------------------------------
# CREATE INCIDENT
# ---------------------------------------------------------

@router.post(
    "",
    response_model=IncidentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_incident(
    request: IncidentCreateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        get_current_user
    ),
):
    severity = request.severity.upper()

    if severity not in ALLOWED_SEVERITIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Severity must be LOW, MEDIUM, "
                "HIGH, or CRITICAL."
            ),
        )

    alert = None

    if request.alert_id is not None:
        alert = (
            db.query(Alert)
            .filter(
                Alert.alert_id == request.alert_id
            )
            .first()
        )

        if alert is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found.",
            )

    incident = Incident(
        alert_id=request.alert_id,

        title=request.title.strip(),

        attack_type=(
            request.attack_type
            or (
                alert.attack_type
                if alert
                else "UNKNOWN"
            )
        ),

        severity=severity,

        status="OPEN",

        risk_score=(
            float(request.risk_score)
            if request.risk_score is not None
            else (
                float(alert.risk_score)
                if alert
                and alert.risk_score is not None
                else 0.0
            )
        ),

        source=(
            request.source
            or (
                alert.source
                if alert
                else None
            )
        ),

        destination=(
            request.destination
            or (
                alert.destination
                if alert
                else None
            )
        ),

        description=(
            request.description
            or (
                f"Incident created from alert "
                f"#{alert.alert_id}."
                if alert
                else None
            )
        ),

        investigation_notes=(
            request.investigation_notes
        ),

        assigned_to=(
            request.assigned_to
        ),
    )

    db.add(incident)
    db.commit()
    db.refresh(incident)

    return serialize_incident(
        incident
    )


# ---------------------------------------------------------
# CREATE INCIDENT FROM ALERT
# ---------------------------------------------------------

@router.post(
    "/from-alert/{alert_id}",
    response_model=IncidentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_incident_from_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        get_current_user
    ),
):
    alert = (
        db.query(Alert)
        .filter(
            Alert.alert_id == alert_id
        )
        .first()
    )

    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found.",
        )

    severity = (
        alert.risk_level
        or "MEDIUM"
    ).upper()

    if severity not in ALLOWED_SEVERITIES:
        severity = "MEDIUM"

    incident = Incident(
        alert_id=alert.alert_id,

        title=(
            f"Investigation: "
            f"{alert.attack_type}"
        ),

        attack_type=alert.attack_type,

        severity=severity,

        status="OPEN",

        risk_score=float(
            alert.risk_score or 0.0
        ),

        source=alert.source,

        destination=alert.destination,

        description=(
            "Incident automatically created "
            f"from alert #{alert.alert_id}."
        ),

        assigned_to=None,
    )

    db.add(incident)
    db.commit()
    db.refresh(incident)

    return serialize_incident(
        incident
    )


# ---------------------------------------------------------
# UPDATE INCIDENT
# ---------------------------------------------------------

@router.patch(
    "/{incident_id}",
    response_model=IncidentResponse,
)
def update_incident(
    incident_id: int,
    request: IncidentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        get_current_user
    ),
):
    incident = (
        db.query(Incident)
        .filter(
            Incident.incident_id == incident_id
        )
        .first()
    )

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    updates = request.model_dump(
        exclude_unset=True
    )

    if (
        "severity" in updates
        and updates["severity"] is not None
    ):
        updates["severity"] = (
            updates["severity"].upper()
        )

        if (
            updates["severity"]
            not in ALLOWED_SEVERITIES
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid severity.",
            )

    if (
        "status" in updates
        and updates["status"] is not None
    ):
        updates["status"] = (
            updates["status"].upper()
        )

        if (
            updates["status"]
            not in ALLOWED_STATUSES
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid incident status.",
            )

    for field, value in updates.items():
        setattr(
            incident,
            field,
            value,
        )

    incident.updated_at = datetime.now(
        timezone.utc
    )

    db.commit()
    db.refresh(incident)

    return serialize_incident(
        incident
    )


# ---------------------------------------------------------
# ADD INVESTIGATION NOTE
# ---------------------------------------------------------

@router.post(
    "/{incident_id}/notes",
    response_model=IncidentResponse,
)
def add_incident_note(
    incident_id: int,
    request: IncidentNoteRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        get_current_user
    ),
):
    incident = (
        db.query(Incident)
        .filter(
            Incident.incident_id == incident_id
        )
        .first()
    )

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    timestamp = datetime.now(
        timezone.utc
    ).strftime(
        "%Y-%m-%d %H:%M UTC"
    )

    author = current_user.get(
        "username",
        "unknown",
    )

    new_note = (
        f"[{timestamp}] "
        f"{author}: "
        f"{request.note.strip()}"
    )

    if incident.investigation_notes:
        incident.investigation_notes += (
            "\n" + new_note
        )
    else:
        incident.investigation_notes = new_note

    incident.updated_at = datetime.now(
        timezone.utc
    )

    db.commit()
    db.refresh(incident)

    return serialize_incident(
        incident
    )