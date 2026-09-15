from flask import Flask, request, jsonify
from flask_cors import CORS
from urllib.parse import urlparse
import os
import joblib
import pandas as pd
import glob

app = Flask(__name__)
CORS(app)


# ==========================================
# LOAD ANOMALY DETECTION MODEL
# ==========================================

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "netshield_model.pkl"
)

FEATURE_PATH = os.path.join(
    os.path.dirname(__file__),
    "model_features.pkl"
)

try:
    model = joblib.load(MODEL_PATH)
    model_features = joblib.load(FEATURE_PATH)

    print("NetShield ML model loaded successfully!")
    print("Number of model features:", len(model_features))

except Exception as e:
    model = None
    model_features = []

    print("Error loading ML model:", e)


# ==========================================
# LOAD ATTACK PREDICTION MODEL
# ==========================================

ATTACK_MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "attack_model.pkl"
)

ATTACK_FEATURE_PATH = os.path.join(
    os.path.dirname(__file__),
    "attack_model_features.pkl"
)

try:
    attack_model = joblib.load(ATTACK_MODEL_PATH)
    attack_features = joblib.load(ATTACK_FEATURE_PATH)

    print("Attack prediction model loaded successfully!")
    print("Number of attack model features:", len(attack_features))

except Exception as e:
    attack_model = None
    attack_features = []

    print("Error loading attack model:", e)


# ==========================================
# HOME / BACKEND STATUS
# ==========================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "message": "NetShield AI Backend is Running!",
        "status": "success",
        "ml_model_loaded": model is not None,
        "model_features": len(model_features),
        "attack_model_loaded": attack_model is not None,
        "attack_model_features": len(attack_features)
    })


# ==========================================
# URL SECURITY SCANNER
# ==========================================

@app.route("/scan", methods=["POST"])
def scan_url():

    data = request.get_json()

    if not data or "url" not in data:
        return jsonify({
            "error": "URL is required"
        }), 400

    url = data["url"]

    try:
        parsed_url = urlparse(url)

        score = 0

        # HTTPS check
        if parsed_url.scheme != "https":
            score += 20

        # IP address check
        hostname = parsed_url.hostname

        if hostname:
            parts = hostname.split(".")

            if len(parts) == 4 and all(
                part.isdigit() for part in parts
            ):
                score += 30

        # Suspicious URL keywords
        suspicious_words = [
            "login",
            "verify",
            "account",
            "bank",
            "secure",
            "update",
            "password"
        ]

        if hostname:
            for word in suspicious_words:
                if word in hostname.lower():
                    score += 10

        # Long URL check
        if len(url) > 100:
            score += 20

        # Risk level
        if score >= 70:
            risk_level = "High"

        elif score >= 40:
            risk_level = "Medium"

        else:
            risk_level = "Low"

        return jsonify({
            "url": url,
            "risk_level": risk_level,
            "score": score
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# ==========================================
# ATTACK PREDICTION
# ==========================================

@app.route("/predict-attack", methods=["POST"])
def predict_attack():

    if attack_model is None:
        return jsonify({
            "error": "Attack prediction model is not loaded"
        }), 500

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Traffic feature data is required"
        }), 400

    try:

        feature_values = []

        for feature in attack_features:

            value = data.get(feature, 0)

            try:
                value = float(value)

            except:
                value = 0

            feature_values.append(value)

        input_data = pd.DataFrame(
            [feature_values],
            columns=attack_features
        )

        prediction = attack_model.predict(input_data)[0]

        # Confidence
        confidence = 0

        if hasattr(attack_model, "predict_proba"):

            probabilities = attack_model.predict_proba(input_data)[0]

            confidence = float(max(probabilities))

        confidence_percentage = round(
            confidence * 100,
            2
        )

        # Risk classification
        if str(prediction).strip().upper() == "BENIGN":

            risk_level = "Low"

            risk_score = round(
                (1 - confidence) * 30,
                2
            )

        elif confidence >= 0.90:

            risk_level = "High"

            risk_score = round(
                70 + (confidence - 0.90) * 300,
                2
            )

            risk_score = min(
                risk_score,
                100
            )

        elif confidence >= 0.70:

            risk_level = "Medium"

            risk_score = round(
                40 + (confidence - 0.70) * 150,
                2
            )

        else:

            risk_level = "Medium"

            risk_score = round(
                confidence * 50,
                2
            )

        return jsonify({

            "prediction": str(prediction),

            "risk_level": risk_level,

            "risk_score": risk_score,

            "confidence": confidence_percentage,

            "model": "Random Forest Attack Classification Model"

        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# ==========================================
# TRAFFIC ANALYTICS
# ==========================================

@app.route("/traffic", methods=["GET"])
def traffic_analytics():

    data_path = os.path.join(
        os.path.dirname(__file__),
        "data",
        "CICIDS2017"
    )

    csv_files = glob.glob(
        os.path.join(data_path, "*.csv")
    )

    total_traffic = 0
    normal_traffic = 0
    attack_traffic = 0

    attack_types = {}

    for file in csv_files:

        try:

            df = pd.read_csv(
                file,
                encoding="latin1",
                low_memory=False
            )

            # Clean column names
            df.columns = df.columns.str.strip()

            if "Label" not in df.columns:
                continue

            # Clean labels
            df["Label"] = (
                df["Label"]
                .astype(str)
                .str.strip()
            )

            total_traffic += len(df)

            # Normal traffic
            benign_count = (
                df["Label"]
                .str.upper()
                .eq("BENIGN")
                .sum()
            )

            normal_traffic += int(
                benign_count
            )

            # Attack traffic
            attack_df = df[
                ~df["Label"]
                .str.upper()
                .eq("BENIGN")
            ]

            attack_traffic += len(
                attack_df
            )

            # Attack type counts
            counts = (
                attack_df["Label"]
                .value_counts()
                .to_dict()
            )

            for attack, count in counts.items():

                # Fix encoding problems
                clean_attack = (
                    str(attack)
                    .replace("ï¿½", "–")
                    .replace("�", "–")
                )

                if clean_attack not in attack_types:
                    attack_types[
                        clean_attack
                    ] = 0

                attack_types[
                    clean_attack
                ] += int(count)

        except Exception as e:

            print(
                "Error reading:",
                file,
                e
            )

    # Calculate attack percentage
    if total_traffic > 0:

        attack_percentage = round(
            (attack_traffic / total_traffic) * 100,
            2
        )

    else:

        attack_percentage = 0

    return jsonify({

        "total_traffic": total_traffic,

        "normal_traffic": normal_traffic,

        "attack_traffic": attack_traffic,

        "attack_percentage": attack_percentage,

        "attack_types": attack_types

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