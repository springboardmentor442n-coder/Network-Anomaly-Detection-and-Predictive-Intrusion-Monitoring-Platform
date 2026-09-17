"""
Transparent, centralized risk scoring.

The score is a plain weighted sum - there is no model, no black box, and every
term is reported by ``explain()`` so the dashboard can show a user exactly why a
risk level was assigned.

    score = anomaly_points
          + attack_probability_weight * attack_probability
          + confidence_weight        * confidence
          + attack_type_weight(prediction)

clamped to 0-100, then mapped to LOW / MEDIUM / HIGH / CRITICAL.

Weights and thresholds are overridable via environment variables so the scoring
policy is configuration, not code:

    NETSHIELD_RISK_ANOMALY_POINTS     (default 35)
    NETSHIELD_RISK_ATTACK_WEIGHT      (default 45)
    NETSHIELD_RISK_CONFIDENCE_WEIGHT  (default 15)
    NETSHIELD_RISK_UNKNOWN_TYPE_POINTS(default 10, applied only when anomalous)
    NETSHIELD_SEVERITY_CRITICAL       (default 85)
    NETSHIELD_SEVERITY_HIGH           (default 65)
    NETSHIELD_SEVERITY_MEDIUM         (default 35)
"""

from __future__ import annotations

import os
from typing import Any, Dict, Tuple


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        return int(raw)
    except ValueError:
        return default


# Attack-family weights. Matching is prefix/substring based (case-insensitive)
# so concrete CICIDS2017 labels such as "DoS Hulk" or
# "Web Attack - Brute Force - Attempted" resolve to a family weight.
SEVERITY_WEIGHTS: Dict[str, int] = {
    "Benign": 0,
    "Normal": 0,
    "Reconnaissance": 20,
    "Portscan": 20,
    "DoS": 30,
    "DDoS": 35,
    "Bot": 30,
    "Botnet": 30,
    "Web Attack": 25,
    "Infiltration": 30,
    "Heartbleed": 35,
    "Patator": 25,
}

ANOMALY_POINTS = _env_int("NETSHIELD_RISK_ANOMALY_POINTS", 35)
ATTACK_PROBABILITY_WEIGHT = _env_int("NETSHIELD_RISK_ATTACK_WEIGHT", 45)
CONFIDENCE_WEIGHT = _env_int("NETSHIELD_RISK_CONFIDENCE_WEIGHT", 15)
UNKNOWN_TYPE_POINTS = _env_int("NETSHIELD_RISK_UNKNOWN_TYPE_POINTS", 10)

SEVERITY_CRITICAL = _env_int("NETSHIELD_SEVERITY_CRITICAL", 85)
SEVERITY_HIGH = _env_int("NETSHIELD_SEVERITY_HIGH", 65)
SEVERITY_MEDIUM = _env_int("NETSHIELD_SEVERITY_MEDIUM", 35)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def attack_type_points(prediction: str, is_anomaly: bool) -> Tuple[int, str]:
    """
    Resolve the attack-family weight for a predicted label.

    Returns the points and the family name that matched, so the contribution can
    be explained. An unrecognised label contributes ``UNKNOWN_TYPE_POINTS`` only
    when the flow was also flagged anomalous; otherwise it contributes nothing.
    """
    if prediction is None:
        prediction = ""
    label = str(prediction).strip()
    folded = label.casefold()

    if folded in {"benign", "normal"}:
        return 0, "Benign"

    # Longest family name first so "DDoS" wins over "DoS".
    for family in sorted(SEVERITY_WEIGHTS, key=len, reverse=True):
        if family.casefold() in folded:
            return SEVERITY_WEIGHTS[family], family

    return (UNKNOWN_TYPE_POINTS if is_anomaly else 0), "Unrecognized"


def severity_for_score(score: int) -> str:
    if score >= SEVERITY_CRITICAL:
        return "CRITICAL"
    if score >= SEVERITY_HIGH:
        return "HIGH"
    if score >= SEVERITY_MEDIUM:
        return "MEDIUM"
    return "LOW"


def calculate_risk(
    is_anomaly: bool,
    attack_probability: float,
    confidence: float,
    prediction: str,
) -> Tuple[int, str]:
    """Return ``(risk_score, severity)``. Score is an int in [0, 100]."""
    anomaly_component = ANOMALY_POINTS if is_anomaly else 0
    attack_component = ATTACK_PROBABILITY_WEIGHT * _clamp01(attack_probability)
    confidence_component = CONFIDENCE_WEIGHT * _clamp01(confidence)
    type_component, _ = attack_type_points(prediction, is_anomaly)

    raw = anomaly_component + attack_component + confidence_component + type_component
    score = max(0, min(100, round(raw)))
    return score, severity_for_score(score)


def explain(
    is_anomaly: bool,
    attack_probability: float,
    confidence: float,
    prediction: str,
) -> Dict[str, Any]:
    """
    Full breakdown of a risk score for display in the UI.

    Every number returned here is derived from the same code path used by
    ``calculate_risk``, so the explanation can never drift from the score.
    """
    anomaly_component = ANOMALY_POINTS if is_anomaly else 0
    attack_component = ATTACK_PROBABILITY_WEIGHT * _clamp01(attack_probability)
    confidence_component = CONFIDENCE_WEIGHT * _clamp01(confidence)
    type_component, family = attack_type_points(prediction, is_anomaly)

    raw = anomaly_component + attack_component + confidence_component + type_component
    score = max(0, min(100, round(raw)))
    severity = severity_for_score(score)

    return {
        "risk_score": score,
        "severity": severity,
        "raw_score": round(raw, 4),
        "clamped": raw != score,
        "components": [
            {
                "name": "Anomaly detection",
                "points": round(anomaly_component, 4),
                "max_points": ANOMALY_POINTS,
                "reason": (
                    "Isolation Forest flagged this flow as an outlier"
                    if is_anomaly
                    else "Isolation Forest considered this flow in-distribution"
                ),
            },
            {
                "name": "Attack probability",
                "points": round(attack_component, 4),
                "max_points": ATTACK_PROBABILITY_WEIGHT,
                "reason": (
                    f"Classifier assigned {_clamp01(attack_probability):.1%} total "
                    "probability to non-benign classes"
                ),
            },
            {
                "name": "Model confidence",
                "points": round(confidence_component, 4),
                "max_points": CONFIDENCE_WEIGHT,
                "reason": f"Top-class probability was {_clamp01(confidence):.1%}",
            },
            {
                "name": "Attack type weight",
                "points": round(type_component, 4),
                "max_points": max(SEVERITY_WEIGHTS.values()),
                "reason": f"Predicted label '{prediction}' matched family '{family}'",
            },
        ],
        "thresholds": {
            "CRITICAL": SEVERITY_CRITICAL,
            "HIGH": SEVERITY_HIGH,
            "MEDIUM": SEVERITY_MEDIUM,
            "LOW": 0,
        },
        "formula": (
            "score = anomaly_points + attack_weight x attack_probability "
            "+ confidence_weight x confidence + attack_type_points, clamped to 0-100"
        ),
    }


def policy() -> Dict[str, Any]:
    """Current scoring configuration, for the API/docs."""
    return {
        "anomaly_points": ANOMALY_POINTS,
        "attack_probability_weight": ATTACK_PROBABILITY_WEIGHT,
        "confidence_weight": CONFIDENCE_WEIGHT,
        "unknown_type_points": UNKNOWN_TYPE_POINTS,
        "attack_type_weights": dict(SEVERITY_WEIGHTS),
        "severity_thresholds": {
            "CRITICAL": SEVERITY_CRITICAL,
            "HIGH": SEVERITY_HIGH,
            "MEDIUM": SEVERITY_MEDIUM,
            "LOW": 0,
        },
    }
