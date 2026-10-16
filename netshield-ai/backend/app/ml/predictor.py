"""
NETSHIELD AI - ML Predictor
Loads saved model and runs predictions on preprocessed data.
"""
import os
import logging
import joblib
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from app.core.config import settings
from app.ml.preprocessing import preprocess_chunk_for_prediction

logger = logging.getLogger(__name__)


class ModelPredictor:
    """Encapsulates a trained CICIDS2017 model for prediction."""

    def __init__(self, model_run_id: str, model_path: str, pipeline_path: str, encoder_path: str, feature_names: List[str]):
        self.model_run_id = model_run_id
        self.clf = joblib.load(model_path)
        self.preprocessing_pipeline = joblib.load(pipeline_path)
        self.label_encoder = joblib.load(encoder_path)
        self.feature_names = feature_names
        self.class_names = list(self.label_encoder.classes_)
        logger.info(f"ModelPredictor loaded: {model_run_id}, classes={self.class_names}")

    def predict_row(self, features: Dict) -> Dict:
        """Predict a single row from a feature dict."""
        df = pd.DataFrame([features])
        return self.predict_chunk(df)[0] if self.predict_chunk(df) else {}

    def predict_chunk(self, chunk: pd.DataFrame) -> List[Dict]:
        """Predict a DataFrame chunk, return list of prediction dicts."""
        X = preprocess_chunk_for_prediction(
            chunk, self.feature_names, self.preprocessing_pipeline
        )
        if X is None or len(X) == 0:
            return []

        predictions = self.clf.predict(X)
        probas = self.clf.predict_proba(X)

        results = []
        for i, (pred, proba) in enumerate(zip(predictions, probas)):
            predicted_class = self.label_encoder.inverse_transform([pred])[0]
            confidence = float(np.max(proba))
            results.append({
                "predicted_class": predicted_class,
                "confidence": confidence,
                "class_probabilities": {
                    cls: float(p)
                    for cls, p in zip(self.class_names, proba)
                },
            })

        return results


# ─── Global model registry ───────────────────────────────────────────────────

_active_predictor: Optional[ModelPredictor] = None


def get_active_predictor() -> Optional[ModelPredictor]:
    return _active_predictor


def load_predictor(model_run_id: str, model_path: str, pipeline_path: str, encoder_path: str, feature_names: List[str]) -> ModelPredictor:
    global _active_predictor
    _active_predictor = ModelPredictor(model_run_id, model_path, pipeline_path, encoder_path, feature_names)
    return _active_predictor


def clear_predictor():
    global _active_predictor
    _active_predictor = None
