from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.auth import get_current_user
from backend.app.core.database import get_db
from backend.app.models.alert import Alert


router = APIRouter(
    prefix="/threat-intelligence",
    tags=["Threat Intelligence"],
)


def classify_indicator(value: str) -> str:
    if not value:
        return "UNKNOWN"

    value = value.strip()

    private_prefixes = (
        "10.",
        "172.16.",
        "172.17.",
        "172.18.",
        "172.19.",
        "172.20.",
        "172.21.",
        "172.22.",
        "172.23.",
        "172.24.",
        "172.25.",
        "172.26.",
        "172.27.",
        "172.28.",
        "172.29.",
        "172.30.",
        "172.31.",
        "192.168.",
    )

    if value.startswith(private_prefixes):
        return "PRIVATE"

    return "PUBLIC"


def risk_category(score: float) -> str:
    if score >= 80:
        return "CRITICAL"

    if score >= 60:
        return "HIGH"

    if score >= 40:
        return "MEDIUM"

    return "LOW"


@router.get("")
def get_threat_intelligence(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    alerts = (
        db.query(Alert)
        .order_by(Alert.created_at.desc())
        .all()
    )

    indicators = {}

    for alert in alerts:
        source = alert.source or "UNKNOWN"
        destination = alert.destination or "UNKNOWN"

        source_key = f"IP:{source}"
        destination_key = f"IP:{destination}"

        source_score = float(alert.risk_score or 0)

        if source_key not in indicators:
            indicators[source_key] = {
                "indicator": source,
                "type": "IP",
                "classification": classify_indicator(source),
                "occurrences": 0,
                "maximum_risk_score": 0.0,
                "risk_level": "LOW",
                "attack_types": Counter(),
                "latest_activity": alert.created_at,
            }

        source_item = indicators[source_key]

        source_item["occurrences"] += 1
        source_item["maximum_risk_score"] = max(
            source_item["maximum_risk_score"],
            source_score,
        )

        source_item["risk_level"] = risk_category(
            source_item["maximum_risk_score"]
        )

        source_item["attack_types"][
            alert.attack_type or "UNKNOWN"
        ] += 1

        if (
            source_item["latest_activity"] is None
            or (
                alert.created_at
                and alert.created_at > source_item["latest_activity"]
            )
        ):
            source_item["latest_activity"] = alert.created_at

        if destination not in ("UNKNOWN", ""):
            if destination_key not in indicators:
                indicators[destination_key] = {
                    "indicator": destination,
                    "type": "IP",
                    "classification": classify_indicator(destination),
                    "occurrences": 0,
                    "maximum_risk_score": 0.0,
                    "risk_level": "LOW",
                    "attack_types": Counter(),
                    "latest_activity": alert.created_at,
                }

            destination_item = indicators[destination_key]

            destination_item["occurrences"] += 1
            destination_item["maximum_risk_score"] = max(
                destination_item["maximum_risk_score"],
                source_score,
            )

            destination_item["risk_level"] = risk_category(
                destination_item["maximum_risk_score"]
            )

            destination_item["attack_types"][
                alert.attack_type or "UNKNOWN"
            ] += 1

            if (
                destination_item["latest_activity"] is None
                or (
                    alert.created_at
                    and alert.created_at
                    > destination_item["latest_activity"]
                )
            ):
                destination_item["latest_activity"] = alert.created_at

    result = []

    for item in indicators.values():
        result.append(
            {
                "indicator": item["indicator"],
                "type": item["type"],
                "classification": item["classification"],
                "occurrences": item["occurrences"],
                "maximum_risk_score": round(
                    item["maximum_risk_score"],
                    1,
                ),
                "risk_level": item["risk_level"],
                "attack_types": dict(
                    item["attack_types"]
                ),
                "latest_activity": item["latest_activity"],
                "analyst_verdict": "UNKNOWN",
            }
        )

    result.sort(
        key=lambda item: (
            item["maximum_risk_score"],
            item["occurrences"],
        ),
        reverse=True,
    )

    total_indicators = len(result)

    high_risk_indicators = sum(
        1
        for item in result
        if item["risk_level"] in ("HIGH", "CRITICAL")
    )

    public_indicators = sum(
        1
        for item in result
        if item["classification"] == "PUBLIC"
    )

    private_indicators = sum(
        1
        for item in result
        if item["classification"] == "PRIVATE"
    )

    return {
        "summary": {
            "total_indicators": total_indicators,
            "high_risk_indicators": high_risk_indicators,
            "public_indicators": public_indicators,
            "private_indicators": private_indicators,
        },
        "indicators": result,
        "generated_for": current_user["username"],
    }