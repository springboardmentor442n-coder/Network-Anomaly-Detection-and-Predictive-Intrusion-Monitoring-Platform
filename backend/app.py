from flask import Flask, request, jsonify
from flask_cors import CORS
from urllib.parse import urlparse
import os
import joblib

app = Flask(__name__)
CORS(app)


# ==========================================
# LOAD TRAINED MODEL
# ==========================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "netshield_model.pkl"
)

FEATURE_PATH = os.path.join(
    BASE_DIR,
    "model_features.pkl"
)

model = None
model_features = []

try:
    model = joblib.load(MODEL_PATH)
    model_features = joblib.load(FEATURE_PATH)

    print("NetShield ML model loaded successfully!")
    print("Number of model features:", len(model_features))

except Exception as e:
    print("ML model could not be loaded:", e)


# ==========================================
# HOME
# ==========================================

@app.route("/")
def home():
    return jsonify({
        "status": "success",
        "message": "NetShield AI Backend is Running!",
        "ml_model_loaded": model is not None,
        "model_features": len(model_features)
    })


# ==========================================
# URL SCAN
# ==========================================

@app.route("/scan", methods=["POST"])
def scan():

    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "No data received"
        }), 400

    url = data.get("url", "").strip()

    if not url:
        return jsonify({
            "status": "error",
            "message": "Please enter a URL"
        }), 400

    # Add http if protocol is missing
    check_url = (
        url
        if "://" in url
        else "http://" + url
    )

    parsed = urlparse(check_url)
    hostname = parsed.hostname or ""

    score = 0
    warnings = []


    # ==========================================
    # HTTPS CHECK
    # ==========================================

    if parsed.scheme != "https":
        score += 30
        warnings.append(
            "URL does not use HTTPS"
        )


    # ==========================================
    # @ SYMBOL CHECK
    # ==========================================

    if "@" in url:
        score += 25
        warnings.append(
            "URL contains @ symbol"
        )


    # ==========================================
    # IP ADDRESS CHECK
    # ==========================================

    if hostname.replace(".", "").isdigit():
        score += 25
        warnings.append(
            "URL uses an IP address instead of a domain name"
        )


    # ==========================================
    # URL LENGTH CHECK
    # ==========================================

    if len(url) > 100:
        score += 10
        warnings.append(
            "URL is unusually long"
        )


    # ==========================================
    # RISK LEVEL
    # ==========================================

    if score >= 60:
        risk = "High"

    elif score >= 30:
        risk = "Medium"

    else:
        risk = "Low"


    # ==========================================
    # RESPONSE
    # ==========================================

    return jsonify({
        "status": "success",
        "url": url,
        "risk": risk,
        "score": score,
        "warnings": warnings,
        "ml_model_loaded": model is not None
    })


# ==========================================
# RUN SERVER
# ==========================================

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )