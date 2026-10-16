"""Dataset loading, validation and statistical profiling.

Everything the Dataset Analysis page and the Dashboard need is produced here so
that the numbers shown in the UI always come from the actual file on disk.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import pandas as pd

from .schema_utils import (
    DataValidationError,
    classify_columns,
    coerce_numeric,
    detect_identifier_columns,
    find_target_columns,
    normalize_target,
    read_csv,
)

MAX_NUMERIC_STATS_COLUMNS = 40
MAX_CORRELATION_COLUMNS = 12
MAX_DISTRIBUTION_CATEGORIES = 12
MAX_SAMPLE_ROWS = 100

# Preferred UNSW-NB15 categorical columns for the dashboard distributions.
_PREFERRED_DISTRIBUTION_COLUMNS = ("proto", "service", "state")


def json_safe(value):
    """Convert numpy / pandas scalars into JSON-serialisable Python values."""
    if value is None:
        return None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        as_float = float(value)
        return None if math.isnan(as_float) or math.isinf(as_float) else as_float
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, float):
        return None if math.isnan(value) or math.isinf(value) else value
    if isinstance(value, (int, bool, str)):
        return value
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    return str(value)


def to_records(df: pd.DataFrame) -> list[dict]:
    records: list[dict] = []
    columns = [str(c) for c in df.columns]
    for row in df.itertuples(index=False, name=None):
        records.append({column: json_safe(value) for column, value in zip(columns, row)})
    return records


def validate_extension(filename: str) -> None:
    suffix = Path(filename).suffix.lower()
    if suffix not in {".csv"}:
        raise DataValidationError(
            f"Unsupported file type '{suffix or 'unknown'}'. Only .csv files are accepted."
        )


def validate_dataset_file(path: str | Path, row_limit: int | None = None) -> pd.DataFrame:
    """Load and validate a dataset file, raising :class:`DataValidationError`."""
    frame = read_csv(path, nrows=row_limit)

    if frame.shape[0] == 0:
        raise DataValidationError("The dataset contains a header but no data rows.")
    if frame.shape[1] < 2:
        raise DataValidationError(
            "The dataset must contain at least two columns (features plus a target)."
        )

    unnamed = [c for c in frame.columns if str(c).startswith("Unnamed:")]
    if len(unnamed) == len(frame.columns):
        raise DataValidationError("The first row does not look like a CSV header.")

    binary, multiclass = find_target_columns(frame.columns)
    if binary is None and multiclass is None:
        raise DataValidationError(
            "Required target columns are missing.",
            details=[
                "Expected a 'label' column for binary classification and/or an "
                "'attack_cat' column for multiclass classification.",
                f"Columns found: {', '.join(str(c) for c in frame.columns[:20])}"
                + (" ..." if frame.shape[1] > 20 else ""),
            ],
        )
    return frame


def _distribution(series: pd.Series, top: int = MAX_DISTRIBUTION_CATEGORIES) -> list[dict]:
    cleaned = normalize_target(series.astype("string")).fillna("(missing)")
    counts = cleaned.value_counts(dropna=False)
    items = [{"name": str(name), "value": int(count)} for name, count in counts.items()]
    if len(items) > top:
        head = items[: top - 1]
        tail_total = sum(item["value"] for item in items[top - 1 :])
        head.append({"name": "Other", "value": int(tail_total)})
        return head
    return items


def _column_profile(df: pd.DataFrame, numeric: set[str]) -> list[dict]:
    profile = []
    for column in df.columns:
        series = df[column]
        profile.append(
            {
                "name": str(column),
                "kind": "numeric" if str(column) in numeric else "categorical",
                "dtype": str(series.dtype),
                "missing": int(series.isna().sum()),
                "missingPct": round(float(series.isna().mean() * 100), 2),
                "unique": int(series.nunique(dropna=True)),
            }
        )
    return profile


def _numeric_stats(df: pd.DataFrame, numeric: list[str]) -> list[dict]:
    stats = []
    for column in numeric[:MAX_NUMERIC_STATS_COLUMNS]:
        series = pd.to_numeric(df[column], errors="coerce")
        valid = series.dropna()
        if valid.empty:
            stats.append(
                {
                    "column": column,
                    "count": 0,
                    "mean": None,
                    "median": None,
                    "min": None,
                    "max": None,
                    "std": None,
                    "missing": int(df[column].isna().sum()),
                }
            )
            continue
        stats.append(
            {
                "column": column,
                "count": int(valid.shape[0]),
                "mean": json_safe(valid.mean()),
                "median": json_safe(valid.median()),
                "min": json_safe(valid.min()),
                "max": json_safe(valid.max()),
                "std": json_safe(valid.std()),
                "missing": int(df[column].isna().sum()),
            }
        )
    return stats


def _correlation(df: pd.DataFrame, numeric: list[str]) -> dict:
    candidates = [c for c in numeric if pd.to_numeric(df[c], errors="coerce").nunique(dropna=True) > 1]
    if len(candidates) < 2:
        return {"columns": [], "matrix": []}

    variance = {}
    for column in candidates:
        series = pd.to_numeric(df[column], errors="coerce")
        variance[column] = float(series.var(skipna=True) or 0.0)
    selected = sorted(variance, key=lambda c: variance[c], reverse=True)[:MAX_CORRELATION_COLUMNS]

    frame = pd.DataFrame({c: pd.to_numeric(df[c], errors="coerce") for c in selected})
    matrix_frame = frame.corr(numeric_only=True).replace({np.nan: None})
    matrix = []
    for row in matrix_frame.itertuples(index=False, name=None):
        matrix.append([None if v is None else round(float(v), 3) for v in row])
    return {"columns": selected, "matrix": matrix}


def profile_dataset(df: pd.DataFrame) -> dict:
    """Full statistical profile used by the Dataset Analysis page."""
    numeric_columns, categorical_columns = classify_columns(df)
    numeric_set = set(numeric_columns)
    binary_target, multiclass_target = find_target_columns(df.columns)

    total_cells = int(df.shape[0] * df.shape[1])
    total_missing = int(df.isna().sum().sum())
    duplicate_count = int(df.duplicated().sum())
    column_profile = _column_profile(df, numeric_set)

    missing_by_column = [
        {
            "column": str(column),
            "missing": int(df[column].isna().sum()),
            "missingPct": round(float(df[column].isna().mean() * 100), 2),
        }
        for column in df.columns
    ]
    missing_by_column.sort(key=lambda item: item["missing"], reverse=True)

    distributions: dict[str, list[dict]] = {}
    for column in _PREFERRED_DISTRIBUTION_COLUMNS:
        if column in df.columns:
            distributions[column] = _distribution(df[column])

    label_distribution: list[dict] = []
    if binary_target:
        labels = normalize_target(df[binary_target])
        mapped = labels.map(lambda v: "Attack" if str(v) in {"1", "1.0", "True", "true"} else "Normal")
        label_distribution = _distribution(mapped)

    attack_distribution: list[dict] = []
    if multiclass_target:
        attack_distribution = _distribution(df[multiclass_target])

    return {
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "totalCells": total_cells,
        "totalMissing": total_missing,
        "missingPct": round(float(total_missing / total_cells * 100), 2) if total_cells else 0.0,
        "duplicateRows": duplicate_count,
        "duplicatePct": round(float(duplicate_count / df.shape[0] * 100), 2) if df.shape[0] else 0.0,
        "completeRows": int(df.dropna().shape[0]),
        "numericCount": len(numeric_columns),
        "categoricalCount": len(categorical_columns),
        "numericColumns": numeric_columns,
        "categoricalColumns": categorical_columns,
        "identifierColumns": detect_identifier_columns(df),
        "targets": {"binary": binary_target, "multiclass": multiclass_target},
        "columnProfile": column_profile,
        "missingByColumn": missing_by_column[:30],
        "numericStats": _numeric_stats(df, numeric_columns),
        "correlation": _correlation(df, numeric_columns),
        "labelDistribution": label_distribution,
        "attackCategoryDistribution": attack_distribution,
        "distributions": distributions,
        "sampleRows": to_records(df.head(MAX_SAMPLE_ROWS)),
    }


def filter_frame(
    df: pd.DataFrame,
    *,
    search: str | None = None,
    attack_cat: str | None = None,
    proto: str | None = None,
    service: str | None = None,
    label: str | None = None,
) -> pd.DataFrame:
    """Apply the Dataset Analysis table filters to a frame."""
    frame = df
    binary_target, multiclass_target = find_target_columns(df.columns)

    if attack_cat and multiclass_target:
        frame = frame[normalize_target(frame[multiclass_target]) == attack_cat]
    if label and binary_target:
        as_text = normalize_target(frame[binary_target]).astype("string")
        frame = frame[as_text == label]
    if proto and "proto" in frame.columns:
        frame = frame[normalize_target(frame["proto"].astype("string")) == proto]
    if service and "service" in frame.columns:
        frame = frame[normalize_target(frame["service"].astype("string")) == service]

    if search:
        needle = search.strip().lower()
        if needle:
            mask = pd.Series(False, index=frame.index)
            for column in frame.columns:
                mask |= frame[column].astype("string").str.lower().str.contains(
                    needle, na=False, regex=False
                )
            frame = frame[mask]
    return frame


def paginate_frame(frame: pd.DataFrame, page: int, page_size: int) -> dict:
    page = max(1, int(page))
    page_size = max(1, min(int(page_size), 200))
    start = (page - 1) * page_size
    end = start + page_size
    window = frame.iloc[start:end]
    total = int(frame.shape[0])
    return {
        "page": page,
        "pageSize": page_size,
        "total": total,
        "totalPages": max(1, math.ceil(total / page_size)) if total else 1,
        "columns": [str(c) for c in frame.columns],
        "rows": to_records(window),
    }


def dataset_report_csv(meta: dict, profile: dict) -> str:
    """Report A - Dataset Summary (CSV)."""
    lines = ["section,metric,value"]
    lines.append(f"Dataset Summary,filename,{_csv(meta.get('filename'))}")
    lines.append(f"Dataset Summary,rows,{profile['rows']}")
    lines.append(f"Dataset Summary,columns,{profile['columns']}")
    lines.append(f"Dataset Summary,missing_values,{profile['totalMissing']}")
    lines.append(f"Dataset Summary,missing_percent,{profile['missingPct']}")
    lines.append(f"Dataset Summary,duplicate_rows,{profile['duplicateRows']}")
    lines.append(f"Dataset Summary,duplicate_percent,{profile['duplicatePct']}")
    lines.append(f"Dataset Summary,numeric_columns,{profile['numericCount']}")
    lines.append(f"Dataset Summary,categorical_columns,{profile['categoricalCount']}")
    lines.append(f"Dataset Summary,binary_target,{_csv(profile['targets']['binary'])}")
    lines.append(f"Dataset Summary,multiclass_target,{_csv(profile['targets']['multiclass'])}")
    lines.append(f"Dataset Summary,analysis_timestamp,{_csv(meta.get('analyzedAt'))}")

    lines.append("")
    lines.append("class_distribution,class,count")
    for item in profile["labelDistribution"]:
        lines.append(f"class_distribution,{_csv(item['name'])},{item['value']}")
    for item in profile["attackCategoryDistribution"]:
        lines.append(f"class_distribution,{_csv(item['name'])},{item['value']}")

    lines.append("")
    lines.append("column,missing,missing_percent,unique")
    for item in profile["columnProfile"]:
        lines.append(
            f"{_csv(item['name'])},{item['missing']},{item['missingPct']},{item['unique']}"
        )
    return "\n".join(lines) + "\n"


def _csv(value) -> str:
    if value is None:
        return ""
    text = str(value)
    if any(ch in text for ch in [',', '"', '\n']):
        return '"' + text.replace('"', '""') + '"'
    return text
