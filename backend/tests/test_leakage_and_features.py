"""Target-leakage prevention and feature-selection tests.

These are the most important tests in the suite: if the model is allowed to see
``label``/``attack_cat`` (or a monotonic row index) as an input feature, every
reported metric becomes meaningless.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from app.ml.schema_utils import (
    build_feature_matrix,
    detect_identifier_columns,
    feature_columns,
    is_numeric_like,
)


def test_feature_columns_exclude_both_targets_and_identifier(frames):
    features = feature_columns(frames["training"], "label")
    assert "label" not in features
    assert "attack_cat" not in features, "the multiclass target must never be an input feature"
    assert "id" not in features
    assert "dur" in features and "proto" in features


def test_feature_columns_for_multiclass_target_exclude_the_binary_target(frames):
    features = feature_columns(frames["training"], "attack_cat")
    assert "attack_cat" not in features
    assert "label" not in features


def test_detect_identifier_columns_finds_monotonic_row_index(frames):
    identifiers = detect_identifier_columns(frames["training"])
    assert "id" in identifiers


def test_detect_identifier_columns_ignores_ordinary_numeric_columns(frames):
    identifiers = detect_identifier_columns(frames["testing"])
    assert "sbytes" not in identifiers
    assert "rate" not in identifiers


def test_feature_columns_accepts_extra_exclusions(frames):
    features = feature_columns(frames["training"], "label", extra_exclude=["proto"])
    assert "proto" not in features


def test_build_feature_matrix_keeps_column_order_and_fills_absent_columns(frames):
    frame = frames["training"]
    features = feature_columns(frame, "label")
    numeric = [column for column in features if column in {"dur", "sbytes"}]

    matrix = build_feature_matrix(frame, features, numeric)
    assert list(matrix.columns) == features
    assert matrix.shape[0] == len(frame)

    # A column the model expects but the incoming file lacks must become NaN
    # (the fitted imputer fills it) rather than silently inventing a value.
    narrower = build_feature_matrix(frame, ["dur", "not_a_real_column"], ["dur"])
    assert narrower["not_a_real_column"].isna().all()


def test_build_feature_matrix_coerces_text_numbers_only_for_numeric_columns():
    frame = pd.DataFrame({"dur": ["1.5", "2.5", "x"], "proto": ["tcp", "udp", "arp"]})
    matrix = build_feature_matrix(frame, ["dur", "proto"], ["dur"])
    assert matrix["dur"].dtype.kind == "f"
    assert np.isnan(matrix["dur"].iloc[2]), "unparseable numeric values must become NaN"
    assert matrix["proto"].iloc[0] == "tcp"


def test_is_numeric_like_threshold():
    assert is_numeric_like(pd.Series([1, 2, 3])) is True
    assert is_numeric_like(pd.Series(["1", "2", "3"])) is True
    assert is_numeric_like(pd.Series(["a", "b", "c"])) is False
    assert is_numeric_like(pd.Series(["1", "2", "b", "b", "b", "b", "b", "b", "b", "b"])) is False
