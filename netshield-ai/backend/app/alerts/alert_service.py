"""
NETSHIELD AI - Alert Service
Handles alert creation, escalation, and management.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.database.models import Alert, TrafficRecord
from app.risk.scorer import apply_escalation_bonus
from app.core.config import settings

logger = logging.getLogger(__name__)

# Minimum risk score to create an alert
ALERT_THRESHOLD_RISK = 25  # Low and above


def should_create_alert(risk_score: int, predicted_class: str) -> bool:
    """Determine if a prediction warrants an alert."""
    if predicted_class.upper() == "BENIGN":
        return False
    return risk_score >= ALERT_THRESHOLD_RISK


def check_and_apply_escalation(
    db: Session,
    source_ip: str,
    base_risk_score: int,
) -> tuple[int, bool]:
    """
    Check if source IP has >= N alerts in the last M minutes.
    If so, apply escalation bonus.
    Returns (final_risk_score, escalated).
    """
    if not source_ip:
        return base_risk_score, False

    window_start = datetime.utcnow() - timedelta(
        minutes=settings.ALERT_ESCALATION_WINDOW_MINUTES
    )

    recent_count = (
        db.query(Alert)
        .filter(
            Alert.source_ip == source_ip,
            Alert.created_at >= window_start,
        )
        .count()
    )

    if recent_count >= settings.ALERT_ESCALATION_COUNT:
        escalated_score = apply_escalation_bonus(base_risk_score, settings.ALERT_ESCALATION_BONUS)
        logger.info(
            f"Escalation triggered for {source_ip}: {recent_count} alerts in window. "
            f"Score {base_risk_score} → {escalated_score}"
        )
        return escalated_score, True

    return base_risk_score, False


def create_alert(
    db: Session,
    scan_job_id: Optional[str],
    traffic_record_id: Optional[str],
    source_ip: Optional[str],
    destination_ip: Optional[str],
    destination_port: Optional[int],
    protocol: Optional[str],
    attack_type: str,
    confidence: float,
    base_risk_score: int,
    risk_level: str,
) -> Alert:
    """Create and persist an alert."""

    # Check for escalation
    final_risk, escalated = check_and_apply_escalation(db, source_ip, base_risk_score)
    from app.risk.scorer import get_risk_label
    final_risk_level = get_risk_label(final_risk)

    alert = Alert(
        scan_job_id=scan_job_id,
        traffic_record_id=traffic_record_id,
        timestamp=datetime.utcnow(),
        source_ip=source_ip,
        destination_ip=destination_ip,
        destination_port=destination_port,
        protocol=protocol,
        attack_type=attack_type,
        confidence=confidence,
        base_risk_score=base_risk_score,
        risk_score=final_risk,
        risk_level=final_risk_level,
        status="NEW",
        escalated=escalated,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert
