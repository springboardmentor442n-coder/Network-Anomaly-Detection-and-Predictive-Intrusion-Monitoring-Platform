from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.auth import get_current_user
from backend.app.core.database import get_db
from backend.app.models.alert import Alert
from backend.app.models.incident import Incident
from backend.app.models.user import User


router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"],
)


def serialize_datetime(value):
    if not value:
        return None

    if isinstance(value, datetime):
        return value.isoformat()

    return str(value)


@router.get("")
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    logs = []

    # =========================================================
    # USER MANAGEMENT EVENTS
    # =========================================================

    users = (
        db.query(User)
        .order_by(User.user_id.desc())
        .all()
    )

    for user in users:
        logs.append(
            {
                "timestamp": None,
                "user": user.username,
                "action": "USER_ACCOUNT",
                "module": "User Management",
                "severity": "INFO",
                "description": (
                    f"User account '{user.username}' "
                    f"is configured with role {user.role}."
                ),
            }
        )

    # =========================================================
    # ALERT EVENTS
    # =========================================================

    alerts = (
        db.query(Alert)
        .order_by(Alert.created_at.desc())
        .limit(150)
        .all()
    )

    for alert in alerts:
        risk_level = (
            alert.risk_level or "LOW"
        ).upper()

        if risk_level == "CRITICAL":
            severity = "CRITICAL"
        elif risk_level == "HIGH":
            severity = "HIGH"
        elif risk_level == "MEDIUM":
            severity = "MEDIUM"
        else:
            severity = "LOW"

        attack_type = (
            alert.attack_type or "UNKNOWN"
        )

        status = (
            alert.status or "OPEN"
        )

        logs.append(
            {
                "timestamp": serialize_datetime(
                    alert.created_at
                ),
                "user": current_user["username"],
                "action": "ALERT_CREATED",
                "module": "Alert Management",
                "severity": severity,
                "description": (
                    f"Alert #{alert.alert_id} "
                    f"detected as {attack_type} "
                    f"with risk score "
                    f"{float(alert.risk_score or 0):.1f}/100. "
                    f"Current status: {status}."
                ),
            }
        )

        if status != "OPEN":
            logs.append(
                {
                    "timestamp": serialize_datetime(
                        alert.created_at
                    ),
                    "user": current_user["username"],
                    "action": "ALERT_STATUS",
                    "module": "Alert Management",
                    "severity": "INFO",
                    "description": (
                        f"Alert #{alert.alert_id} "
                        f"has status {status}."
                    ),
                }
            )

    # =========================================================
    # INCIDENT EVENTS
    # =========================================================

    incidents = (
        db.query(Incident)
        .order_by(Incident.updated_at.desc())
        .limit(150)
        .all()
    )

    for incident in incidents:
        severity = (
            incident.severity or "MEDIUM"
        ).upper()

        status = (
            incident.status or "OPEN"
        ).upper()

        logs.append(
            {
                "timestamp": serialize_datetime(
                    incident.updated_at
                    or incident.created_at
                ),
                "user": (
                    incident.assigned_to
                    or current_user["username"]
                ),
                "action": "INCIDENT_UPDATE",
                "module": "Incident Management",
                "severity": severity,
                "description": (
                    f"Incident #{incident.incident_id} "
                    f"'{incident.title}' "
                    f"is currently {status}."
                ),
            }
        )

    # =========================================================
    # AUDIT LOG ACCESS EVENT
    # =========================================================

    logs.append(
        {
            "timestamp": datetime.utcnow().isoformat()
            + "Z",
            "user": current_user["username"],
            "action": "AUDIT_VIEW",
            "module": "Audit Logs",
            "severity": "INFO",
            "description": (
                "Audit log accessed successfully."
            ),
        }
    )

    # =========================================================
    # SORT LOGS BY LATEST TIMESTAMP
    # =========================================================

    def sort_key(item):
        timestamp = item.get("timestamp")

        if not timestamp:
            return ""

        return timestamp

    logs.sort(
        key=sort_key,
        reverse=True,
    )

    # =========================================================
    # RESPONSE
    # =========================================================

    return {
        "logs": logs[:300],
        "total_logs": min(
            len(logs),
            300,
        ),
        "generated_for": current_user["username"],
    }