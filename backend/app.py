from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import pickle
import joblib
import pandas as pd

from alerts import create_alert, get_alerts, update_alert_status


app = Flask(__name__)
CORS(app)


# =========================================================
# PATHS
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


# =========================================================
# LOAD MAIN ANOMALY DETECTION MODEL
# =========================================================

MODEL_PATH = os.path.join(BASE_DIR, "netshield_model.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "model_features.pkl")


model = None
model_features = []


try:
    model = joblib.load(MODEL_PATH)

    with open(FEATURES_PATH, "rb") as f:
        model_features = pickle.load(f)

    print("Main ML Model Loaded Successfully")
    print("Main Model Features:", len(model_features))

except Exception as e:
    print("Main ML Model Loading Error:", e)


# =========================================================
# LOAD ATTACK CLASSIFICATION MODEL
# =========================================================

ATTACK_MODEL_PATH = os.path.join(BASE_DIR, "attack_model.pkl")
ATTACK_FEATURES_PATH = os.path.join(
    BASE_DIR,
    "attack_model_features.pkl"
)


attack_model = None
attack_model_features = []


try:
    attack_model = joblib.load(ATTACK_MODEL_PATH)

    with open(ATTACK_FEATURES_PATH, "rb") as f:
        attack_model_features = pickle.load(f)

    print("Attack Classification Model Loaded Successfully")
    print(
        "Attack Model Features:",
        len(attack_model_features)
    )

except Exception as e:
    print("Attack Model Loading Error:", e)


# =========================================================
# HOME
# =========================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "status": "success",
        "message": "NetShield AI Backend is Running!",
        "ml_model_loaded": model is not None,
        "model_features": len(model_features),
        "attack_model_loaded": attack_model is not None,
        "attack_model_features": len(attack_model_features),
        "alerts": len(get_alerts())
    })


# =========================================================
# URL SCAN
# =========================================================

@app.route("/scan", methods=["POST"])
def scan():

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "status": "error",
                "message": "No JSON data received"
            }), 400

        url = data.get("url", "")

        if not url:
            return jsonify({
                "status": "error",
                "message": "URL is required"
            }), 400


        # Basic demo scan

        result = {
            "url": url,
            "prediction": "BENIGN",
            "risk_level": "Low",
            "risk_score": 5,
            "confidence": 95
        }


        return jsonify({
            "status": "success",
            "result": result
        })


    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================================
# ATTACK PREDICTION
# =========================================================

@app.route("/predict-attack", methods=["POST"])
def predict_attack():

    try:

        if attack_model is None:
            return jsonify({
                "status": "error",
                "message": "Attack model is not loaded"
            }), 500


        data = request.get_json()

        if not data:
            return jsonify({
                "status": "error",
                "message": "No JSON data received"
            }), 400


        # -------------------------------------------------
        # Create dataframe using model feature order
        # -------------------------------------------------

        input_data = {}

        for feature in attack_model_features:

            value = data.get(feature, 0)

            try:
                value = float(value)
            except:
                value = 0

            input_data[feature] = value


        df = pd.DataFrame(
            [input_data],
            columns=attack_model_features
        )


        # -------------------------------------------------
        # Prediction
        # -------------------------------------------------

        prediction = attack_model.predict(df)[0]


        # -------------------------------------------------
        # Confidence
        # -------------------------------------------------

        confidence = 0

        try:

            probabilities = attack_model.predict_proba(df)[0]

            confidence = round(
                float(max(probabilities)) * 100,
                2
            )

        except:

            confidence = 0


        # -------------------------------------------------
        # Risk calculation
        # -------------------------------------------------

        if str(prediction).upper() == "BENIGN":

            risk_level = "Low"

            risk_score = round(
                max(0, 10 - confidence / 10),
                2
            )

        else:

            if confidence >= 90:

                risk_level = "High"
                risk_score = 90

            elif confidence >= 70:

                risk_level = "Medium"
                risk_score = 60

            else:

                risk_level = "Medium"
                risk_score = 50


        # -------------------------------------------------
        # Create alert for Medium / High risk
        # -------------------------------------------------

        alert = None

        if risk_level in ["Medium", "High"]:

            alert = create_alert(
                str(prediction),
                risk_level,
                risk_score,
                confidence
            )


        return jsonify({

            "status": "success",

            "prediction": str(prediction),

            "risk_level": risk_level,

            "risk_score": risk_score,

            "confidence": confidence,

            "alert": alert

        })


    except Exception as e:

        return jsonify({

            "status": "error",

            "message": str(e)

        }), 500


# =========================================================
# TRAFFIC ANALYTICS
# =========================================================

@app.route("/traffic", methods=["GET"])
def traffic():
    try:
        total_traffic = 80000
        benign_traffic = 65000
        attack_traffic = 15000

        attack_percentage = round(
            (attack_traffic / total_traffic) * 100, 2
        )

        return jsonify({
            "status": "success",
            "total_traffic": total_traffic,
            "benign_traffic": benign_traffic,
            "attack_traffic": attack_traffic,
            "attack_percentage": attack_percentage
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# =========================================================
# GET ALL ALERTS
# =========================================================

@app.route("/alerts", methods=["GET"])
def alerts():

    try:

        return jsonify({

            "status": "success",

            "alerts": get_alerts()

        })


    except Exception as e:

        return jsonify({

            "status": "error",

            "message": str(e)

        }), 500


# =========================================================
# UPDATE ALERT STATUS
# =========================================================

@app.route("/alerts/<int:alert_id>", methods=["PUT"])
def update_alert(alert_id):

    try:
        data = request.get_json()

        new_status = data.get("status")

        allowed_statuses = [
            "Open",
            "Investigating",
            "Resolved",
            "Closed"
        ]

        if new_status not in allowed_statuses:
            return jsonify({
                "status": "error",
                "message": "Invalid status"
            }), 400

        updated_alert = update_alert_status(
            alert_id,
            new_status
        )

        if updated_alert is None:
            return jsonify({
                "status": "error",
                "message": "Alert not found"
            }), 404

        return jsonify({
            "status": "success",
            "message": "Alert status updated",
            "alert": updated_alert
        })

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    # =========================================================
# SECURITY ANALYTICS
# =========================================================

@app.route("/analytics", methods=["GET"])
def analytics():

    try:

        alerts_data = get_alerts()

        total_alerts = len(alerts_data)

        high_risk = 0
        medium_risk = 0
        low_risk = 0

        open_alerts = 0
        investigating = 0
        resolved = 0
        closed = 0

        for alert in alerts_data:

            # Risk level
            if alert["risk_level"] == "High":
                high_risk += 1

            elif alert["risk_level"] == "Medium":
                medium_risk += 1

            elif alert["risk_level"] == "Low":
                low_risk += 1

            # Status
            if alert["status"] == "Open":
                open_alerts += 1

            elif alert["status"] == "Investigating":
                investigating += 1

            elif alert["status"] == "Resolved":
                resolved += 1

            elif alert["status"] == "Closed":
                closed += 1

        return jsonify({

            "status": "success",

            "total_alerts": total_alerts,

            "high_risk": high_risk,

            "medium_risk": medium_risk,

            "low_risk": low_risk,

            "open_alerts": open_alerts,

            "investigating": investigating,

            "resolved": resolved,

            "closed": closed

        })

    except Exception as e:

        return jsonify({

            "status": "error",

            "message": str(e)

        }), 500


# =========================================================
# THREAT INTELLIGENCE REPORT
# =========================================================

@app.route("/threat-report", methods=["GET"])
def threat_report():

    try:

        alerts_data = get_alerts()


        total_threats = len(alerts_data)


        high_risk = 0

        medium_risk = 0

        open_count = 0

        investigating = 0

        resolved = 0

        closed = 0


        attack_types = {}


        for alert in alerts_data:

            # Risk levels

            if alert["risk_level"] == "High":

                high_risk += 1

            elif alert["risk_level"] == "Medium":

                medium_risk += 1


            # Status

            if alert["status"] == "Open":

                open_count += 1

            elif alert["status"] == "Investigating":

                investigating += 1

            elif alert["status"] == "Resolved":

                resolved += 1

            elif alert["status"] == "Closed":

                closed += 1


            # Attack type

            attack_type = alert["attack_type"]

            if attack_type not in attack_types:

                attack_types[attack_type] = 0

            attack_types[attack_type] += 1


        # Latest 10 threats

        recent_threats = alerts_data[-10:][::-1]


        return jsonify({

            "status": "success",

            "total_threats": total_threats,

            "high_risk": high_risk,

            "medium_risk": medium_risk,

            "open": open_count,

            "investigating": investigating,

            "resolved": resolved,

            "closed": closed,

            "attack_types": attack_types,

            "recent_threats": recent_threats

        })


    except Exception as e:

        return jsonify({

            "status": "error",

            "message": str(e)

        }), 500


# =========================================================
# DEMO ALERT
# =========================================================

@app.route("/demo-alert", methods=["POST"])
def demo_alert():

    try:

        data = request.get_json()


        if not data:

            return jsonify({

                "status": "error",

                "message": "No JSON data received"

            }), 400


        attack_type = data.get(
            "attack_type",
            "Unknown"
        )


        risk_level = data.get(
            "risk_level",
            "Low"
        )


        risk_score = data.get(
            "risk_score",
            0
        )


        confidence = data.get(
            "confidence",
            0
        )


        alert = create_alert(

            attack_type,

            risk_level,

            risk_score,

            confidence

        )


        return jsonify({

            "status": "success",

            "message": "Demo alert created successfully",

            "alert": alert

        })


    except Exception as e:

        return jsonify({

            "status": "error",

            "message": str(e)

        }), 500


# =========================================================
# NOTIFICATIONS
# =========================================================

@app.route("/notifications", methods=["GET"])
def notifications():

    try:

        alerts_data = get_alerts()


        notifications = []


        for alert in alerts_data:

            # Only High Risk alerts
            # are treated as notifications

            if alert["risk_level"] == "High":

                notifications.append({

                    "id": alert["id"],

                    "type": "High Risk Alert",

                    "message":
                        f'{alert["attack_type"]} attack detected',

                    "risk_level":
                        alert["risk_level"],

                    "risk_score":
                        alert["risk_score"],

                    "confidence":
                        alert["confidence"],

                    "status":
                        alert["status"],

                    "timestamp":
                        alert["timestamp"]

                })


        return jsonify({

            "status": "success",

            "notifications": notifications

        })


    except Exception as e:

        return jsonify({

            "status": "error",

            "message": str(e)

        }), 500


# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )