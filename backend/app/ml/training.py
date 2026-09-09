from datetime import datetime, timezone
from pathlib import Path
import json

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from .data_loader import discover_dataset_files, find_label_column, iter_dataset_chunks
from .preprocessing import build_preprocessor, clean_frame


def load_sample(root: Path, dataset: str = "cicids2017", max_rows: int = 100_000) -> tuple[pd.DataFrame, str]:
    files = discover_dataset_files(root, dataset)
    if not files:
        raise FileNotFoundError(f"No {dataset} CSV files found under {root}")
    pieces: list[pd.DataFrame] = []
    rows = 0
    label_column = ""
    per_file = max(1, max_rows // len(files))
    for file_path in files:
        file_rows = 0
        for chunk in iter_dataset_chunks([file_path]):
            label_column = label_column or find_label_column(chunk.columns.tolist())
            chunk = clean_frame(chunk, label_column)
            sample_size = min(len(chunk), per_file - file_rows, 1_000)
            if sample_size <= 0:
                break
            chunk = chunk.sample(n=sample_size, random_state=42 + file_rows)
            pieces.append(chunk)
            rows += len(chunk)
            file_rows += len(chunk)
            if file_rows >= per_file:
                break
    frame = pd.concat(pieces, ignore_index=True).head(max_rows)
    return frame, label_column


def train_models(root: Path, model_root: Path, dataset: str = "cicids2017", max_rows: int = 100_000) -> dict:
    frame, label_column = load_sample(root, dataset, max_rows)
    x = frame.drop(columns=[label_column])
    y = frame[label_column].astype(str).str.strip()
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42, stratify=y if y.value_counts().min() >= 2 else None)
    preprocessor, _ = build_preprocessor(frame, label_column)
    classifier = Pipeline([("preprocessor", preprocessor), ("classifier", RandomForestClassifier(n_estimators=100, class_weight="balanced", random_state=42, n_jobs=-1))])
    classifier.fit(x_train, y_train)
    predictions = classifier.predict(x_test)
    labels = sorted(y.unique().tolist())
    report = classification_report(y_test, predictions, labels=labels, output_dict=True, zero_division=0)
    metrics = {
        "accuracy": accuracy_score(y_test, predictions),
        "precision_macro": precision_score(y_test, predictions, average="macro", zero_division=0),
        "recall_macro": recall_score(y_test, predictions, average="macro", zero_division=0),
        "f1_macro": f1_score(y_test, predictions, average="macro", zero_division=0),
        "f1_weighted": f1_score(y_test, predictions, average="weighted", zero_division=0),
        "classification_report": report,
        "confusion_matrix": confusion_matrix(y_test, predictions, labels=labels).tolist(),
    }
    transformed = preprocessor.fit_transform(x_train)
    anomaly = IsolationForest(n_estimators=100, contamination="auto", random_state=42, n_jobs=-1).fit(transformed)
    model_root.mkdir(parents=True, exist_ok=True)
    joblib.dump(classifier, model_root / "classifier.joblib")
    joblib.dump((preprocessor, anomaly), model_root / "anomaly.joblib")
    metadata = {"model_version": "1.0", "dataset": dataset, "trained_at": datetime.now(timezone.utc).isoformat(), "sample_rows": len(frame), "features": list(x.columns), "classes": labels, "metrics": metrics}
    (model_root / "metadata.json").write_text(json.dumps(metadata, indent=2, default=float), encoding="utf-8")
    return metadata
