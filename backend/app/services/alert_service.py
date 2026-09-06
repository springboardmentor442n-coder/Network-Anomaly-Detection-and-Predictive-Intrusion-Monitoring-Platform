from datetime import datetime


alerts = []

alert_counter = 1


def get_priority(risk_level):
    """
    Convert risk level into security priority.
    """

    priority_map = {
        "CRITICAL": "P1",
        "HIGH": "P2",
        "MEDIUM": "P3",
        "LOW": "P4"
    }

    return priority_map.get(
        risk_level.upper(),
        "P4"
    )


def create_alert(alert_data):
    global alert_counter

    # Do not create alerts for benign low-risk traffic
    if (
        alert_data["prediction"] == "BENIGN"
        and alert_data["risk_level"] == "LOW"
    ):
        return None

    risk_level = alert_data["risk_level"].upper()

    priority = get_priority(
        risk_level
    )

    alert = {
        "alert_id": alert_counter,
        "timestamp": datetime.utcnow().isoformat(),

        "prediction": alert_data["prediction"],
        "attack_probability": alert_data["attack_probability"],
        "anomaly": alert_data["anomaly"],

        "risk_score": alert_data["risk_score"],
        "risk_level": risk_level,
        "priority": priority,

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