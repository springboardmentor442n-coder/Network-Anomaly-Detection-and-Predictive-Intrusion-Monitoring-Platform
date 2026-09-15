def calculate_risk(prediction, confidence):
    prediction = str(prediction).strip().upper()
    confidence = float(confidence)

    if prediction == "BENIGN":
        risk_score = round((1 - confidence) * 30, 2)
        risk_level = "Low"

    elif confidence >= 0.90:
        risk_score = round(70 + (confidence - 0.90) * 300, 2)
        risk_score = min(risk_score, 100)
        risk_level = "High"

    elif confidence >= 0.70:
        risk_score = round(40 + (confidence - 0.70) * 150, 2)
        risk_level = "Medium"

    else:
        risk_score = round(confidence * 50, 2)
        risk_level = "Medium"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level
    }


if __name__ == "__main__":

    print("==========================================")
    print("NETSHIELD AI - RISK SCORING SYSTEM")
    print("==========================================")

    test_cases = [
        ("BENIGN", 0.99),
        ("DDoS", 0.95),
        ("PortScan", 0.80)
    ]

    for prediction, confidence in test_cases:

        result = calculate_risk(prediction, confidence)

        print("\nPrediction:", prediction)
        print("Confidence:", confidence)
        print("Risk Score:", result["risk_score"])
        print("Risk Level:", result["risk_level"])

    print("\n==========================================")
    print("RISK SCORING SYSTEM READY")
    print("==========================================")