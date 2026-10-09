from collections import Counter
from datetime import datetime
from io import StringIO

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.app.core.auth import get_current_user
from backend.app.core.database import get_db
from backend.app.models.alert import Alert
from backend.app.models.incident import Incident


router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
)


def serialize_datetime(value):
    if not value:
        return None

    if isinstance(value, datetime):
        return value.isoformat()

    return str(value)


@router.get("/overview")
def get_reports_overview(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    alerts = (
        db.query(Alert)
        .order_by(Alert.created_at.desc())
        .all()
    )

    incidents = (
        db.query(Incident)
        .order_by(Incident.created_at.desc())
        .all()
    )

    total_alerts = len(alerts)

    high_alerts = sum(
        1
        for alert in alerts
        if (alert.risk_level or "").upper()
        in {"HIGH", "CRITICAL"}
    )

    critical_alerts = sum(
        1
        for alert in alerts
        if (alert.risk_level or "").upper()
        == "CRITICAL"
    )

    open_alerts = sum(
        1
        for alert in alerts
        if (alert.status or "").upper() == "OPEN"
    )

    acknowledged_alerts = sum(
        1
        for alert in alerts
        if (alert.status or "").upper()
        == "ACKNOWLEDGED"
    )

    resolved_alerts = sum(
        1
        for alert in alerts
        if (alert.status or "").upper()
        == "RESOLVED"
    )

    total_incidents = len(incidents)

    open_incidents = sum(
        1
        for incident in incidents
        if (incident.status or "").upper() == "OPEN"
    )

    investigating_incidents = sum(
        1
        for incident in incidents
        if (incident.status or "").upper()
        == "INVESTIGATING"
    )

    resolved_incidents = sum(
        1
        for incident in incidents
        if (incident.status or "").upper()
        == "RESOLVED"
    )

    closed_incidents = sum(
        1
        for incident in incidents
        if (incident.status or "").upper()
        == "CLOSED"
    )

    total_risk = sum(
        float(alert.risk_score or 0)
        for alert in alerts
    )

    average_risk_score = (
        total_risk / total_alerts
        if total_alerts
        else 0
    )

    maximum_risk_score = max(
        (
            float(alert.risk_score or 0)
            for alert in alerts
        ),
        default=0,
    )

    attack_type_counter = Counter(
        (
            alert.attack_type or "UNKNOWN"
        )
        for alert in alerts
    )

    risk_level_counter = Counter(
        (
            alert.risk_level or "UNKNOWN"
        ).upper()
        for alert in alerts
    )

    source_counter = Counter(
        alert.source or "UNKNOWN"
        for alert in alerts
    )

    destination_counter = Counter(
        alert.destination or "UNKNOWN"
        for alert in alerts
    )

    recent_critical_alerts = []

    for alert in alerts:
        if (
            (alert.risk_level or "").upper()
            == "CRITICAL"
        ):
            recent_critical_alerts.append(
                {
                    "alert_id": alert.alert_id,
                    "attack_type": (
                        alert.attack_type
                        or "UNKNOWN"
                    ),
                    "risk_score": float(
                        alert.risk_score or 0
                    ),
                    "risk_level": (
                        alert.risk_level
                        or "UNKNOWN"
                    ),
                    "status": (
                        alert.status
                        or "OPEN"
                    ),
                    "source": alert.source,
                    "destination": alert.destination,
                    "created_at": serialize_datetime(
                        alert.created_at
                    ),
                }
            )

        if len(recent_critical_alerts) >= 10:
            break

    recent_incidents = []

    for incident in incidents[:10]:
        recent_incidents.append(
            {
                "incident_id": (
                    incident.incident_id
                ),
                "title": incident.title,
                "attack_type": (
                    incident.attack_type
                    or "UNKNOWN"
                ),
                "severity": (
                    incident.severity
                    or "MEDIUM"
                ),
                "status": (
                    incident.status
                    or "OPEN"
                ),
                "risk_score": float(
                    incident.risk_score or 0
                ),
                "source": incident.source,
                "destination": incident.destination,
                "created_at": serialize_datetime(
                    incident.created_at
                ),
                "updated_at": serialize_datetime(
                    incident.updated_at
                ),
            }
        )

    return {
        "report_generated_at": datetime.utcnow().isoformat()
        + "Z",
        "generated_for": current_user["username"],
        "summary": {
            "total_alerts": total_alerts,
            "high_alerts": high_alerts,
            "critical_alerts": critical_alerts,
            "open_alerts": open_alerts,
            "acknowledged_alerts": acknowledged_alerts,
            "resolved_alerts": resolved_alerts,
            "total_incidents": total_incidents,
            "open_incidents": open_incidents,
            "investigating_incidents": (
                investigating_incidents
            ),
            "resolved_incidents": (
                resolved_incidents
            ),
            "closed_incidents": (
                closed_incidents
            ),
            "average_risk_score": round(
                average_risk_score,
                2,
            ),
            "maximum_risk_score": round(
                maximum_risk_score,
                2,
            ),
        },
        "risk_distribution": dict(
            risk_level_counter
        ),
        "attack_type_distribution": dict(
            attack_type_counter
        ),
        "top_sources": [
            {
                "source": source,
                "count": count,
            }
            for source, count
            in source_counter.most_common(10)
        ],
        "top_destinations": [
            {
                "destination": destination,
                "count": count,
            }
            for destination, count
            in destination_counter.most_common(
                10
            )
        ],
        "recent_critical_alerts": (
            recent_critical_alerts
        ),
        "recent_incidents": recent_incidents,
    }


@router.get("/alerts.csv")
def export_alerts_csv(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    alerts = (
        db.query(Alert)
        .order_by(Alert.created_at.desc())
        .all()
    )

    output = StringIO()

    output.write(
        "alert_id,prediction,attack_probability,"
        "attack_type,attack_type_confidence,anomaly,"
        "risk_score,risk_level,source,destination,"
        "status,created_at\n"
    )

    for alert in alerts:
        values = [
            alert.alert_id,
            alert.prediction,
            alert.attack_probability,
            alert.attack_type,
            alert.attack_type_confidence,
            alert.anomaly,
            alert.risk_score,
            alert.risk_level,
            alert.source,
            alert.destination,
            alert.status,
            serialize_datetime(
                alert.created_at
            ),
        ]

        escaped_values = []

        for value in values:
            if value is None:
                text_value = ""
            else:
                text_value = str(value)

            text_value = (
                text_value
                .replace('"', '""')
            )

            escaped_values.append(
                f'"{text_value}"'
            )

        output.write(
            ",".join(
                escaped_values
            )
            + "\n"
        )

    output.seek(0)

    filename = (
        "netshield_alerts_report.csv"
    )

    headers = {
        "Content-Disposition":
            f'attachment; filename="{filename}"'
    }

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers=headers,
    )