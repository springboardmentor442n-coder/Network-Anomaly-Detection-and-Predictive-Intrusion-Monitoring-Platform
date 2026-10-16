"""XGBoost multi-class classifier + Isolation Forest anomaly score + risk scoring, applied per CSV chunk."""
import os
from datetime import datetime
import joblib
import numpy as np
import pandas as pd
from .risk import RiskEngine

MODEL_DIR = os.getenv("MODEL_DIR", os.path.join(os.path.dirname(__file__), "..", "models"))
LABEL_COLS = ["Attack Type", "Label"]
NORMAL_NAMES = {"normal traffic", "benign", "normal"}

class Pipeline:
    def __init__(self, model_dir=MODEL_DIR):
        j = lambda n: joblib.load(os.path.join(model_dir, n))
        self.model = j("xgboost_model.joblib")
        self.scaler = j("scaler.joblib")
        self.features = j("features.joblib")
        self.classes = j("classes.joblib")          # class names, index == model output index
        p = os.path.join(model_dir, "isolation_forest.joblib")
        self.iso = joblib.load(p) if os.path.exists(p) else None
        self.risk = RiskEngine()
        self.rng = np.random.default_rng()
        self.attackers = [f"203.0.113.{i}" for i in range(10, 18)]
        self.hosts = [f"192.168.1.{i}" for i in range(2, 120)]
        self.servers = [f"10.0.0.{i}" for i in range(5, 10)]

    def process_chunk(self, df: pd.DataFrame) -> list[dict]:
        df = df.copy()
        df.columns = df.columns.str.strip()
        n = len(df)
        label_col = next((c for c in LABEL_COLS if c in df.columns), None)
        actual = df[label_col].astype(str).values if label_col else np.array(["Unknown"] * n)

        X = df.reindex(columns=self.features, fill_value=0).apply(pd.to_numeric, errors="coerce")
        X = X.replace([np.inf, -np.inf], np.nan).fillna(0).values
        Xs = self.scaler.transform(X)

        probs = self.model.predict_proba(Xs)
        idx, conf = probs.argmax(axis=1), probs.max(axis=1)
        if self.iso is not None:   # decision_function < 0 means anomalous; normal flows map to ~0
            anom = np.clip(-self.iso.decision_function(Xs) * 200, 0, 100)
        else:
            anom = np.zeros(n)

        has_src, has_dst = "Source IP" in df.columns, "Destination IP" in df.columns
        out = []
        for i in range(n):
            cls = str(self.classes[idx[i]])
            is_normal = cls.lower() in NORMAL_NAMES
            if is_normal:
                cls = "BENIGN"
            src = str(df["Source IP"].iat[i]) if has_src else str(
                self.rng.choice(self.hosts) if is_normal else self.rng.choice(self.attackers))
            dst = str(df["Destination IP"].iat[i]) if has_dst else str(self.rng.choice(self.servers))
            r = self.risk.compute_risk_score(cls, float(conf[i]), float(anom[i]), src)
            out.append({
                "source_ip": src, "destination_ip": dst, "predicted_class": cls,
                "actual_label": str(actual[i]), "confidence": round(float(conf[i]), 4),
                "anomaly_score": round(float(anom[i]), 2), **r,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            })
        return out
