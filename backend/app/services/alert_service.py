"""
Alert Management Service - handles alert creation, updates, and queries.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from ..models import Alert, Detection
from ..core.errors import NotFoundError, ValidationError

logger = logging.getLogger(__name__)


class AlertService:
    """Manages alert lifecycle and operations."""

    VALID_STATUSES = {"NEW", "ACKNOWLEDGED", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"}
    VALID_SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}

    @staticmethod
    def create_alert_from_detection(
        db: Session,
        detection_id: int,
        detection: Detection,
        source_ip: Optional[str] = None,
        destination_ip: Optional[str] = None,
    ) -> Alert:
        """
        Create an alert from a detection.

        Args:
            db: Database session
            detection_id: ID of the detection
            detection: Detection object
            source_ip: Source IP (optional)
            destination_ip: Destination IP (optional)

        Returns:
            Created Alert object
        """
        alert = Alert(
            detection_id=detection_id,
            severity=detection.severity,
            status="NEW",
            source_ip=source_ip,
            destination_ip=destination_ip,
            attack_type=detection.prediction,
            risk_score=detection.risk_score,
            description=f"Detected {detection.prediction} with risk score {detection.risk_score}",
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

        logger.info(
            f"Created alert {alert.id} for detection {detection_id} "
            f"with severity {alert.severity}"
        )

        return alert

    @staticmethod
    def get_alert(db: Session, alert_id: int) -> Alert:
        """Get alert by ID."""
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            raise NotFoundError("Alert", alert_id)
        return alert

    @staticmethod
    def list_alerts(
        db: Session,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[int, List[Alert]]:
        """
        List alerts with optional filtering.

        Args:
            db: Database session
            status: Filter by status
            severity: Filter by severity
            limit: Maximum results to return
            offset: Offset for pagination

        Returns:
            Tuple of (total_count, alerts_list)
        """
        query = db.query(Alert)

        if status:
            if status not in AlertService.VALID_STATUSES:
                raise ValidationError(f"Invalid status: {status}", field="status")
            query = query.filter(Alert.status == status)

        if severity:
            if severity not in AlertService.VALID_SEVERITIES:
                raise ValidationError(f"Invalid severity: {severity}", field="severity")
            query = query.filter(Alert.severity == severity)

        total = query.count()
        alerts = query.order_by(desc(Alert.created_at)).offset(offset).limit(limit).all()

        return total, alerts

    @staticmethod
    def update_alert_status(
        db: Session,
        alert_id: int,
        new_status: str,
        user_email: str,
        notes: Optional[str] = None,
    ) -> Alert:
        """
        Update alert status.

        Args:
            db: Database session
            alert_id: Alert ID
            new_status: New status
            user_email: Email of user making the change
            notes: Optional notes

        Returns:
            Updated Alert object
        """
        if new_status not in AlertService.VALID_STATUSES:
            raise ValidationError(f"Invalid status: {new_status}", field="status")

        alert = AlertService.get_alert(db, alert_id)

        old_status = alert.status
        alert.status = new_status

        if notes:
            alert.notes = notes

        if new_status == "ACKNOWLEDGED":
            alert.acknowledged_at = datetime.now(timezone.utc)
            alert.acknowledged_by = user_email
        elif new_status == "RESOLVED":
            alert.resolved_at = datetime.now(timezone.utc)
            alert.resolved_by = user_email

        db.commit()
        db.refresh(alert)

        logger.info(
            f"Alert {alert_id} status changed from {old_status} to {new_status} by {user_email}"
        )

        return alert

    @staticmethod
    def acknowledge_alert(db: Session, alert_id: int, user_email: str) -> Alert:
        """Acknowledge an alert."""
        return AlertService.update_alert_status(
            db, alert_id, "ACKNOWLEDGED", user_email
        )

    @staticmethod
    def resolve_alert(
        db: Session, alert_id: int, user_email: str, notes: Optional[str] = None
    ) -> Alert:
        """Resolve an alert."""
        return AlertService.update_alert_status(
            db, alert_id, "RESOLVED", user_email, notes
        )

    @staticmethod
    def mark_false_positive(
        db: Session, alert_id: int, user_email: str, notes: Optional[str] = None
    ) -> Alert:
        """Mark alert as false positive."""
        return AlertService.update_alert_status(
            db, alert_id, "FALSE_POSITIVE", user_email, notes
        )

    @staticmethod
    def get_alert_stats(db: Session) -> Dict[str, Any]:
        """Get alert statistics."""
        total_alerts = db.query(Alert).count()
        new_alerts = db.query(Alert).filter(Alert.status == "NEW").count()
        critical_alerts = db.query(Alert).filter(Alert.severity == "CRITICAL").count()
        high_alerts = db.query(Alert).filter(Alert.severity == "HIGH").count()

        return {
            "total_alerts": total_alerts,
            "new_alerts": new_alerts,
            "critical_alerts": critical_alerts,
            "high_alerts": high_alerts,
        }
