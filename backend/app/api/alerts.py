from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.auth import get_current_user
from backend.app.core.database import get_db
from backend.app.models.alert import Alert
from backend.app.schemas.alert import AlertCreate, AlertResponse


router = APIRouter(
    prefix="/alerts",
    tags=["Alerts"],
)


@router.post(
    "",
    response_model=AlertResponse,
)
def create_alert(
    alert_data: AlertCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Create and store a security alert.
    """

    alert = Alert(
        prediction=alert_data.prediction,
        attack_probability=alert_data.attack_probability,
        attack_type=alert_data.attack_type,
        attack_type_confidence=alert_data.attack_type_confidence,
        anomaly=alert_data.anomaly,
        risk_score=alert_data.risk_score,
        risk_level=alert_data.risk_level,
        source=alert_data.source,
        destination=alert_data.destination,
        status="OPEN",
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)

    return AlertResponse(
        alert_id=alert.alert_id,
        prediction=alert.prediction,
        attack_probability=alert.attack_probability,
        attack_type=alert.attack_type,
        attack_type_confidence=alert.attack_type_confidence,
        anomaly=alert.anomaly,
        risk_score=alert.risk_score,
        risk_level=alert.risk_level,
        source=alert.source,
        destination=alert.destination,
        status=alert.status,
        message="Alert created successfully",
    )


@router.get("")
def get_alerts(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Return all security alerts.
    """

    alerts = (
        db.query(Alert)
        .order_by(Alert.alert_id.desc())
        .all()
    )

    return [
        {
            "alert_id": alert.alert_id,
            "prediction": alert.prediction,
            "attack_probability": alert.attack_probability,
            "attack_type": alert.attack_type,
            "attack_type_confidence": alert.attack_type_confidence,
            "anomaly": alert.anomaly,
            "risk_score": alert.risk_score,
            "risk_level": alert.risk_level,
            "source": alert.source,
            "destination": alert.destination,
            "status": alert.status,
            "created_at": alert.created_at,
        }
        for alert in alerts
    ]


@router.patch("/{alert_id}/status")
def update_alert_status(
    alert_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Update the status of an existing alert.
    """

    allowed_statuses = {
        "OPEN",
        "ACKNOWLEDGED",
        "RESOLVED",
    }

    new_status = new_status.upper()

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid status. "
                "Use OPEN, ACKNOWLEDGED, or RESOLVED."
            ),
        )

    alert = (
        db.query(Alert)
        .filter(Alert.alert_id == alert_id)
        .first()
    )

    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )

    alert.status = new_status

    db.commit()
    db.refresh(alert)

    return {
        "message": "Alert status updated successfully",
        "alert_id": alert.alert_id,
        "status": alert.status,
    }