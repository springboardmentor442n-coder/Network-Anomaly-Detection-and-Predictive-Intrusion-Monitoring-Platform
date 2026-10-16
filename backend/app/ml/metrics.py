"""Pure, dependency-light metric computations.

Kept free of scikit-learn so the numbers can be unit-tested directly and so the
"undefined metric" cases (zero denominator) are handled explicitly instead of
being silently reported as 0.
"""

from __future__ import annotations

import math
from typing import Any, Iterable, Sequence

import numpy as np


def _safe_div(numerator: float, denominator: float) -> float | None:
    if denominator == 0:
        return None
    value = numerator / denominator
    if math.isnan(value) or math.isinf(value):
        return None
    return float(value)


def _mean(values: Iterable[float | None]) -> float | None:
    present = [v for v in values if v is not None]
    if not present:
        return None
    return float(sum(present) / len(present))


def build_labels(classes: Sequence[Any], observed: Sequence[Any]) -> list[Any]:
    """Model classes first (stable prediction order), then any unseen test classes."""
    labels: list[Any] = []
    for value in list(classes) + list(observed):
        key = _key(value)
        if all(_key(existing) != key for existing in labels):
            labels.append(value)
    return labels


def _key(value: Any) -> str:
    return str(value).strip()


def confusion_matrix(y_true: Sequence[Any], y_pred: Sequence[Any], labels: Sequence[Any]) -> np.ndarray:
    index = {_key(label): position for position, label in enumerate(labels)}
    matrix = np.zeros((len(labels), len(labels)), dtype=int)
    for true_value, pred_value in zip(y_true, y_pred):
        true_position = index.get(_key(true_value))
        pred_position = index.get(_key(pred_value))
        if true_position is None or pred_position is None:
            continue
        matrix[true_position, pred_position] += 1
    return matrix


def classification_metrics(matrix: np.ndarray, labels: Sequence[Any]) -> dict:
    """Derive accuracy, per-class and averaged metrics from a confusion matrix.

    For multiclass problems the false-positive / false-negative rates are the
    macro (unweighted) average of the one-vs-rest rates for every class. Classes
    whose one-vs-rest denominator is zero contribute ``None`` and are excluded
    from the average, so an undefined rate is never reported as ``0``.
    """
    total = int(matrix.sum())
    correct = int(np.trace(matrix))
    accuracy = _safe_div(correct, total)

    per_class: list[dict] = []
    for position, label in enumerate(labels):
        true_positive = int(matrix[position, position])
        false_positive = int(matrix[:, position].sum() - true_positive)
        false_negative = int(matrix[position, :].sum() - true_positive)
        true_negative = int(total - true_positive - false_positive - false_negative)
        support = int(matrix[position, :].sum())

        precision = _safe_div(true_positive, true_positive + false_positive)
        recall = _safe_div(true_positive, true_positive + false_negative)
        if precision is None or recall is None:
            f1 = None
        elif precision + recall == 0:
            f1 = 0.0
        else:
            f1 = 2 * precision * recall / (precision + recall)

        per_class.append(
            {
                "label": str(label),
                "support": support,
                "truePositive": true_positive,
                "falsePositive": false_positive,
                "falseNegative": false_negative,
                "trueNegative": true_negative,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "falsePositiveRate": _safe_div(false_positive, false_positive + true_negative),
                "falseNegativeRate": _safe_div(false_negative, false_negative + true_positive),
            }
        )

    total_support = sum(item["support"] for item in per_class)
    precision_values = [item["precision"] for item in per_class]
    recall_values = [item["recall"] for item in per_class]
    f1_values = [item["f1"] for item in per_class]

    weighted_precision = _safe_div(
        sum(item["precision"] * item["support"] for item in per_class if item["precision"] is not None),
        sum(item["support"] for item in per_class if item["precision"] is not None),
    )
    weighted_recall = _safe_div(
        sum(item["recall"] * item["support"] for item in per_class if item["recall"] is not None),
        sum(item["support"] for item in per_class if item["recall"] is not None),
    )
    weighted_f1 = _safe_div(
        sum(item["f1"] * item["support"] for item in per_class if item["f1"] is not None),
        sum(item["support"] for item in per_class if item["f1"] is not None),
    )

    return {
        "labels": [str(label) for label in labels],
        "matrix": matrix.tolist(),
        "total": total,
        "correct": correct,
        "accuracy": accuracy,
        "macroPrecision": _mean(precision_values),
        "macroRecall": _mean(recall_values),
        "macroF1": _mean(f1_values),
        "weightedPrecision": weighted_precision,
        "weightedRecall": weighted_recall,
        "weightedF1": weighted_f1,
        "macroFalsePositiveRate": _mean(item["falsePositiveRate"] for item in per_class),
        "macroFalseNegativeRate": _mean(item["falseNegativeRate"] for item in per_class),
        "perClass": per_class,
        "support": total_support,
    }


def binary_metrics(matrix: np.ndarray, labels: Sequence[Any], positive_index: int = 1) -> dict:
    """Binary view of a two-class confusion matrix (positive class at ``positive_index``)."""
    if matrix.shape[0] != 2:
        return {}
    position = positive_index if matrix.shape[0] > positive_index else 1
    true_positive = int(matrix[position, position])
    false_positive = int(matrix[:, position].sum() - true_positive)
    false_negative = int(matrix[position, :].sum() - true_positive)
    true_negative = int(matrix.sum() - true_positive - false_positive - false_negative)

    precision = _safe_div(true_positive, true_positive + false_positive)
    recall = _safe_div(true_positive, true_positive + false_negative)
    if precision is None or recall is None:
        f1 = None
    elif precision + recall == 0:
        f1 = 0.0
    else:
        f1 = 2 * precision * recall / (precision + recall)

    return {
        "positiveClass": str(labels[position]),
        "negativeClass": str(labels[1 - position]),
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "accuracy": _safe_div(true_positive + true_negative, matrix.sum()),
        "falsePositiveRate": _safe_div(false_positive, false_positive + true_negative),
        "falseNegativeRate": _safe_div(false_negative, false_negative + true_positive),
        "truePositive": true_positive,
        "falsePositive": false_positive,
        "falseNegative": false_negative,
        "trueNegative": true_negative,
    }


def to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        as_float = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(as_float) or math.isinf(as_float):
        return None
    return as_float
