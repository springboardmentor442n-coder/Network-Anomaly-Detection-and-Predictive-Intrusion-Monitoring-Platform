from pathlib import Path
import json

import joblib
import pandas as pd

from .risk import calculate_risk


class DetectionService:
    def __init__(self, model_root: Path):
        self.model_root = model_root
        self.classifier_path = model_root / "classifier.joblib"
        self.anomaly_path = model_root / "anomaly.joblib"
        self.metadata_path = model_root / "metadata.json"

    @property
    def ready(self) -> bool:
        return self.classifier_path.exists() and self.anomaly_path.exists()

    def metadata(self) -> dict:
        if not self.metadata_path.exists():
            return {"status": "not_trained"}
        return json.loads(self.metadata_path.read_text(encoding="utf-8"))

    def predict(self, features: dict) -> dict:
        if not self.ready:
            raise RuntimeError("Models are not trained. Run python -m backend.scripts.train_models first.")
        classifier = joblib.load(self.classifier_path)
        preprocessor, anomaly = joblib.load(self.anomaly_path)
        frame = pd.DataFrame([features])
        prediction = str(classifier.predict(frame)[0])
        probabilities = classifier.predict_proba(frame)[0]
        confidence = float(max(probabilities))
        classes = classifier.named_steps["classifier"].classes_
        attack_probability = float(sum(probability for label, probability in zip(classes, probabilities) if str(label).casefold() not in {"benign", "normal"}))
        is_anomaly = bool(anomaly.predict(preprocessor.transform(frame))[0] == -1)
        risk_score, severity = calculate_risk(is_anomaly, attack_probability, confidence, prediction)
        return {"prediction": prediction, "is_anomaly": is_anomaly, "confidence": confidence, "attack_probability": attack_probability, "risk_score": risk_score, "severity": severity}
