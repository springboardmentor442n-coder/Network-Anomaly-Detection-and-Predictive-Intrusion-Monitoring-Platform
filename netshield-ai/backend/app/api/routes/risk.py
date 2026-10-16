"""Risk analysis routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.database.models import Alert, User
from app.api.deps import get_current_user
from app.risk.scorer import SEVERITY_MAP, get_risk_label, compute_risk_score

router = APIRouter()


@router.get("/distribution")
async def get_risk_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = (
        db.query(Alert.risk_level, func.count(Alert.id).label("count"))
        .group_by(Alert.risk_level)
        .all()
    )
    dist = {r[0]: r[1] for r in results}
    return {
        "low": dist.get("Low", 0),
        "medium": dist.get("Medium", 0),
        "high": dist.get("High", 0),
        "critical": dist.get("Critical", 0),
    }


@router.get("/top-risky-ips")
async def get_top_risky_ips(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = (
        db.query(
            Alert.source_ip,
            func.count(Alert.id).label("total_alerts"),
            func.avg(Alert.risk_score).label("avg_risk"),
            func.max(Alert.risk_score).label("max_risk"),
            Alert.attack_type,
        )
        .filter(Alert.source_ip != None)
        .group_by(Alert.source_ip, Alert.attack_type)
        .order_by(func.max(Alert.risk_score).desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "ip": r[0],
            "total_alerts": r[1],
            "avg_risk": round(float(r[2]), 1),
            "max_risk": r[3],
            "primary_attack": r[4],
        }
        for r in results
    ]


@router.get("/explain/{attack_type}")
async def explain_risk(
    attack_type: str,
    confidence: float = 0.9,
    current_user: User = Depends(get_current_user),
):
    """Explain how risk score was computed for a given attack type."""
    result = compute_risk_score(attack_type, confidence)
    return {
        "attack_type": attack_type,
        "base_severity": result["base_severity"],
        "is_mapped": result["is_mapped"],
        "confidence": confidence,
        "formula": f"{result['base_severity']} × {confidence} = {result['base_risk']}",
        "base_risk": result["base_risk"],
        "final_risk": result["final_risk"],
        "risk_level": result["risk_level"],
        "explanation": (
            f"The attack type '{attack_type}' has a base severity of {result['base_severity']}. "
            f"Multiplied by model confidence {confidence:.2f} gives {result['base_risk']:.1f}, "
            f"rounded to {result['final_risk']} = {result['risk_level']} risk."
            if result["is_mapped"]
            else f"Attack type '{attack_type}' is NOT in the severity config. Using fallback severity={result['base_severity']}. Please configure in severity_config.json."
        ),
        "severity_map": SEVERITY_MAP,
    }
