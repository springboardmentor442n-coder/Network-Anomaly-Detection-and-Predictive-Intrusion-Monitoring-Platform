"""Metric computation tests.

The numbers are checked by hand so a regression in the metric maths cannot hide
behind a passing confusion matrix.
"""

from __future__ import annotations

import pytest

from app.ml.metrics import (
    _safe_div,
    binary_metrics,
    build_labels,
    classification_metrics,
    confusion_matrix,
)


def test_confusion_matrix_counts_are_exact():
    matrix = confusion_matrix([0, 0, 1, 1], [0, 1, 1, 1], [0, 1])
    assert matrix.tolist() == [[1, 1], [0, 2]]


def test_binary_metrics_match_hand_worked_values():
    matrix = confusion_matrix([0, 0, 1, 1], [0, 1, 1, 1], [0, 1])
    metrics = classification_metrics(matrix, [0, 1])

    assert metrics["accuracy"] == pytest.approx(0.75)
    per_class = {item["label"]: item for item in metrics["perClass"]}
    assert per_class["1"]["precision"] == pytest.approx(2 / 3)
    assert per_class["1"]["recall"] == pytest.approx(1.0)
    assert per_class["1"]["f1"] == pytest.approx(0.8)
    assert per_class["1"]["falsePositiveRate"] == pytest.approx(0.5)
    assert per_class["1"]["falseNegativeRate"] == pytest.approx(0.0)

    binary = binary_metrics(matrix, [0, 1], 1)
    assert binary["positiveClass"] == "1"
    assert binary["truePositive"] == 2
    assert binary["falsePositive"] == 1
    assert binary["falseNegative"] == 0
    assert binary["trueNegative"] == 1
    assert binary["accuracy"] == pytest.approx(0.75)


def test_undefined_metrics_are_none_not_zero():
    # Class 1 never appears as either the true or the predicted label.
    matrix = confusion_matrix([0, 0], [0, 0], [0, 1])
    metrics = classification_metrics(matrix, [0, 1])
    per_class = {item["label"]: item for item in metrics["perClass"]}

    assert per_class["1"]["precision"] is None
    assert per_class["1"]["recall"] is None
    assert per_class["1"]["f1"] is None
    assert per_class["1"]["falseNegativeRate"] is None  # FN + TP == 0
    # Macro averages must skip the undefined entries instead of treating them as 0.
    assert metrics["macroPrecision"] == pytest.approx(1.0)
    assert metrics["macroRecall"] == pytest.approx(1.0)


def test_multiclass_macro_rates_are_hand_checked():
    y_true = [0, 1, 2, 0, 1, 2]
    y_pred = [0, 1, 1, 0, 2, 2]
    labels = [0, 1, 2]
    matrix = confusion_matrix(y_true, y_pred, labels)
    assert matrix.tolist() == [[2, 0, 0], [0, 1, 1], [0, 1, 1]]

    metrics = classification_metrics(matrix, labels)
    assert metrics["accuracy"] == pytest.approx(4 / 6)
    assert metrics["macroF1"] == pytest.approx((1.0 + 0.5 + 0.5) / 3)
    assert metrics["macroFalsePositiveRate"] == pytest.approx((0.0 + 0.25 + 0.25) / 3)
    assert metrics["macroFalseNegativeRate"] == pytest.approx((0.0 + 0.5 + 0.5) / 3)
    assert metrics["weightedF1"] == pytest.approx((1.0 * 2 + 0.5 * 2 + 0.5 * 2) / 6)


def test_perfect_prediction_gives_perfect_metrics():
    matrix = confusion_matrix([0, 1, 2, 0], [0, 1, 2, 0], [0, 1, 2])
    metrics = classification_metrics(matrix, [0, 1, 2])
    assert metrics["accuracy"] == 1.0
    assert metrics["macroF1"] == 1.0
    assert metrics["macroFalsePositiveRate"] == 0.0
    assert metrics["macroFalseNegativeRate"] == 0.0


def test_build_labels_prefers_model_classes_then_unseen_values():
    assert build_labels([0, 1], [1, 0]) == [0, 1]
    assert build_labels([0, 1], [1, 2]) == [0, 1, 2]


def test_build_labels_deduplicates_with_whitespace_normalisation():
    labels = build_labels(["Normal"], ["Normal ", "DoS"])
    assert labels == ["Normal", "DoS"]


def test_safe_div_returns_none_on_zero_denominator_and_nan():
    assert _safe_div(1, 0) is None
    assert _safe_div(0, 0) is None
    assert _safe_div(3, 4) == pytest.approx(0.75)
    assert _safe_div(float("nan"), 4) is None


def test_binary_metrics_returns_empty_for_non_binary_matrix():
    matrix = confusion_matrix([0, 1, 2], [0, 1, 2], [0, 1, 2])
    assert binary_metrics(matrix, [0, 1, 2], 1) == {}
