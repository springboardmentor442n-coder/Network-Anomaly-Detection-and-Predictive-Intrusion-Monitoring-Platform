"""Model training: fit a scikit-learn pipeline and persist it with joblib."""

from __future__ import annotations

import time
from collections import Counter
from typing import Any, Callable

import joblib
import numpy as np
import pandas as pd

from ..config import ALGORITHM_LABELS, RANDOM_STATE, TARGET_LABELS
from ..store import (
    get_dataset,
    get_dataset_path,
    model_artifact_path,
    new_id,
    now_iso,
    save_model_metadata,
    set_active_model,
)
from .dataset import json_safe
from .metrics import build_labels, classification_metrics, confusion_matrix
from .pipeline import HYPERPARAMETERS, build_pipeline
from .schema_utils import (
    DataValidationError,
    assert_target_present,
    build_feature_matrix,
    classify_columns,
    feature_columns,
    normalize_target,
    read_csv,
)
from .targets import display_classes

ProgressFn = Callable[[int, str], None]


def _emit(progress: ProgressFn | None, percent: int, message: str) -> None:
    if progress:
        progress(percent, message)


def load_artifact(model_id: str) -> dict[str, Any]:
    path = model_artifact_path(model_id)
    if not path.exists():
        raise FileNotFoundError(f"Model artefact for '{model_id}' is missing.")
    return joblib.load(path)


def prepare_features(df: pd.DataFrame, artifact: dict) -> pd.DataFrame:
    """Align ``df`` to the exact feature schema the model was trained on."""
    features = artifact["featureColumns"]
    numeric = artifact.get("numericColumns", [])
    return build_feature_matrix(df, features, numeric)


def train_model(
    dataset_id: str,
    target: str,
    algorithm: str,
    *,
    progress: ProgressFn | None = None,
    sample_limit: int | None = None,
    random_state: int = RANDOM_STATE,
) -> dict:
    """Fit and persist a model. Returns the stored metadata dictionary."""
    started = time.time()
    _emit(progress, 4, "Resolving training dataset")

    meta = get_dataset(dataset_id)
    path = get_dataset_path(dataset_id)
    if not meta or not path:
        raise DataValidationError("The selected training dataset is not available. Re-upload it.")

    _emit(progress, 12, f"Reading {meta['filename']}")
    frame = read_csv(path)
    assert_target_present(frame, target)

    _emit(progress, 22, "Cleaning target column")
    frame = frame.copy()
    frame[target] = normalize_target(frame[target])
    before = len(frame)
    frame = frame[frame[target].notna()]
    dropped_missing_target = before - len(frame)

    if frame.empty:
        raise DataValidationError("Every row is missing the target value, nothing to train on.")

    if sample_limit and len(frame) > sample_limit:
        frame = frame.sample(n=int(sample_limit), random_state=random_state).reset_index(drop=True)

    class_counts = Counter(str(v) for v in frame[target])
    if len(class_counts) < 2:
        raise DataValidationError(
            "The training dataset contains only one class, a classifier cannot be fitted.",
            details=[f"Only class present: {next(iter(class_counts))}"],
        )

    _emit(progress, 32, "Selecting features")
    features = feature_columns(frame, target)
    if not features:
        raise DataValidationError("No usable feature columns remained after excluding id/target columns.")

    matrix_frame = frame[features]
    numeric_columns, categorical_columns = classify_columns(matrix_frame)
    # ``classify_columns`` returns strings; make sure every name exists as a column.
    numeric_columns = [c for c in numeric_columns if c in matrix_frame.columns]
    categorical_columns = [c for c in categorical_columns if c in matrix_frame.columns]

    X = build_feature_matrix(frame, features, numeric_columns)
    y = frame[target].to_numpy()

    _emit(progress, 45, f"Fitting {ALGORITHM_LABELS[algorithm]}")
    pipeline = build_pipeline(numeric_columns, categorical_columns, algorithm, random_state)
    pipeline.fit(X, y)

    _emit(progress, 78, "Scoring the training fit")
    train_predictions = pipeline.predict(X)
    labels = build_labels(pipeline.classes_, pd.unique(y))
    matrix = confusion_matrix(y, train_predictions, labels)
    train_metrics = classification_metrics(matrix, labels)

    model_id = new_id("mdl")
    artifact = {
        "pipeline": pipeline,
        "featureColumns": features,
        "numericColumns": numeric_columns,
        "categoricalColumns": categorical_columns,
        "target": target,
        "algorithm": algorithm,
        "classes": [json_safe(c) for c in pipeline.classes_],
        "randomState": random_state,
        "trainedAt": now_iso(),
    }

    _emit(progress, 88, "Persisting model and preprocessing pipeline")
    joblib.dump(artifact, model_artifact_path(model_id))

    classes = [json_safe(c) for c in pipeline.classes_]
    metadata = {
        "id": model_id,
        "algorithm": algorithm,
        "algorithmLabel": ALGORITHM_LABELS[algorithm],
        "target": target,
        "targetLabel": TARGET_LABELS.get(target, target),
        "datasetName": meta["filename"],
        "datasetIsSample": bool(meta.get("isSample", False)),
        "trainedAt": artifact["trainedAt"],
        "trainingRows": int(len(frame)),
        "rowsDroppedMissingTarget": int(dropped_missing_target),
        "featureColumns": features,
        "numericColumns": numeric_columns,
        "categoricalColumns": categorical_columns,
        "classes": classes,
        "displayClasses": display_classes(target, classes),
        "classDistribution": [
            {
                "name": display_classes(target, [name])[0],
                "rawValue": name,
                "value": int(count),
            }
            for name, count in sorted(class_counts.items(), key=lambda kv: -kv[1])
        ],
        "classLabelsUsedForScoring": [str(label) for label in labels],
        "trainFitMetrics": train_metrics,
        # NOTE: these are resubstitution metrics (the model scored the same rows
        # it was fitted on). They are NOT generalisation metrics - use the Model
        # Evaluation page with the held-out testing set for that.
        "trainFitMetricsNote": (
            "Resubstitution metrics computed on the training rows themselves. "
            "Report generalisation performance from Model Evaluation instead."
        ),
        "hyperparameters": HYPERPARAMETERS[algorithm],
        "randomState": random_state,
        "durationSeconds": round(time.time() - started, 2),
        "artifact": "joblib (preprocessing pipeline + estimator)",
        "sampleLimit": sample_limit,
        "library": {"scikit-learn": _sklearn_version(), "pandas": pd.__version__, "numpy": np.__version__},
    }

    save_model_metadata(metadata)
    set_active_model(model_id)
    if train_metrics["accuracy"] is None:
        metadata["warning"] = "Accuracy could not be computed on the training fit."
    _emit(progress, 100, "Training complete")
    return metadata


def _sklearn_version() -> str:
    try:
        import sklearn

        return sklearn.__version__
    except Exception:  # pragma: no cover - sklearn is a hard dependency
        return "unknown"
