from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np


# Load ML model and preprocessing files
model = joblib.load("../model/random_forest_model.pkl")
encoder = joblib.load("../model/onehot_encoder.pkl")
feature_info = joblib.load("../model/feature_info.pkl")

print("ML model, encoder, and feature information loaded successfully!")


# Create FastAPI app
app = FastAPI(title="ThreatRadar")


# Severity mapping
severity = {
    "Normal": 0,
    "Generic": 30,
    "Exploits": 60,
    "Fuzzers": 50,
    "DoS": 90,
    "Reconnaissance": 30,
    "Analysis": 40,
    "Backdoor": 80,
    "Shellcode": 80,
    "Worms": 90
}


# Home endpoint
@app.get("/")
def home():
    return {"message": "ThreatRadar API is running"}


# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Request format
class PredictionRequest(BaseModel):
    features: dict


# Prediction endpoint
@app.post("/predict")
def predict(request: PredictionRequest):

    input_data = pd.DataFrame([request.features])

    # Get feature information
    numeric_cols = feature_info["numeric_cols"]
    categorical_cols = feature_info["categorical_cols"]

    # Encode categorical features
    input_cat = encoder.transform(input_data[categorical_cols])

    # Numerical features
    input_num = input_data[numeric_cols].to_numpy()

    # Combine numerical + categorical features
    input_final = np.hstack([input_num, input_cat])

    # Prediction
    prediction = model.predict(input_final)[0]

    # Confidence
    probabilities = model.predict_proba(input_final)[0]
    confidence = float(probabilities.max())

    # Risk score
    risk_score = severity[prediction] * confidence

    # Risk level
    if risk_score <= 25:
        risk_level = "Low"
    elif risk_score <= 50:
        risk_level = "Medium"
    elif risk_score <= 75:
        risk_level = "High"
    else:
        risk_level = "Critical"

    # API response
    return {
        "prediction": prediction,
        "confidence": round(confidence, 4),
        "risk_score": round(risk_score, 2),
        "risk_level": risk_level
    }