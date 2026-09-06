from datetime import datetime


alerts = []

alert_counter = 1


def create_alert(alert_data):
    global alert_counter

    # Only create alerts for suspicious traffic
    if (
        alert_data["prediction"] == "BENIGN"
        and alert_data["risk_level"] == "LOW"
    ):
        return None

    alert = {
        "alert_id": alert_counter,
        "timestamp": datetime.utcnow().isoformat(),
        "prediction": alert_data["prediction"],
        "attack_probability": alert_data["attack_probability"],
        "anomaly": alert_data["anomaly"],
        "risk_score": alert_data["risk_score"],
        "risk_level": alert_data["risk_level"],
        "source": alert_data.get("source"),
        "destination": alert_data.get("destination"),
        "status": "OPEN"
    }

    alerts.append(alert)

    alert_counter += 1

    return alert


def get_alerts():
    return alerts


def get_alert_by_id(alert_id):
    for alert in alerts:
        if alert["alert_id"] == alert_id:
            return alert

    return None


def update_alert_status(alert_id, status):
    for alert in alerts:
        if alert["alert_id"] == alert_id:
            alert["status"] = status
            return alert

    return None