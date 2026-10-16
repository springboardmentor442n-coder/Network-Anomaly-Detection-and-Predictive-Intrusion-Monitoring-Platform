"""Model evaluation against a separate, held-out testing dataset.

The preprocessing pipeline is *loaded*, never re-fitted, so the model always
sees exactly the transformations that were learned on the training split.
"""

from __future__ import annotations

import pandas as pd

from ..config import ALGORITHM_LABELS, TARGET_LABELS
from ..store import (
    get_dataset,
    get_dataset_path,
    get_model,
    new_id,
    now_iso,
    save_evaluation,
)
from .dataset import json_safe
from .metrics import binary_metrics, build_labels, classification_metrics, confusion_matrix
from .schema_utils import DataValidationError, normalize_target, read_csv
from .targets import display_class, display_classes, positive_class_index
from .training import load_artifact, prepare_features


def _csv(value) -> str:
    if value is None:
        return ""
    text = str(value)
    if any(ch in text for ch in [",", '"', "\n"]):
        return '"' + text.replace('"', '""') + '"'
    return text


def evaluate_model(
    model_id: str,
    test_dataset_id: str,
    *,
    progress=None,
) -> dict:
    """Score ``model_id`` on ``test_dataset_id``. Returns the stored record."""

    def emit(percent: int, message: str) -> None:
        if progress:
            progress(percent, message)

    emit(5, "Loading model")
    meta = get_model(model_id)
    if not meta:
        raise DataValidationError("The requested model could not be found. Train a model first.")
    artifact = load_artifact(model_id)

    emit(15, "Loading evaluation dataset")
    dataset = get_dataset(test_dataset_id)
    path = get_dataset_path(test_dataset_id)
    if not dataset or not path:
        raise DataValidationError("The evaluation dataset is not available. Re-upload it.")

    target = meta["target"]
    frame = read_csv(path)
    if target not in frame.columns:
        raise DataValidationError(
            f"The evaluation dataset has no '{target}' column, so it cannot be scored for this model.",
            details=[f"Model target: {target}", f"Columns: {', '.join(str(c) for c in frame.columns[:20])}"],
        )

    emit(25, "Cleaning target column")
    frame = frame.copy()
    frame[target] = normalize_target(frame[target])
    rows_before = len(frame)
    frame = frame[frame[target].notna()]
    dropped = rows_before - len(frame)
    if frame.empty:
        raise DataValidationError("No rows in the evaluation dataset have a target value.")

    warnings: list[str] = []
    missing_features = [c for c in artifact["featureColumns"] if c not in frame.columns]
    if missing_features:
        warnings.append(
            "The evaluation dataset is missing "
            f"{len(missing_features)} feature column(s) used by the model "
            f"({', '.join(missing_features[:6])}{'...' if len(missing_features) > 6 else ''}). "
            "They were imputed by the fitted preprocessing pipeline."
        )
    if dropped:
        warnings.append(f"{dropped} row(s) without a target value were excluded from the evaluation.")

    emit(45, "Applying the saved preprocessing pipeline")
    X = prepare_features(frame, artifact)
    y_true = frame[target].to_numpy()

    emit(65, "Predicting on the held-out data")
    y_pred = artifact["pipeline"].predict(X)

    model_classes = list(artifact["classes"])
    labels = build_labels(model_classes, pd.unique(y_true))

    unseen = [c for c in pd.unique(y_true) if json_safe(c) not in [json_safe(m) for m in model_classes]]
    if unseen:
        warnings.append(
            "The evaluation dataset contains class value(s) the model never saw during training: "
            + ", ".join(str(u) for u in unseen)
            + ". They are included in the confusion matrix but reduce accuracy."
        )

    emit(82, "Computing metrics")
    matrix = confusion_matrix(y_true, y_pred, labels)
    metrics = classification_metrics(matrix, labels)

    positive_index = positive_class_index(target, labels)
    binary = binary_metrics(matrix, labels, positive_index) if len(labels) == 2 else {}

    display_labels = display_classes(target, labels)
    for item in metrics["perClass"]:
        item["displayLabel"] = display_class(target, item["label"])

    record = {
        "id": new_id("evl"),
        "modelId": model_id,
        "algorithm": meta["algorithm"],
        "algorithmLabel": ALGORITHM_LABELS.get(meta["algorithm"], meta["algorithm"]),
        "target": target,
        "targetLabel": TARGET_LABELS.get(target, target),
        "modelDatasetName": meta.get("datasetName"),
        "modelTrainedAt": meta.get("trainedAt"),
        "evaluationDatasetId": test_dataset_id,
        "evaluationDatasetName": dataset["filename"],
        "evaluationDatasetIsSample": bool(dataset.get("isSample", False)),
        "modelDatasetIsSample": bool(meta.get("datasetIsSample", False)),
        "evaluatedAt": now_iso(),
        "rowsEvaluated": int(len(frame)),
        "rowsDroppedMissingTarget": int(dropped),
        "labels": metrics["labels"],
        "displayLabels": display_labels,
        "confusionMatrix": metrics["matrix"],
        "accuracy": metrics["accuracy"],
        "macroPrecision": metrics["macroPrecision"],
        "macroRecall": metrics["macroRecall"],
        "macroF1": metrics["macroF1"],
        "weightedPrecision": metrics["weightedPrecision"],
        "weightedRecall": metrics["weightedRecall"],
        "weightedF1": metrics["weightedF1"],
        "macroFalsePositiveRate": metrics["macroFalsePositiveRate"],
        "macroFalseNegativeRate": metrics["macroFalseNegativeRate"],
        "perClass": metrics["perClass"],
        "binary": binary,
        "support": metrics["support"],
        "correct": metrics["correct"],
        "warnings": warnings,
        "isMulticlass": len(labels) > 2,
        "fprFnrExplanation": (
            "False-positive and false-negative rates are computed one-vs-rest for every class "
            "and then averaged (macro). A class with a zero-sized denominator is reported as "
            "'undefined' and excluded from the average rather than being shown as 0."
            if len(labels) > 2
            else "Binary false-positive rate = FP / (FP + TN); false-negative rate = FN / (FN + TP)."
        ),
    }

    save_evaluation(record)
    emit(100, "Evaluation complete")
    return record


def evaluation_report_csv(record: dict) -> str:
    """Report B - Model Evaluation (CSV)."""
    lines = ["section,metric,value"]
    lines.append(f"model,algorithm,{_csv(record.get('algorithmLabel'))}")
    lines.append(f"model,target,{_csv(record.get('targetLabel'))}")
    lines.append(f"model,training_dataset,{_csv(record.get('modelDatasetName'))}")
    lines.append(f"model,training_timestamp,{_csv(record.get('modelTrainedAt'))}")
    lines.append(f"model,evaluation_dataset,{_csv(record.get('evaluationDatasetName'))}")
    lines.append(f"model,evaluation_timestamp,{_csv(record.get('evaluatedAt'))}")
    lines.append(f"model,rows_evaluated,{record.get('rowsEvaluated')}")

    def fmt(value):
        return "" if value is None else f"{float(value):.6f}"

    lines.append(f"metrics,accuracy,{fmt(record.get('accuracy'))}")
    lines.append(f"metrics,precision_macro,{fmt(record.get('macroPrecision'))}")
    lines.append(f"metrics,recall_macro,{fmt(record.get('macroRecall'))}")
    lines.append(f"metrics,f1_macro,{fmt(record.get('macroF1'))}")
    lines.append(f"metrics,precision_weighted,{fmt(record.get('weightedPrecision'))}")
    lines.append(f"metrics,recall_weighted,{fmt(record.get('weightedRecall'))}")
    lines.append(f"metrics,f1_weighted,{fmt(record.get('weightedF1'))}")
    lines.append(f"metrics,false_positive_rate_macro,{fmt(record.get('macroFalsePositiveRate'))}")
    lines.append(f"metrics,false_negative_rate_macro,{fmt(record.get('macroFalseNegativeRate'))}")

    binary = record.get("binary") or {}
    if binary:
        lines.append(f"metrics,binary_positive_class,{_csv(binary.get('positiveClass'))}")
        lines.append(f"metrics,binary_precision,{fmt(binary.get('precision'))}")
        lines.append(f"metrics,binary_recall,{fmt(binary.get('recall'))}")
        lines.append(f"metrics,binary_f1,{fmt(binary.get('f1'))}")
        lines.append(f"metrics,binary_false_positive_rate,{fmt(binary.get('falsePositiveRate'))}")
        lines.append(f"metrics,binary_false_negative_rate,{fmt(binary.get('falseNegativeRate'))}")

    lines.append("")
    lines.append("per_class,class,support,precision,recall,f1,false_positive_rate,false_negative_rate")
    for item in record.get("perClass", []):
        lines.append(
            ",".join(
                [
                    "per_class",
                    _csv(item.get("displayLabel") or item.get("label")),
                    str(item.get("support")),
                    fmt(item.get("precision")),
                    fmt(item.get("recall")),
                    fmt(item.get("f1")),
                    fmt(item.get("falsePositiveRate")),
                    fmt(item.get("falseNegativeRate")),
                ]
            )
        )

    lines.append("")
    lines.append("confusion_matrix,actual\\predicted," + ",".join(record.get("displayLabels", [])))
    for label, row in zip(record.get("displayLabels", []), record.get("confusionMatrix", [])):
        lines.append("confusion_matrix," + _csv(label) + "," + ",".join(str(v) for v in row))

    return "\n".join(lines) + "\n"


def evaluation_summary(record: dict | None) -> dict | None:
    if not record:
        return None
    return {
        "id": record.get("id"),
        "algorithmLabel": record.get("algorithmLabel"),
        "targetLabel": record.get("targetLabel"),
        "evaluationDatasetName": record.get("evaluationDatasetName"),
        "evaluatedAt": record.get("evaluatedAt"),
        "accuracy": record.get("accuracy"),
        "macroF1": record.get("macroF1"),
        "macroFalsePositiveRate": record.get("macroFalsePositiveRate"),
        "macroFalseNegativeRate": record.get("macroFalseNegativeRate"),
        "rowsEvaluated": record.get("rowsEvaluated"),
        "isMulticlass": record.get("isMulticlass"),
    }
