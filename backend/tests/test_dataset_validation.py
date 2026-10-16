"""CSV parsing, validation and dataset profiling tests."""

from __future__ import annotations

import pandas as pd
import pytest

from app.ml.dataset import profile_dataset, validate_dataset_file, validate_extension
from app.ml.schema_utils import DataValidationError, find_target_columns, read_csv


def test_validate_extension_accepts_csv_case_insensitively():
    validate_extension("UNSW_NB15_training-set.CSV")


@pytest.mark.parametrize("name", ["traffic.txt", "traffic.xlsx", "traffic", "traffic.csv.exe"])
def test_validate_extension_rejects_other_types(name):
    with pytest.raises(DataValidationError):
        validate_extension(name)


def test_read_csv_reports_missing_file(tmp_path):
    with pytest.raises(DataValidationError) as exc:
        read_csv(tmp_path / "does-not-exist.csv")
    assert "not found" in str(exc.value).lower()


def test_read_csv_rejects_zero_byte_file(tmp_path):
    path = tmp_path / "empty.csv"
    path.write_bytes(b"")
    with pytest.raises(DataValidationError):
        read_csv(path)


def test_header_only_file_is_rejected(tmp_path, frames):
    path = tmp_path / "header_only.csv"
    frames["training"].head(0).to_csv(path, index=False)
    with pytest.raises(DataValidationError) as exc:
        validate_dataset_file(path)
    assert "no data rows" in str(exc.value).lower()


def test_single_column_file_is_rejected(tmp_path, frames):
    path = tmp_path / "one_column.csv"
    frames["training"][["label"]].to_csv(path, index=False)
    with pytest.raises(DataValidationError):
        validate_dataset_file(path)


def test_file_without_target_columns_is_rejected_with_details(tmp_path, frames):
    frame = frames["training"].drop(columns=["label", "attack_cat"])
    path = tmp_path / "no_target.csv"
    frame.to_csv(path, index=False)

    with pytest.raises(DataValidationError) as exc:
        validate_dataset_file(path)
    payload = exc.value.as_dict()
    assert payload["error"] == "dataset_validation_failed"
    assert payload["details"], "the error must explain which columns were expected"


def test_find_target_columns_is_case_insensitive_and_strips_whitespace():
    binary, multiclass = find_target_columns([" ID ", "Label", "Victim_Attack_cat", "proto"])
    assert binary == "Label"
    assert multiclass is None  # 'Attack_cat' alone must not match the exact candidate


def test_find_target_columns_detects_both_targets():
    binary, multiclass = find_target_columns(["id", "proto", "label", "attack_cat"])
    assert binary == "label"
    assert multiclass == "attack_cat"


def test_profile_reports_real_dimensions_and_quality_metrics(tmp_path, frames):
    frame = frames["training"]
    path = tmp_path / "profile.csv"
    frame.to_csv(path, index=False)

    loaded = validate_dataset_file(path)
    profile = profile_dataset(loaded)

    assert profile["rows"] == len(frame)
    assert profile["columns"] == frame.shape[1]
    assert profile["totalCells"] == len(frame) * frame.shape[1]
    assert profile["totalMissing"] > 0, "the fixture deliberately contains missing values"
    assert profile["duplicateRows"] >= 2, "the fixture deliberately contains duplicate rows"
    assert set(profile["numericColumns"]) >= {"dur", "sbytes", "rate"}
    assert "proto" in profile["categoricalColumns"]
    assert "id" in profile["identifierColumns"]
    assert profile["targets"] == {"binary": "label", "multiclass": "attack_cat"}
    assert len(profile["correlation"]["columns"]) <= 12
    assert {item["name"] for item in profile["labelDistribution"]} <= {"Attack", "Normal"}
    assert profile["labelDistribution"], "the label distribution must be reported"
    assert profile["attackCategoryDistribution"], "the attack_cat distribution must be reported"
    assert "proto" in profile["distributions"]


def test_profile_numeric_stats_match_pandas(tmp_path, frames):
    frame = frames["training"]
    path = tmp_path / "stats.csv"
    frame.to_csv(path, index=False)
    profile = profile_dataset(validate_dataset_file(path))

    stats = {item["column"]: item for item in profile["numericStats"]}
    assert "sbytes" in stats
    assert stats["sbytes"]["mean"] == pytest.approx(float(frame["sbytes"].mean()), rel=1e-9)
    assert stats["sbytes"]["min"] == pytest.approx(float(frame["sbytes"].min()))
    assert stats["sbytes"]["max"] == pytest.approx(float(frame["sbytes"].max()))


def test_profile_handles_dataset_without_categorical_columns(tmp_path):
    frame = pd.DataFrame({"id": [1, 2, 3, 4], "a": [1.0, 2.0, 3.0, 4.0], "b": [5, 6, 7, 8], "label": [0, 1, 0, 1]})
    path = tmp_path / "numeric_only.csv"
    frame.to_csv(path, index=False)
    profile = profile_dataset(validate_dataset_file(path))
    assert profile["categoricalCount"] == 0
    assert profile["targets"]["multiclass"] is None
    assert profile["distributions"] == {}
