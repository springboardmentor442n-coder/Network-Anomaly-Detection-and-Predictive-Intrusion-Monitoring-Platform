"""
NETSHIELD AI - Risk Scoring Engine
Computes risk scores based on attack classification + confidence.
"""
import json
import os
import logging
from typing import Tuple, Dict, Optional

logger = logging.getLogger(__name__)

# Load severity config
_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "severity_config.json")

def _load_config() -> Dict:
    try:
        with open(_CONFIG_PATH) as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Could not load severity_config.json: {e}")
        return {
            "severities": {},
            "default_fallback_severity": 50,
        }

_CONFIG = _load_config()
SEVERITY_MAP: Dict[str, int] = _CONFIG.get("severities", {})
DEFAULT_FALLBACK_SEVERITY: int = _CONFIG.get("default_fallback_severity", 50)


def get_risk_label(risk_score: int) -> str:
    """Convert numeric risk score to label."""
    if risk_score <= 25:
        return "Low"
    elif risk_score <= 50:
        return "Medium"
    elif risk_score <= 75:
        return "High"
    else:
        return "Critical"


def get_base_severity(predicted_class: str) -> Tuple[int, bool]:
    """
    Get base severity for an attack class.
    Returns (severity, is_mapped).
    is_mapped=False means the attack is not in the config.
    """
    # Try exact match
    if predicted_class in SEVERITY_MAP:
        return SEVERITY_MAP[predicted_class], True

    # Try case-insensitive match
    for key, val in SEVERITY_MAP.items():
        if key.lower() == predicted_class.lower():
            return val, True

    # Unmapped
    logger.warning(f"Attack type '{predicted_class}' is not in severity_config.json. Using fallback={DEFAULT_FALLBACK_SEVERITY}.")
    return DEFAULT_FALLBACK_SEVERITY, False


def compute_risk_score(
    predicted_class: str,
    confidence: float,
    anomaly_score: float = 0.0,
) -> Dict:
    """
    Compute a risk score for a predicted attack.

    Formula:
        risk_score = base_severity * confidence
        risk_score = min(round(risk_score), 100)

    anomaly_score: reserved for future unsupervised model integration.
    Currently unused.

    Returns a dict with:
        - base_severity
        - is_mapped
        - confidence
        - base_risk
        - final_risk
        - risk_level
        - predicted_class
    """
    base_severity, is_mapped = get_base_severity(predicted_class)

    base_risk = base_severity * confidence
    final_risk = min(round(base_risk), 100)

    risk_level = get_risk_label(final_risk)

    return {
        "predicted_class": predicted_class,
        "base_severity": base_severity,
        "is_mapped": is_mapped,
        "confidence": confidence,
        "base_risk": round(base_risk, 2),
        "final_risk": final_risk,
        "risk_level": risk_level,
    }


def apply_escalation_bonus(risk_score: int, bonus: int = 15) -> int:
    """Apply escalation bonus to a risk score. Never exceeds 100."""
    return min(risk_score + bonus, 100)


def reload_severity_config():
    """Reload severity config from file (called after admin update)."""
    global _CONFIG, SEVERITY_MAP, DEFAULT_FALLBACK_SEVERITY
    _CONFIG = _load_config()
    SEVERITY_MAP = _CONFIG.get("severities", {})
    DEFAULT_FALLBACK_SEVERITY = _CONFIG.get("default_fallback_severity", 50)
    logger.info("Severity config reloaded.")
