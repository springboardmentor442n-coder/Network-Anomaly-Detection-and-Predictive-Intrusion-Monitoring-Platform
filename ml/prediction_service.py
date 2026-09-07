import os
import numpy as np
import pandas as pd
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --------------------------------------------------
# Load binary attack detection model
# --------------------------------------------------

RF_MODEL_PATH = os.path.join(
    BASE_DIR, "models", "random_forest_baseline.joblib"
)

ISOLATION_MODEL_PATH = os.path.join(
    BASE_DIR, "models", "isolation_forest_anomaly.joblib"
)

rf_model = joblib.load(RF_MODEL_PATH)
isolation_model = joblib.load(ISOLATION_MODEL_PATH)


# --------------------------------------------------
# Load attack-type classification model
# --------------------------------------------------

ATTACK_TYPE_MODEL_PATH = os.path.join(
    BASE_DIR, "models", "attack_type_random_forest.joblib"
)

ATTACK_TYPE_ENCODER_PATH = os.path.join(
    BASE_DIR, "models", "attack_type_label_encoder.joblib"
)

attack_type_model = joblib.load(ATTACK_TYPE_MODEL_PATH)
attack_type_encoder = joblib.load(ATTACK_TYPE_ENCODER_PATH)


# --------------------------------------------------
# Load feature structure
# --------------------------------------------------

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


# --------------------------------------------------
# Risk level calculation
# --------------------------------------------------

def get_risk_level(score):

    if score < 25:
        return "LOW"

    elif score < 50:
        return "MEDIUM"

    elif score < 75:
        return "HIGH"

    else:
        return "CRITICAL"


# --------------------------------------------------
# Network flow prediction
# --------------------------------------------------

def predict_network_flow(flow_data):

    # Convert input into DataFrame
    if isinstance(flow_data, dict):

        flow_data = pd.DataFrame([flow_data])

    elif isinstance(flow_data, pd.Series):

        flow_data = flow_data.to_frame().T


    # Copy input
    flow = flow_data.copy()


    # Remove unnecessary columns
    flow = flow.drop(
        columns=columns_to_drop,
        errors="ignore"
    )


    # Make sure feature order matches training data
    flow = flow.reindex(
        columns=FEATURE_COLUMNS,
        fill_value=0
    )


    # Clean invalid values
    flow = flow.replace(
        [np.inf, -np.inf],
        np.nan
    )

    flow = flow.fillna(0)


    # --------------------------------------------------
    # Binary attack detection
    # --------------------------------------------------

    attack_probability = rf_model.predict_proba(flow)[:, 1][0]

    prediction = rf_model.predict(flow)[0]


    # --------------------------------------------------
    # Anomaly detection
    # --------------------------------------------------

    isolation_prediction = isolation_model.predict(flow)[0]

    anomaly_flag = (
        1 if isolation_prediction == -1 else 0
    )


    # --------------------------------------------------
    # Risk score
    # --------------------------------------------------

    attack_score = attack_probability * 100

    risk_score = (
        0.70 * attack_score
        + 0.30 * (anomaly_flag * 100)
    )

    risk_score = float(
        np.clip(risk_score, 0, 100)
    )

    risk_level = get_risk_level(risk_score)


    # --------------------------------------------------
    # Attack-type classification
    # --------------------------------------------------

    if prediction == 1:

        attack_type_prediction = (
            attack_type_model.predict(flow)[0]
        )

        attack_type = (
            attack_type_encoder
            .inverse_transform(
                [attack_type_prediction]
            )[0]
        )

        attack_type_probabilities = (
            attack_type_model
            .predict_proba(flow)[0]
        )

        attack_type_confidence = (
            float(
                np.max(
                    attack_type_probabilities
                )
            ) * 100
        )

    else:

        attack_type = "BENIGN"
        attack_type_confidence = None


    # --------------------------------------------------
    # Final prediction result
    # --------------------------------------------------

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

        "attack_type": attack_type,

        "attack_type_confidence": (
            round(
                attack_type_confidence,
                2
            )
            if attack_type_confidence is not None
            else None
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