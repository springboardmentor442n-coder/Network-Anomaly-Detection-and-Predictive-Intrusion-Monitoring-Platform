"""Risk scoring from the risk-scoring guide, using the severity table from your notebook."""
SEVERITY_TABLE = {
    "Normal": 0, "Analysis": 40, "Reconnaissance": 60, "Fuzzers": 65, "DoS": 80,
    "Exploits": 85, "Generic": 85, "Backdoor": 95, "Shellcode": 95, "Worms": 95,
    # CICIDS2017 classes (used when you train with train_cicids.py)
    "PortScan": 40, "DoS Hulk": 80, "DoS GoldenEye": 75, "DoS slowloris": 70, "DoS Slowhttptest": 70, "DDoS": 90, "Bot": 85,
    "FTP-Patator": 60, "SSH-Patator": 60, "Web Attack - Brute Force": 65, "Web Attack - XSS": 65, "Web Attack - Sql Injection": 80,
    "Infiltration": 90, "Heartbleed": 95,
}

def score_to_label(score: float) -> str:
    if score <= 25: return "Low"
    if score <= 50: return "Medium"
    if score <= 75: return "High"
    return "Critical"

def compute_risk_score(predicted_class: str, confidence: float, anomaly_score: float = 0) -> dict:
    base = SEVERITY_TABLE.get(predicted_class, 50)  # unknown class -> Medium-ish
    score = min(round(base * confidence + anomaly_score * 0.3), 100)
    return {"risk_score": score, "risk_label": score_to_label(score)}
