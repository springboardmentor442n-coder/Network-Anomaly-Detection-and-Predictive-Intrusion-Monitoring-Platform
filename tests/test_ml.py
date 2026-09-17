"""ML pipeline: risk scoring, preprocessing, model loading, inference."""

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from backend.app.core.errors import ModelError, ValidationError
from backend.app.ml.data_loader import (
    discover_dataset_files,
    find_label_column,
    iter_dataset_chunks,
)
from backend.app.ml.preprocessing import build_preprocessor, clean_frame, prepare_frame
from backend.app.ml.risk import (
    attack_type_points,
    calculate_risk,
    explain,
    policy,
    severity_for_score,
)
from backend.app.services.ml_service import DetectionService, MLService

PROJECT_ROOT = Path(__file__).resolve().parents[1]


# --------------------------------------------------------------- risk scoring --

def test_risk_score_is_always_in_range():
    for is_anomaly in (True, False):
        for attack_probability in (-5.0, 0.0, 0.5, 1.0, 9.0):
            for confidence in (-1.0, 0.0, 0.5, 1.0, 3.0):
                for prediction in ("BENIGN", "DDoS", "DoS Hulk", "Nonsense", ""):
                    score, severity = calculate_risk(
                        is_anomaly, attack_probability, confidence, prediction
                    )
                    assert 0 <= score <= 100
                    assert severity in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


def test_benign_and_no_anomaly_scores_zero():
    score, severity = calculate_risk(False, 0.0, 0.0, "BENIGN")
    assert score == 0
    assert severity == "LOW"


def test_worst_case_is_critical():
    score, severity = calculate_risk(True, 1.0, 1.0, "DDoS")
    assert score == 100
    assert severity == "CRITICAL"


def test_anomaly_increases_score():
    calm, _ = calculate_risk(False, 0.2, 0.8, "BENIGN")
    flagged, _ = calculate_risk(True, 0.2, 0.8, "BENIGN")
    assert flagged > calm


def test_attack_probability_increases_score():
    low, _ = calculate_risk(False, 0.1, 0.9, "DoS Hulk")
    high, _ = calculate_risk(False, 0.9, 0.9, "DoS Hulk")
    assert high > low


@pytest.mark.parametrize(
    "label,expected_family",
    [
        ("BENIGN", "Benign"),
        ("benign", "Benign"),
        ("DDoS", "DDoS"),
        ("DoS Hulk", "DoS"),
        ("DoS Slowloris - Attempted", "DoS"),
        ("Web Attack - Brute Force", "Web Attack"),
        ("Portscan", "Portscan"),
        ("FTP-Patator", "Patator"),
        ("Botnet - Attempted", "Botnet"),
        ("Heartbleed", "Heartbleed"),
    ],
)
def test_real_cicids_labels_resolve_to_a_family(label, expected_family):
    """
    The shipped label set uses names like 'DoS Hulk', so family matching must be
    substring-based - an exact-match lookup would silently score every real
    attack label as 'unrecognised'.
    """
    _, family = attack_type_points(label, True)
    assert family == expected_family


def test_unrecognized_label_only_scores_when_anomalous():
    points_anomalous, family = attack_type_points("Totally New Thing", True)
    points_normal, _ = attack_type_points("Totally New Thing", False)
    assert family == "Unrecognized"
    assert points_anomalous > 0
    assert points_normal == 0


def test_confidently_benign_never_gets_attack_type_points():
    points, family = attack_type_points("BENIGN", True)
    assert points == 0
    assert family == "Benign"


@pytest.mark.parametrize(
    "score,expected",
    [(0, "LOW"), (34, "LOW"), (35, "MEDIUM"), (64, "MEDIUM"), (65, "HIGH"), (84, "HIGH"), (85, "CRITICAL"), (100, "CRITICAL")],
)
def test_severity_boundaries(score, expected):
    assert severity_for_score(score) == expected


def test_explanation_matches_score():
    args = (True, 0.73, 0.88, "DoS Hulk")
    score, severity = calculate_risk(*args)
    breakdown = explain(*args)

    assert breakdown["risk_score"] == score
    assert breakdown["severity"] == severity
    assert len(breakdown["components"]) == 4

    total = sum(component["points"] for component in breakdown["components"])
    assert abs(total - breakdown["raw_score"]) < 0.01


def test_explanation_components_have_reasons():
    breakdown = explain(True, 0.5, 0.9, "DDoS")
    for component in breakdown["components"]:
        assert component["reason"]
        assert component["max_points"] > 0


def test_policy_exposes_weights_and_thresholds():
    current = policy()
    assert current["anomaly_points"] == 35
    assert current["attack_probability_weight"] == 45
    assert current["confidence_weight"] == 15
    assert current["severity_thresholds"]["CRITICAL"] == 85
    assert "DDoS" in current["attack_type_weights"]


# -------------------------------------------------------------- preprocessing --

def _sample_frame() -> pd.DataFrame:
    """Four rows: one unique, one carrying an infinity, and one exact duplicate."""
    return pd.DataFrame(
        {
            "Src IP": ["10.0.0.1", "10.0.0.2", "10.0.0.3", "10.0.0.3"],
            "Dst IP": ["10.0.0.9", "10.0.0.9", "10.0.0.9", "10.0.0.9"],
            "Flow ID": ["a", "b", "c", "c"],
            "Timestamp": ["t1", "t2", "t3", "t3"],
            "Flow Duration": [10.0, np.inf, 30.0, 30.0],
            "Total Fwd Packet": [1, 2, 3, 3],
            "Protocol": ["6", "17", "17", "17"],
            "Label": ["BENIGN", "DDoS", "DDoS", "DDoS"],
        }
    )


def test_clean_frame_removes_duplicates_and_infinities():
    cleaned = clean_frame(_sample_frame(), "Label")
    assert len(cleaned) == 3, "the exact duplicate row must be dropped"
    # np.inf has been replaced by NaN, so no infinite value survives.
    assert not np.isinf(cleaned["Flow Duration"].fillna(0)).any()
    assert cleaned["Flow Duration"].isna().sum() == 1


def test_clean_frame_drops_rows_without_a_label():
    frame = _sample_frame()
    frame.loc[0, "Label"] = None
    cleaned = clean_frame(frame, "Label")
    assert "BENIGN" not in set(cleaned["Label"])


def test_preprocessor_excludes_identity_columns():
    frame = clean_frame(_sample_frame(), "Label")
    _, feature_columns = build_preprocessor(frame, "Label")
    for leaked in ("Src IP", "Dst IP", "Flow ID", "Timestamp", "Label"):
        assert leaked not in feature_columns, f"{leaked} must not be a model feature"


def test_prepare_frame_separates_features_and_labels():
    prepared = prepare_frame(_sample_frame(), "Label")
    assert "Label" not in prepared.features.columns
    assert len(prepared.features) == len(prepared.labels)
    assert prepared.metadata["rows"] == len(prepared.features)


# ---------------------------------------------------------------- data loader --

def test_find_label_column_accepts_known_names():
    assert find_label_column(["a", "Label"]) == "Label"
    assert find_label_column(["attack_cat"]) == "attack_cat"
    assert find_label_column(["Class"]) == "Class"


def test_find_label_column_raises_when_absent():
    with pytest.raises(ValueError):
        find_label_column(["a", "b"])


def test_discover_dataset_files_returns_empty_for_missing_root(tmp_path):
    assert discover_dataset_files(tmp_path) == []


def test_dataset_discovery_and_chunking(dataset_available):
    if not dataset_available:
        pytest.skip("CICIDS2017 dataset not present")
    files = discover_dataset_files(PROJECT_ROOT)
    assert len(files) >= 1
    chunk = next(iter_dataset_chunks(files[:1], chunk_size=2))
    assert len(chunk) == 2
    assert find_label_column(chunk.columns.tolist())


def test_chunking_does_not_load_whole_file(dataset_available):
    """Chunk size must bound memory - a chunk is never the whole corpus."""
    if not dataset_available:
        pytest.skip("CICIDS2017 dataset not present")
    files = discover_dataset_files(PROJECT_ROOT)
    chunk = next(iter_dataset_chunks(files[:1], chunk_size=100))
    assert len(chunk) == 100


# ---------------------------------------------------------------- ml service --

def test_service_reports_not_ready_for_empty_model_root(tmp_path):
    service = DetectionService(tmp_path)
    assert service.ready is False
    assert service.metadata() == {"status": "not_trained"}


def test_predict_raises_model_error_when_untrained(tmp_path):
    service = DetectionService(tmp_path)
    with pytest.raises(ModelError):
        service.predict({"a": 1})


def test_predict_rejects_empty_features(models_available):
    if not models_available:
        pytest.skip("Trained models not present")
    service = DetectionService(PROJECT_ROOT / "models")
    with pytest.raises(ValidationError):
        service.predict({})


def test_metadata_reports_real_metrics(models_available):
    if not models_available:
        pytest.skip("Trained models not present")
    metadata = MLService(PROJECT_ROOT / "models").get_model_info()
    metrics = metadata["metrics"]
    assert 0.0 <= metrics["accuracy"] <= 1.0
    assert 0.0 <= metrics["f1_macro"] <= 1.0
    assert metrics["f1_macro"] <= metrics["accuracy"] + 1e-9
    assert len(metadata["classes"]) > 1


def test_inference_on_real_row(models_available, real_features):
    if not models_available:
        pytest.skip("Trained models not present")
    features, label = real_features
    result = MLService(PROJECT_ROOT / "models").predict(features)

    assert isinstance(result["prediction"], str)
    assert 0.0 <= result["confidence"] <= 1.0
    assert 0.0 <= result["attack_probability"] <= 1.0
    assert isinstance(result["is_anomaly"], bool)
    assert 0 <= result["risk_score"] <= 100
    assert result["severity"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    assert result["class_probabilities"], "per-class probabilities must be returned"
    assert abs(sum(result["class_probabilities"].values()) - 1.0) < 0.01


def test_prediction_matches_corpus_label(models_available, real_features):
    """
    A sanity check, not an accuracy claim: the model should reproduce the
    recorded label for a row drawn from the corpus it was trained on.
    """
    if not models_available:
        pytest.skip("Trained models not present")
    features, label = real_features
    result = MLService(PROJECT_ROOT / "models").predict(features)
    assert result["prediction"] == label


def test_model_service_is_ready(models_available):
    if not models_available:
        pytest.skip("Trained models not present")
    assert MLService(PROJECT_ROOT / "models").is_ready() is True
