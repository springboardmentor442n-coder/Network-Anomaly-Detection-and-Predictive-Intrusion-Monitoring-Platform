import os
import numpy as np
import pandas as pd
import joblib


# ---------------------------------------------------------
# Model paths
# ---------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

RF_MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "random_forest_baseline.joblib"
)

ISOLATION_MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "isolation_forest_anomaly.joblib"
)


# ---------------------------------------------------------
# Load models
# ---------------------------------------------------------

rf_model = joblib.load(RF_MODEL_PATH)
isolation_model = joblib.load(ISOLATION_MODEL_PATH)


# ---------------------------------------------------------
# Model feature names
# ---------------------------------------------------------

FEATURES_PATH = os.path.join(
    BASE_DIR,
    "data",
    "CICIDS2017",
    "ml_ready",
    "cicids2017_binary_ml_ready.csv"
)

reference_data = pd.read_csv(
    FEATURES_PATH,
    nrows=1
)

columns_to_drop = [
    "Flow ID",
    "Source IP",
    "Destination IP",
    "Timestamp",
    "Label",
    "Binary_Label"
]

FEATURE_COLUMNS = [
    column
    for column in reference_data.columns
    if column not in columns_to_drop
]


# ---------------------------------------------------------
# Risk level
# ---------------------------------------------------------

def get_risk_level(score):

    if score < 25:
        return "LOW"

    elif score < 50:
        return "MEDIUM"

    elif score < 75:
        return "HIGH"

    else:
        return "CRITICAL"


# ---------------------------------------------------------
# Prediction function
# ---------------------------------------------------------

def predict_network_flow(flow_data):

    if isinstance(flow_data, dict):
        flow_data = pd.DataFrame([flow_data])

    elif isinstance(flow_data, pd.Series):
        flow_data = flow_data.to_frame().T

    flow = flow_data.copy()

    # Remove non-model columns if present
    flow = flow.drop(
        columns=columns_to_drop,
        errors="ignore"
    )

    # Ensure correct feature order
    flow = flow.reindex(
        columns=FEATURE_COLUMNS,
        fill_value=0
    )

    # Handle invalid values
    flow = flow.replace(
        [np.inf, -np.inf],
        np.nan
    )

    flow = flow.fillna(0)

    # -----------------------------------------------------
    # Random Forest
    # -----------------------------------------------------

    attack_probability = rf_model.predict_proba(
        flow
    )[:, 1][0]

    prediction = rf_model.predict(
        flow
    )[0]

    # -----------------------------------------------------
    # Isolation Forest
    # -----------------------------------------------------

    isolation_prediction = isolation_model.predict(
        flow
    )[0]

    anomaly_flag = (
        1
        if isolation_prediction == -1
        else 0
    )

    # -----------------------------------------------------
    # Risk score
    # -----------------------------------------------------

    attack_score = attack_probability * 100

    risk_score = (
        0.70 * attack_score
        +
        0.30 * (anomaly_flag * 100)
    )

    risk_score = float(
        np.clip(
            risk_score,
            0,
            100
        )
    )

    risk_level = get_risk_level(
        risk_score
    )

    # -----------------------------------------------------
    # Final result
    # -----------------------------------------------------

    result = {
        "prediction": (
            "ATTACK"
            if prediction == 1
            else "BENIGN"
        ),

        "attack_probability": round(
            attack_probability * 100,
            2
        ),

        "anomaly": (
            "YES"
            if anomaly_flag == 1
            else "NO"
        ),

        "risk_score": round(
            risk_score,
            2
        ),

        "risk_level": risk_level
    }

    return result