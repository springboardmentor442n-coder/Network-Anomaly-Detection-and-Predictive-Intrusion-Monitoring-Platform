import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.risk import RiskEngine

def test_risk_scoring_rules():
    r = RiskEngine()
    assert r.compute_risk_score("BENIGN", 0.99) == {"risk_score": 0, "risk_label": "Low"}
    assert r.compute_risk_score("DDoS", 0.92) == {"risk_score": 83, "risk_label": "Critical"}
    assert r.compute_risk_score("DDoS", 0.40) == {"risk_score": 36, "risk_label": "Medium"}
    ip = "172.16.0.1"
    r.compute_risk_score("Brute Force", 0.8, source_ip=ip)
    r.compute_risk_score("Brute Force", 0.8, source_ip=ip)
    assert r.compute_risk_score("Brute Force", 0.8, source_ip=ip) == {"risk_score": 55, "risk_label": "High"}
    assert r.compute_risk_score("DDoS", 0.99, anomaly_score=90.0, source_ip=ip)["risk_score"] == 100
