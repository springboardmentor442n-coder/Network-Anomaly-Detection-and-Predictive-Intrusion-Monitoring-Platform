
from pathlib import Path
from typing import Any
from io import BytesIO
import json

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# ============================================================
# 1. PATHS AND MODEL FILES
# ============================================================

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"

MODEL_FILE = ARTIFACTS / "unsw_nb15_multiclass_xgboost_model.joblib"
FEATURE_FILE = ARTIFACTS / "unsw_nb15_multiclass_features.joblib"
ENCODERS_FILE = ARTIFACTS / "unsw_nb15_multiclass_feature_encoders.joblib"
TARGET_FILE = ARTIFACTS / "unsw_nb15_multiclass_target_encoder.joblib"


# ============================================================
# 2. FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="NetShield AI API",
    version="2.0.0",
    description="UNSW-NB15 network attack prediction and CSV risk analysis API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# 3. LOAD TRAINED MODEL AND ENCODERS
# ============================================================

model = None
feature_columns = []
feature_encoders = {}
target_encoder = None
model_load_error = None

try:
    required_files = [
        MODEL_FILE,
        FEATURE_FILE,
        ENCODERS_FILE,
        TARGET_FILE,
    ]

    missing_files = [
        str(path) for path in required_files
        if not path.is_file()
    ]

    if missing_files:
        raise FileNotFoundError(
            "Missing model artifacts: " + ", ".join(missing_files)
        )

    model = joblib.load(MODEL_FILE)
    feature_columns = list(joblib.load(FEATURE_FILE))
    feature_encoders = joblib.load(ENCODERS_FILE)
    target_encoder = joblib.load(TARGET_FILE)

    if not feature_columns:
        raise ValueError("The saved feature list is empty.")

    print("NetShield AI model loaded successfully.")
    print("Model:", MODEL_FILE.name)
    print("Expected feature count:", len(feature_columns))
    print("Attack classes:", list(target_encoder.classes_))

except Exception as exc:
    model = None
    model_load_error = f"{type(exc).__name__}: {exc}"
    print("MODEL LOADING FAILED:", model_load_error)


# ============================================================
# 4. DEMO ALERTS
# ============================================================

SEED_ALERTS = [
    {
        "id": "NS-1048",
        "time": "10:18:42",
        "source": "192.168.1.24",
        "destination": "10.0.0.8:443",
        "type": "DDoS",
        "score": 94,
        "level": "CRITICAL",
        "status": "Open",
    },
    {
        "id": "NS-1047",
        "time": "10:18:31",
        "source": "172.16.0.19",
        "destination": "10.0.0.12:22",
        "type": "Brute Force",
        "score": 82,
        "level": "CRITICAL",
        "status": "Investigating",
    },
]

alerts = [dict(item) for item in SEED_ALERTS]


# ============================================================
# 5. REQUEST MODEL
# ============================================================

class PredictRequest(BaseModel):
    features: dict[str, Any] = Field(
        ...,
        description="One network flow using the saved training feature names",
    )
    model: str = "XGBoost"


# ============================================================
# 6. MODEL CHECK
# ============================================================

def require_model():
    if model is None:
        raise HTTPException(
            status_code=503,
            detail=f"XGBoost model is not loaded: {model_load_error}",
        )


# ============================================================
# 7. PREPARE CSV FEATURES
# ============================================================

def prepare_features(frame: pd.DataFrame) -> pd.DataFrame:
    require_model()

    frame = frame.copy()
    frame.columns = [
        str(col).strip().lstrip("\ufeff")
        for col in frame.columns
    ]

    # Never use ground-truth labels as model inputs.
    frame = frame.drop(
        columns=["attack_cat", "label", "id"],
        errors="ignore",
    )

    missing = [
        col for col in feature_columns
        if col not in frame.columns
    ]

    if missing:
        raise HTTPException(
            status_code=422,
            detail={
                "message": (
                    "This CSV does not contain all the features "
                    "expected by the trained UNSW-NB15 model."
                ),
                "missing_features": missing,
                "required_feature_count": len(feature_columns),
                "provided_column_count": len(frame.columns),
                "hint": (
                    "Upload an UNSW-NB15 CSV compatible with the "
                    "features used when training this model."
                ),
            },
        )

    # Keep the exact training feature order.
    frame = frame.reindex(columns=feature_columns)

    # Apply the categorical encoders saved during training.
    for col, encoder in feature_encoders.items():
        if col not in frame.columns:
            continue

        mapping = {
            str(value): index
            for index, value in enumerate(encoder.classes_)
        }

        values = frame[col].astype("string").fillna("")
        frame[col] = values.map(mapping).fillna(-1)

    # Convert features to numbers and handle invalid values.
    for col in frame.columns:
        frame[col] = pd.to_numeric(
            frame[col],
            errors="coerce",
        )

    frame = frame.replace(
        [np.inf, -np.inf],
        np.nan,
    ).fillna(0)

    return frame.astype(float)


# ============================================================
# 8. PREDICTION AND RISK ANALYTICS
# ============================================================

def score_frame(frame: pd.DataFrame) -> dict:
    require_model()

    if frame.empty:
        raise HTTPException(
            status_code=422,
            detail="The CSV has no data rows.",
        )

    X = prepare_features(frame)

    # Predict encoded class IDs.
    raw_predictions = np.asarray(
        model.predict(X)
    ).reshape(-1)

    # Convert class IDs back to readable attack names.
    if np.issubdtype(raw_predictions.dtype, np.number):
        predicted_ids = raw_predictions.astype(int)
        predicted_labels = target_encoder.inverse_transform(
            predicted_ids
        )
    else:
        predicted_labels = raw_predictions.astype(str)

    predicted_labels = [
        str(value) for value in predicted_labels
    ]

    # Calculate prediction probabilities.
    if not hasattr(model, "predict_proba"):
        raise HTTPException(
            status_code=500,
            detail=(
                "The saved model does not support predict_proba. "
                "Use the probability-enabled trained model."
            ),
        )

    probabilities = model.predict_proba(X)
    classes = [
        str(value) for value in target_encoder.classes_
    ]

    normal_index = next(
        (
            i for i, name in enumerate(classes)
            if name.strip().lower() in {"normal", "benign"}
        ),
        None,
    )

    if normal_index is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "The saved target encoder has no Normal or BENIGN "
                "class. Check the model's training labels."
            ),
        )

    normal_probabilities = probabilities[:, normal_index]
    confidence_values = probabilities.max(axis=1)

    # Risk score = estimated probability of attack traffic.
    risk_scores = np.rint(
        (1.0 - normal_probabilities) * 100
    ).astype(int)

    risk_scores = np.clip(risk_scores, 0, 100)

    def risk_level(score):
        if score <= 25:
            return "LOW"
        if score <= 50:
            return "MEDIUM"
        if score <= 75:
            return "HIGH"
        return "CRITICAL"

    risk_levels = [
        risk_level(int(score))
        for score in risk_scores
    ]

    predictions_series = pd.Series(predicted_labels)

    # Attack-category counts across all rows.
    class_counts = {
        str(name): int(count)
        for name, count
        in predictions_series.value_counts().items()
    }

    # Risk-level counts across all rows.
    risk_counts = {
        level: int(risk_levels.count(level))
        for level in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    }

    normal_count = sum(
        1 for name in predicted_labels
        if name.strip().lower() in {"normal", "benign"}
    )

    total = len(frame)
    attack_count = total - normal_count

    # Return up to 1,000 detailed rows for the frontend.
    display_limit = 1000
    results = []

    for i in range(min(total, display_limit)):
        results.append({
            "row": i + 1,
            "prediction": predicted_labels[i],
            "predicted_class": predicted_labels[i],
            "confidence": round(
                float(confidence_values[i]), 4
            ),
            "risk_score": int(risk_scores[i]),
            "risk_level": risk_levels[i],
        })

    average_risk = round(
        float(risk_scores.mean()), 2
    )

    # Provide both naming styles for frontend compatibility.
    return {
        "success": True,
        "model": "UNSW-NB15 Multiclass XGBoost",
        "total_records": total,
        "total_rows_scanned": total,
        "normal_records": normal_count,
        "normal_rows": normal_count,
        "attack_records": attack_count,
        "suspicious_rows": attack_count,
        "average_risk_score": average_risk,
        "maximum_risk_score": int(risk_scores.max()),
        "class_counts": class_counts,
        "attack_distribution": class_counts,
        "risk_counts": risk_counts,
        "risk_distribution": risk_counts,
        "returned_records": len(results),
        "results_returned": len(results),
        "truncated": total > display_limit,
        "results_truncated": total > display_limit,
        "results": results,
        "risk_formula": (
            "(1 - predicted Normal probability) * 100"
        ),
    }


# ============================================================
# 9. HOME AND HEALTH
# ============================================================

@app.get("/")
def root():
    return {
        "message": "NetShield AI API is running",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health():
    loaded = model is not None

    return {
        "status": "healthy" if loaded else "degraded",
        "service": "NetShield AI API",
        "models": {
            "RandomForest": False,
            "ExtraTrees": False,
            "XGBoost": loaded,
        },
        "configured_model_count": 1 if loaded else 0,
        "model_name": MODEL_FILE.name,
        "feature_count": len(feature_columns),
        "alerts_store": "in-memory demo store",
        "model_error": model_load_error,
    }


# ============================================================
# 10. ALERT MANAGEMENT
# ============================================================

@app.get("/api/alerts")
def get_alerts():
    return alerts


@app.patch("/api/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str):
    for item in alerts:
        if item["id"] == alert_id:
            item["status"] = "Resolved"
            return item

    raise HTTPException(
        status_code=404,
        detail="Alert not found",
    )


# ============================================================
# 11. SINGLE-ROW PREDICTION
# ============================================================

@app.post("/api/predict")
def predict(req: PredictRequest):
    if req.model != "XGBoost":
        raise HTTPException(
            status_code=400,
            detail="This setup has the trained XGBoost model only.",
        )

    output = score_frame(
        pd.DataFrame([req.features])
    )

    return {
        "model": output["model"],
        **output["results"][0],
    }


# ============================================================
# 12. CSV UPLOAD AND DETECTION
# All four URLs call the same CSV prediction function.
# ============================================================

@app.post("/api/scan-csv")
@app.post("/api/predict-csv")
@app.post("/api/upload-csv")
@app.post("/api/predict/upload")
async def predict_csv(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a .csv file.",
        )

    try:
        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="The uploaded CSV is empty.",
            )

        frame = pd.read_csv(BytesIO(content))

        if frame.empty:
            raise HTTPException(
                status_code=422,
                detail="The CSV contains no data rows.",
            )

        output = score_frame(frame)
        output["filename"] = file.filename

        return output

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=(
                f"CSV prediction failed: "
                f"{type(exc).__name__}: {exc}"
            ),
        )

    finally:
        await file.close()
