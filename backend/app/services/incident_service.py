"""
Incident Management Service - handles incident creation, updates, and queries.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..models import Incident, IncidentNote, IncidentAlert, Alert
from ..core.errors import NotFoundError, ValidationError

logger = logging.getLogger(__name__)


class IncidentService:
    """Manages incident lifecycle and operations."""

    VALID_STATUSES = {"OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"}
    VALID_SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}

    @staticmethod
    def create_incident(
        db: Session,
        title: str,
        severity: str,
        description: Optional[str] = None,
        priority: int = 5,
        assigned_analyst: Optional[str] = None,
    ) -> Incident:
        """
        Create a new incident.

        Args:
            db: Database session
            title: Incident title
            severity: Incident severity (LOW, MEDIUM, HIGH, CRITICAL)
            description: Incident description
            priority: Priority (1=highest, 10=lowest)
            assigned_analyst: Assigned analyst email

        Returns:
            Created Incident object
        """
        if severity not in IncidentService.VALID_SEVERITIES:
            raise ValidationError(f"Invalid severity: {severity}", field="severity")

        if not 1 <= priority <= 10:
            raise ValidationError("Priority must be between 1 and 10", field="priority")

        incident = Incident(
            title=title,
            description=description,
            severity=severity,
            status="OPEN",
            priority=priority,
            assigned_analyst=assigned_analyst,
        )

        db.add(incident)
        db.commit()
        db.refresh(incident)

        logger.info(
            f"Created incident {incident.id}: {title} with severity {severity}"
        )

        return incident

    @staticmethod
    def get_incident(db: Session, incident_id: int) -> Incident:
        """Get incident by ID."""
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise NotFoundError("Incident", incident_id)
        return incident

    @staticmethod
    def list_incidents(
        db: Session,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        assigned_analyst: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[int, List[Incident]]:
        """
        List incidents with optional filtering.

        Args:
            db: Database session
            status: Filter by status
            severity: Filter by severity
            assigned_analyst: Filter by assigned analyst
            limit: Maximum results
            offset: Offset for pagination

        Returns:
            Tuple of (total_count, incidents_list)
        """
        query = db.query(Incident)

        if status:
            if status not in IncidentService.VALID_STATUSES:
                raise ValidationError(f"Invalid status: {status}", field="status")
            query = query.filter(Incident.status == status)

        if severity:
            if severity not in IncidentService.VALID_SEVERITIES:
                raise ValidationError(f"Invalid severity: {severity}", field="severity")
            query = query.filter(Incident.severity == severity)

        if assigned_analyst:
            query = query.filter(Incident.assigned_analyst == assigned_analyst)

        total = query.count()
        incidents = (
            query.order_by(desc(Incident.created_at))
            .offset(offset)
            .limit(limit)
            .all()
        )

        return total, incidents

    @staticmethod
    def update_incident(
        db: Session,
        incident_id: int,
        **kwargs
    ) -> Incident:
        """
        Update incident fields.

        Args:
            db: Database session
            incident_id: Incident ID
            **kwargs: Fields to update

        Returns:
            Updated Incident object
        """
        incident = IncidentService.get_incident(db, incident_id)

        # Validate status if provided
        if "status" in kwargs:
            if kwargs["status"] not in IncidentService.VALID_STATUSES:
                raise ValidationError(f"Invalid status: {kwargs['status']}", field="status")

        # Validate severity if provided
        if "severity" in kwargs:
            if kwargs["severity"] not in IncidentService.VALID_SEVERITIES:
                raise ValidationError(f"Invalid severity: {kwargs['severity']}", field="severity")

        # Validate priority if provided
        if "priority" in kwargs:
            if not 1 <= kwargs["priority"] <= 10:
                raise ValidationError("Priority must be between 1 and 10", field="priority")

        # Handle status change
        if "status" in kwargs and kwargs["status"] == "CLOSED":
            incident.closed_at = datetime.now(timezone.utc)

        # Update fields
        for key, value in kwargs.items():
            if hasattr(incident, key) and value is not None:
                setattr(incident, key, value)

        incident.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(incident)

        logger.info(f"Updated incident {incident_id}")

        return incident

    @staticmethod
    def add_note(
        db: Session,
        incident_id: int,
        author: str,
        note: str,
    ) -> IncidentNote:
        """
        Add a note to an incident.

        Args:
            db: Database session
            incident_id: Incident ID
            author: Author email
            note: Note text

        Returns:
            Created IncidentNote object
        """
        # Verify incident exists
        IncidentService.get_incident(db, incident_id)

        incident_note = IncidentNote(
            incident_id=incident_id,
            author=author,
            note=note,
        )

        db.add(incident_note)
        db.commit()
        db.refresh(incident_note)

        logger.info(f"Added note to incident {incident_id}")

        return incident_note

    @staticmethod
    def get_incident_notes(db: Session, incident_id: int) -> List[IncidentNote]:
        """Get all notes for an incident."""
        # Verify incident exists
        IncidentService.get_incident(db, incident_id)

        return (
            db.query(IncidentNote)
            .filter(IncidentNote.incident_id == incident_id)
            .order_by(desc(IncidentNote.created_at))
            .all()
        )

    @staticmethod
    def link_alert(
        db: Session,
        incident_id: int,
        alert_id: int,
    ) -> IncidentAlert:
        """
        Link an alert to an incident.

        Args:
            db: Database session
            incident_id: Incident ID
            alert_id: Alert ID

        Returns:
            Created IncidentAlert object
        """
        # Verify both exist
        IncidentService.get_incident(db, incident_id)

        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            raise NotFoundError("Alert", alert_id)

        # Check if already linked
        existing = (
            db.query(IncidentAlert)
            .filter(
                (IncidentAlert.incident_id == incident_id)
                & (IncidentAlert.alert_id == alert_id)
            )
            .first()
        )
        if existing:
            return existing

        incident_alert = IncidentAlert(
            incident_id=incident_id,
            alert_id=alert_id,
        )

        db.add(incident_alert)
        db.commit()
        db.refresh(incident_alert)

        logger.info(f"Linked alert {alert_id} to incident {incident_id}")

        return incident_alert

    @staticmethod
    def get_incident_stats(db: Session) -> Dict[str, Any]:
        """Get incident statistics."""
        total_incidents = db.query(Incident).count()
        open_incidents = db.query(Incident).filter(
            Incident.status == "OPEN"
        ).count()
        critical_incidents = db.query(Incident).filter(
            Incident.severity == "CRITICAL"
        ).count()

        return {
            "total_incidents": total_incidents,
            "open_incidents": open_incidents,
            "critical_incidents": critical_incidents,
        }
