"""Risk scoring engine (Risk Scoring Intern Guide): severity x confidence + 0.3*anomaly, IP escalation, labels."""
import threading
from collections import defaultdict
from datetime import datetime, timedelta

SEVERITY_TABLE = {
    "BENIGN": 0, "Normal Traffic": 0, "PortScan": 30, "Port Scanning": 30,
    "Brute Force": 50, "FTP-Patator": 50, "SSH-Patator": 50,
    "Web Attack": 60, "Web Attacks": 60, "Infiltration": 75,
    "Botnet": 80, "Bots": 80, "DoS": 85, "DDoS": 90, "Heartbleed": 95,
}

def score_to_label(score: float) -> str:
    if score <= 25: return "Low"
    if score <= 50: return "Medium"
    if score <= 75: return "High"
    return "Critical"

class RiskEngine:
    def __init__(self, window_minutes=10, threshold=3, bump=15):
        self.window = timedelta(minutes=window_minutes)
        self.threshold, self.bump = threshold, bump
        self.recent = defaultdict(list)
        self.lock = threading.Lock()

    def reset(self):
        with self.lock:
            self.recent.clear()

    def apply_escalation(self, ip: str, score: int) -> int:
        if not ip or ip == "0.0.0.0" or score <= 25:
            return score
        now = datetime.utcnow()
        with self.lock:
            lst = [t for t in self.recent[ip] if now - t < self.window] + [now]
            self.recent[ip] = lst
            if len(lst) >= self.threshold:
                score = min(score + self.bump, 100)
        return score

    def compute_risk_score(self, predicted_class, confidence, anomaly_score=0.0, source_ip=None) -> dict:
        base = SEVERITY_TABLE.get(predicted_class, 50)
        score = min(round(base * confidence + anomaly_score * 0.3), 100)
        if source_ip:
            score = self.apply_escalation(source_ip, score)
        return {"risk_score": score, "risk_label": score_to_label(score)}
