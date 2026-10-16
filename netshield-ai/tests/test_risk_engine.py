"""
NETSHIELD AI - Risk Scoring & Escalation Tests
"""
import pytest
from app.risk.scorer import compute_risk_score, apply_escalation_bonus, get_risk_label

def test_risk_score_calculation():
    # Test high risk scenario (DDoS high confidence)
    risk_res = compute_risk_score(
        predicted_class="DDoS",
        confidence=0.98
    )
    assert risk_res["final_risk"] >= 80
    assert risk_res["risk_level"] in ["High", "Critical"]

    # Test low risk benign scenario
    benign_res = compute_risk_score(
        predicted_class="BENIGN",
        confidence=0.99
    )
    assert benign_res["final_risk"] == 0
    assert benign_res["risk_level"] == "Low"

def test_escalation_bonus():
    initial_score = 75
    escalated = apply_escalation_bonus(initial_score, bonus=15)
    assert escalated == 90
    assert apply_escalation_bonus(95, bonus=15) == 100
