"""Column classification, target detection and feature-selection helpers.

These helpers are the single place where NetShield AI decides:
  * which columns are numeric vs categorical,
  * which column is the classification target,
  * which columns may legally be used as model *input features*.

Keeping this logic in one module is what prevents target leakage: every caller
(train / evaluate / detect) funnels through :func:`feature_columns`.
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd
from pandas.api.types import is_numeric_dtype

from ..config import (
    BINARY_TARGET_CANDIDATES,
    IDENTIFIER_COLUMNS,
    MULTICLASS_TARGET_CANDIDATES,
    NON_FEATURE_COLUMNS,
)

# Fraction of non-null values that must parse as numbers before a text column is
# treated as numeric.
_NUMERIC_COERCION_THRESHOLD = 0.9


class DataValidationError(ValueError):
    """Raised when a CSV cannot be used. ``details`` is returned to the client."""

    def __init__(self, message: str, details: Iterable[str] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = list(details or [])

    def as_dict(self) -> dict:
        return {"error": "dataset_validation_failed", "message": self.message, "details": self.details}


def read_csv(path: str | Path, nrows: int | None = None) -> pd.DataFrame:
    """Read a CSV with a small encoding fallback and useful error messages."""
    path = Path(path)
    if not path.exists():
        raise DataValidationError(f"File not found: {path.name}")
    if path.stat().st_size == 0:
        raise DataValidationError(f"File is empty: {path.name}")

    last_error: Exception | None = None
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            frame = pd.read_csv(path, nrows=nrows, low_memory=False, encoding=encoding)
            if frame.shape[1] == 0:
                raise DataValidationError("The file does not contain any columns.")
            return frame
        except UnicodeDecodeError as exc:  # try the next encoding
            last_error = exc
            continue
        except pd.errors.EmptyDataError as exc:
            raise DataValidationError("The file is empty or contains no parsable rows.") from exc
        except pd.errors.ParserError as exc:
            raise DataValidationError(f"Malformed CSV: {exc}") from exc

    raise DataValidationError(f"Unable to decode the file. {last_error}")


def normalize_scalar(value):
    """Normalise a single label value (UNSW-NB15 pads categories with spaces)."""
    if isinstance(value, str):
        return value.strip()
    return value


def normalize_target(series: pd.Series) -> pd.Series:
    return series.map(normalize_scalar)


def is_numeric_like(series: pd.Series) -> bool:
    """True when the column is numeric, or text that is almost entirely numeric."""
    if is_numeric_dtype(series):
        return True
    sample = series.dropna()
    if sample.empty:
        return False
    if isinstance(series.dtype, pd.CategoricalDtype):
        return False
    converted = pd.to_numeric(sample.astype(str).str.strip(), errors="coerce")
    return float(converted.notna().mean()) >= _NUMERIC_COERCION_THRESHOLD


def classify_columns(df: pd.DataFrame) -> tuple[list[str], list[str]]:
    """Return ``(numeric_columns, categorical_columns)``."""
    numeric: list[str] = []
    categorical: list[str] = []
    for column in df.columns:
        if is_numeric_like(df[column]):
            numeric.append(str(column))
        else:
            categorical.append(str(column))
    return numeric, categorical


def coerce_numeric(df: pd.DataFrame, columns: Iterable[str]) -> pd.DataFrame:
    """Return a copy with ``columns`` coerced to numeric (invalid entries -> NaN)."""
    frame = df.copy()
    for column in columns:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    return frame


def find_target_columns(columns: Iterable[str]) -> tuple[str | None, str | None]:
    """Locate the binary (``label``) and multiclass (``attack_cat``) targets."""
    lowered = {str(c).strip().lower(): str(c) for c in columns}

    def _first(candidates: tuple[str, ...]) -> str | None:
        for candidate in candidates:
            if candidate in lowered:
                return lowered[candidate]
        return None

    binary = _first(BINARY_TARGET_CANDIDATES)
    multiclass = _first(MULTICLASS_TARGET_CANDIDATES)
    if multiclass == binary:
        multiclass = None
    return binary, multiclass


def detect_identifier_columns(df: pd.DataFrame) -> list[str]:
    """Detect identifier-like columns (e.g. ``id``) that must not be features."""
    identifiers: list[str] = []
    for column in df.columns:
        lowered = str(column).strip().lower()
        if lowered in IDENTIFIER_COLUMNS:
            identifiers.append(str(column))
            continue
        # A column of unique, monotonically increasing integers is a row index.
        series = df[column]
        if is_numeric_dtype(series) and series.is_unique and series.is_monotonic_increasing:
            if len(series) > 10 and float(series.iloc[0]) == 0:
                identifiers.append(str(column))
    return identifiers


def feature_columns(
    df: pd.DataFrame,
    target: str,
    extra_exclude: Iterable[str] = (),
) -> list[str]:
    """Columns that may be used as model inputs for ``target``.

    Rows in :data:`NON_FEATURE_COLUMNS` (``id``, ``label``, ``attack_cat``) are
    always excluded, which is what prevents target leakage. ``extra_exclude``
    lets callers drop anything else they consider unsafe.
    """
    excluded = {c for c in NON_FEATURE_COLUMNS}
    excluded.update(str(c).strip().lower() for c in extra_exclude)
    excluded.add(str(target).strip().lower())
    excluded.update(str(c).strip().lower() for c in detect_identifier_columns(df))

    features: list[str] = []
    for column in df.columns:
        if str(column).strip().lower() in excluded:
            continue
        features.append(str(column))
    return features


def assert_target_present(df: pd.DataFrame, target: str) -> None:
    if target not in df.columns:
        raise DataValidationError(f"Target column '{target}' is not present in the dataset.")


def build_feature_matrix(
    df: pd.DataFrame,
    features: Iterable[str],
    numeric_columns: Iterable[str],
) -> pd.DataFrame:
    """Slice ``df`` down to ``features`` and coerce the numeric ones.

    Missing ``features`` become all-NaN columns so a model trained on a
    superset of columns can still score a narrower file (or vice versa the
    pipeline imputes them). This keeps detection robust to column re-ordering
    without ever silently inventing values.
    """
    numeric_set = set(numeric_columns)
    frame = pd.DataFrame(index=df.index)
    for column in features:
        if column in df.columns:
            frame[column] = df[column]
        else:
            frame[column] = np.nan
    to_coerce = [c for c in features if c in numeric_set]
    frame = coerce_numeric(frame, to_coerce)

    # Normalise categorical columns to plain ``object`` dtype with ``NaN`` for
    # missing values. This keeps scikit-learn's imputer/one-hot encoder working
    # regardless of whether pandas backed the strings with Arrow or Python.
    for column in features:
        if column in numeric_set:
            continue
        series = frame[column]
        as_object = series.astype(object)
        if series.notna().any():
            frame[column] = as_object.where(series.notna(), np.nan)
        else:
            frame[column] = as_object
    return frame
