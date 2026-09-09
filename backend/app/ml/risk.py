SEVERITY_WEIGHTS = {"Benign": 0, "Normal": 0, "Reconnaissance": 20, "DoS": 30, "DDoS": 35, "Bot": 30, "Web Attack": 25}


def calculate_risk(is_anomaly: bool, attack_probability: float, confidence: float, prediction: str) -> tuple[int, str]:
    score = (35 if is_anomaly else 0) + 45 * max(0.0, min(1.0, attack_probability)) + 15 * max(0.0, min(1.0, confidence)) + SEVERITY_WEIGHTS.get(prediction, 10 if is_anomaly else 0)
    score = max(0, min(100, round(score)))
    severity = "CRITICAL" if score >= 85 else "HIGH" if score >= 65 else "MEDIUM" if score >= 35 else "LOW"
    return score, severity
