from flask import Flask, request, jsonify
from flask_cors import CORS
from urllib.parse import urlparse
import os
import joblib
import pandas as pd
import glob

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "netshield_model.pkl")
FEATURE_PATH = os.path.join(BASE_DIR, "model_features.pkl")

model = None
model_features = []

try:
    model = joblib.load(MODEL_PATH)
    model_features = joblib.load(FEATURE_PATH)

    print("NetShield ML model loaded successfully!")
    print("Number of model features:", len(model_features))

except Exception as e:
    print("ML model could not be loaded:", e)


@app.route("/")
def home():
    return jsonify({
        "status": "success",
        "message": "NetShield AI Backend is Running!",
        "ml_model_loaded": model is not None,
        "model_features": len(model_features)
    })


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

    check_url = url if "://" in url else "http://" + url

    parsed = urlparse(check_url)
    hostname = parsed.hostname or ""

    score = 0
    warnings = []

    if parsed.scheme != "https":
        score += 30
        warnings.append("URL does not use HTTPS")

    if "@" in url:
        score += 25
        warnings.append("URL contains @ symbol")

    if hostname.replace(".", "").isdigit():
        score += 25
        warnings.append(
            "URL uses an IP address instead of a domain name"
        )

    if len(url) > 100:
        score += 10
        warnings.append("URL is unusually long")

    if score >= 60:
        risk = "High"
    elif score >= 30:
        risk = "Medium"
    else:
        risk = "Low"

    return jsonify({
        "status": "success",
        "url": url,
        "risk": risk,
        "score": score,
        "warnings": warnings,
        "ml_model_loaded": model is not None
    })


@app.route("/traffic", methods=["GET"])
def traffic_analytics():

    data_path = os.path.join(
        BASE_DIR,
        "data",
        "MachineLearningCVE",
        "*.csv"
    )

    files = glob.glob(data_path)

    total_records = 0
    benign_records = 0
    attack_records = 0
    attack_types = {}

    for file in files:

        df = pd.read_csv(file, low_memory=False)

        df.columns = df.columns.str.strip()

        total_records += len(df)

        if "Label" in df.columns:

            labels = (
                df["Label"]
                .astype(str)
                .str.strip()
                .str.upper()
            )

            benign_records += int(
                (labels == "BENIGN").sum()
            )

            attacks = labels[labels != "BENIGN"]

            attack_records += len(attacks)

            for attack in attacks:
                attack_types[attack] = (
                    attack_types.get(attack, 0) + 1
                )

    attack_percentage = 0

    if total_records > 0:
        attack_percentage = round(
            (attack_records / total_records) * 100,
            2
        )

    return jsonify({
        "status": "success",
        "total_traffic": total_records,
        "benign_traffic": benign_records,
        "attack_traffic": attack_records,
        "attack_percentage": attack_percentage,
        "attack_types": attack_types
    })


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )