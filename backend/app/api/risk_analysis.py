from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.auth import get_current_user
from backend.app.core.database import get_db
from backend.app.models.alert import Alert


router = APIRouter(
    prefix="/risk-analysis",
    tags=["Risk Analysis"],
)


@router.get("")
def get_risk_analysis(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    alerts = (
        db.query(Alert)
        .order_by(Alert.alert_id.desc())
        .all()
    )

    total_alerts = len(alerts)

    if total_alerts == 0:
        return {
            "total_alerts": 0,
            "average_risk_score": 0.0,
            "maximum_risk_score": 0.0,
            "current_risk_level": "LOW",
            "risk_distribution": {
                "LOW": 0,
                "MEDIUM": 0,
                "HIGH": 0,
                "CRITICAL": 0,
            },
            "attack_type_distribution": {},
            "top_sources": [],
            "top_destinations": [],
            "recent_high_risk_alerts": [],
        }

    risk_distribution = Counter()
    attack_type_distribution = Counter()
    source_distribution = Counter()
    destination_distribution = Counter()

    risk_scores = []

    for alert in alerts:
        risk_level = (
            alert.risk_level or "LOW"
        ).upper()

        risk_distribution[risk_level] += 1

        attack_type = (
            alert.attack_type or "UNKNOWN"
        )

        attack_type_distribution[
            attack_type
        ] += 1

        if alert.source:
            source_distribution[
                alert.source
            ] += 1

        if alert.destination:
            destination_distribution[
                alert.destination
            ] += 1

        if alert.risk_score is not None:
            risk_scores.append(
                float(alert.risk_score)
            )

    average_risk_score = (
        sum(risk_scores) / len(risk_scores)
        if risk_scores
        else 0.0
    )

    maximum_risk_score = (
        max(risk_scores)
        if risk_scores
        else 0.0
    )

    risk_priority = {
        "CRITICAL": 4,
        "HIGH": 3,
        "MEDIUM": 2,
        "LOW": 1,
    }

    current_risk_level = "LOW"

    if alerts:
        current_risk_level = max(
            (
                (
                    (
                        alert.risk_level
                        or "LOW"
                    ).upper(),
                    alert.risk_score
                    or 0,
                )
                for alert in alerts
            ),
            key=lambda item: (
                risk_priority.get(
                    item[0],
                    0,
                ),
                item[1],
            ),
        )[0]

    top_sources = [
        {
            "source": source,
            "count": count,
        }
        for source, count
        in source_distribution.most_common(10)
    ]

    top_destinations = [
        {
            "destination": destination,
            "count": count,
        }
        for destination, count
        in destination_distribution.most_common(10)
    ]

    recent_high_risk_alerts = []

    for alert in alerts:
        risk_level = (
            alert.risk_level or "LOW"
        ).upper()

        if risk_level in {
            "HIGH",
            "CRITICAL",
        }:
            recent_high_risk_alerts.append(
                {
                    "alert_id": alert.alert_id,
                    "attack_type": alert.attack_type,
                    "source": alert.source,
                    "destination": alert.destination,
                    "risk_score": alert.risk_score,
                    "risk_level": risk_level,
                    "status": alert.status,
                    "created_at": alert.created_at,
                }
            )

        if len(recent_high_risk_alerts) >= 10:
            break

    return {
        "total_alerts": total_alerts,
        "average_risk_score": round(
            average_risk_score,
            2,
        ),
        "maximum_risk_score": round(
            maximum_risk_score,
            2,
        ),
        "current_risk_level": current_risk_level,
        "risk_distribution": {
            "LOW": risk_distribution.get(
                "LOW",
                0,
            ),
            "MEDIUM": risk_distribution.get(
                "MEDIUM",
                0,
            ),
            "HIGH": risk_distribution.get(
                "HIGH",
                0,
            ),
            "CRITICAL": risk_distribution.get(
                "CRITICAL",
                0,
            ),
        },
        "attack_type_distribution": dict(
            attack_type_distribution.most_common()
        ),
        "top_sources": top_sources,
        "top_destinations": top_destinations,
        "recent_high_risk_alerts": (
            recent_high_risk_alerts
        ),
    }