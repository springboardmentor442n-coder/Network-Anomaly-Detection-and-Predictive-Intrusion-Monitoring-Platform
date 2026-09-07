import os
import pandas as pd

from prediction_service import predict_network_flow


# --------------------------------------------------
# Dataset path
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

data_path = os.path.join(
    BASE_DIR,
    "data",
    "CICIDS2017",
    "ml_ready",
    "cicids2017_binary_ml_ready.csv"
)


# --------------------------------------------------
# Load dataset
# --------------------------------------------------

print("Loading CICIDS2017 dataset...")

df = pd.read_csv(data_path)

print("Dataset loaded successfully!")
print("Dataset shape:", df.shape)


# --------------------------------------------------
# Separate BENIGN and ATTACK flows
# --------------------------------------------------

benign_flow = df[df["Binary_Label"] == 0].iloc[0]

attack_flow = df[df["Binary_Label"] == 1].iloc[0]


# --------------------------------------------------
# Test BENIGN flow
# --------------------------------------------------

print("\n")
print("=" * 60)
print("BENIGN FLOW TEST")
print("=" * 60)

benign_result = predict_network_flow(benign_flow)

print("Prediction:", benign_result["prediction"])
print(
    "Attack Probability:",
    benign_result["attack_probability"],
    "%"
)
print("Anomaly:", benign_result["anomaly"])
print("Risk Score:", benign_result["risk_score"])
print("Risk Level:", benign_result["risk_level"])
print("Attack Type:", benign_result["attack_type"])
print(
    "Attack Type Confidence:",
    benign_result["attack_type_confidence"],
    "%"
)


# --------------------------------------------------
# Test ATTACK flow
# --------------------------------------------------

print("\n")
print("=" * 60)
print("ATTACK FLOW TEST")
print("=" * 60)

attack_result = predict_network_flow(attack_flow)

print("Prediction:", attack_result["prediction"])
print(
    "Attack Probability:",
    attack_result["attack_probability"],
    "%"
)
print("Anomaly:", attack_result["anomaly"])
print("Risk Score:", attack_result["risk_score"])
print("Risk Level:", attack_result["risk_level"])
print("Attack Type:", attack_result["attack_type"])
print(
    "Attack Type Confidence:",
    attack_result["attack_type_confidence"],
    "%"
)


# --------------------------------------------------
# Final status
# --------------------------------------------------

print("\n")
print("=" * 60)
print("PREDICTION SERVICE TEST COMPLETED")
print("=" * 60)