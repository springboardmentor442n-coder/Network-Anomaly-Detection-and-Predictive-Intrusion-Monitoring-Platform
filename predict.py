import joblib
import pandas as pd


# Load trained models
binary_model = joblib.load("model_random_forest.pkl")
attack_model = joblib.load("model_attack_classifier.pkl")


# Load preprocessing information
preprocessing_medians = joblib.load(
    "binary_preprocessing_medians.pkl"
)

feature_columns = joblib.load(
    "feature_columns.pkl"
)


def preprocess_data(X):

    X = X.copy()

    # Keep exactly the same 78 features
    # and in the same order used during training
    X = X[feature_columns]

    # Handle negative values
    # using medians learned from training data
    for col, median_value in preprocessing_medians.items():

        X.loc[X[col] < 0, col] = None

        X[col] = X[col].fillna(median_value)

    return X

def calculate_risk_score(prediction, attack_type):

    # BENIGN traffic
    if prediction == "BENIGN":
        return {
            "risk_score": 0,
            "severity": "LOW"
        }

    # Base scores for different attack types
    risk_scores = {
        "DDoS": 90,
        "DoS Hulk": 85,
        "DoS GoldenEye": 80,
        "DoS slowloris": 75,
        "DoS Slowhttptest": 75,
        "PortScan": 60,
        "FTP-Patator": 70,
        "SSH-Patator": 70,
        "Bot": 85,
        "Web Attack – Brute Force": 65,
        "Web Attack – XSS": 70,
        "Other": 50
    }

    score = risk_scores.get(attack_type, 50)

    # Convert score to severity
    if score >= 80:
        severity = "CRITICAL"
    elif score >= 60:
        severity = "HIGH"
    elif score >= 40:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    return {
        "risk_score": score,
        "severity": severity
    }

def generate_alert(prediction, attack_type, risk_score, severity):

    # No alert for normal traffic
    if prediction == "BENIGN":
        return {
            "alert": False,
            "message": "Normal network traffic"
        }

    # Alert for attack traffic
    return {
        "alert": True,
        "message": f"{severity} {attack_type} attack detected",
        "attack_type": attack_type,
        "risk_score": risk_score,
        "severity": severity
    }

def predict_traffic(X):

    # Preprocess incoming traffic
    X = preprocess_data(X)

    # Model 1: BENIGN or ATTACK
    binary_prediction = binary_model.predict(X)[0]

    # BENIGN
    if binary_prediction == 0:

        risk = calculate_risk_score(
            "BENIGN",
            None
        )

        alert = generate_alert(
            "BENIGN",
            None,
            risk["risk_score"],
            risk["severity"]
        )

        return {
            "prediction": "BENIGN",
            "attack_type": None,
            "risk_score": risk["risk_score"],
            "severity": risk["severity"],
            "alert": alert
        }

    # ATTACK → Model 2
    attack_prediction = attack_model.predict(X)[0]

    # Calculate risk
    risk = calculate_risk_score(
        "ATTACK",
        attack_prediction
    )

    # Generate alert
    alert = generate_alert(
        "ATTACK",
        attack_prediction,
        risk["risk_score"],
        risk["severity"]
    )

    return {
        "prediction": "ATTACK",
        "attack_type": attack_prediction,
        "risk_score": risk["risk_score"],
        "severity": risk["severity"],
        "alert": alert
    }

# Test with one real row
df = pd.read_csv(
    "data/cleaned/Wednesday-workingHours.pcap_ISCX_cleaned.csv"
)

sample = df.drop(columns=["Label"]).iloc[[78883]]

print("Sample shape:", sample.shape)


# Make prediction
result = predict_traffic(sample)

print("Predicted:", result)


# Compare with actual label
actual_label = df.iloc[78883]["Label"]

print("Actual:", actual_label)