"""Training and evaluation tests - these exercise the real scikit-learn pipeline."""

from __future__ import annotations

import joblib
import numpy as np
import pytest

from app.ml.evaluation import evaluate_model, evaluation_report_csv
from app.ml.schema_utils import DataValidationError
from app.ml.training import load_artifact, train_model
from app.store import (
    get_active_model_id,
    list_datasets,
    model_artifact_path,
    new_id,
    now_iso,
    save_dataset,
    sync_project_datasets,
)

ALGORITHMS = ["random_forest", "decision_tree", "logistic_regression"]


@pytest.fixture()
def registered(data_paths) -> dict[str, str]:
    """Register the synthetic training/testing files through the real registry."""
    sync_project_datasets()
    return {item["filename"]: item["id"] for item in list_datasets()}


def _register_frame(frame, path) -> str:
    dataset_id = new_id("ds")
    save_dataset(
        {
            "id": dataset_id,
            "filename": path.name,
            "storage_path": str(path),
            "source": "upload",
            "sizeBytes": path.stat().st_size,
            "rows": int(frame.shape[0]),
            "columns": int(frame.shape[1]),
            "createdAt": now_iso(),
            "analyzedAt": now_iso(),
            "binaryTarget": "label",
            "multiclassTarget": "attack_cat" if "attack_cat" in frame.columns else None,
            "isSample": False,
            "description": None,
        }
    )
    return dataset_id


@pytest.mark.parametrize("algorithm", ALGORITHMS)
def test_train_binary_models(registered, algorithm):
    meta = train_model(registered["_test_training-set.csv"], "label", algorithm)

    assert meta["algorithm"] == algorithm
    assert sorted(meta["classes"]) == [0, 1]
    assert meta["featureColumns"], "at least one feature must survive selection"
    for forbidden in ("label", "attack_cat", "id"):
        assert forbidden not in meta["featureColumns"]
    assert model_artifact_path(meta["id"]).exists()
    assert get_active_model_id() == meta["id"]
    assert meta["trainingRows"] > 0

    # The training-fit metrics must be real numbers derived from a real fit.
    assert meta["trainFitMetrics"]["accuracy"] is not None
    assert 0.0 <= meta["trainFitMetrics"]["accuracy"] <= 1.0
    assert "resubstitution" in meta["trainFitMetricsNote"].lower()


def test_training_numeric_scaling_is_algorithm_dependent(registered):
    linear = train_model(registered["_test_training-set.csv"], "label", "logistic_regression")
    tree = train_model(registered["_test_training-set.csv"], "label", "decision_tree")

    linear_steps = joblib.load(model_artifact_path(linear["id"]))["pipeline"].named_steps["preprocess"].named_transformers_
    tree_steps = joblib.load(model_artifact_path(tree["id"]))["pipeline"].named_steps["preprocess"].named_transformers_

    assert "scaler" in linear_steps["numeric"].named_steps
    assert "scaler" not in tree_steps["numeric"].named_steps


def test_train_multiclass_model(registered):
    meta = train_model(registered["_test_training-set.csv"], "attack_cat", "decision_tree")
    assert len(meta["classes"]) >= 2
    assert "label" not in meta["featureColumns"]
    assert "attack_cat" not in meta["featureColumns"]
    assert len(meta["classDistribution"]) >= 2


def test_artifact_round_trips_with_preprocessing(registered):
    meta = train_model(registered["_test_training-set.csv"], "label", "random_forest")
    artifact = load_artifact(meta["id"])
    assert set(artifact) >= {"pipeline", "featureColumns", "numericColumns", "categoricalColumns", "classes"}
    assert hasattr(artifact["pipeline"], "predict")
    assert hasattr(artifact["pipeline"], "predict_proba")


def test_single_class_training_is_rejected(tmp_path, frames):
    frame = frames["training"].copy()
    frame["label"] = 0
    path = tmp_path / "single_class.csv"
    frame.to_csv(path, index=False)
    dataset_id = _register_frame(frame, path)

    with pytest.raises(DataValidationError) as exc:
        train_model(dataset_id, "label", "logistic_regression")
    assert "one class" in str(exc.value).lower()


def test_training_without_target_column_is_rejected(tmp_path, frames):
    frame = frames["training"].copy()
    path = tmp_path / "no_label.csv"
    frame.drop(columns=["label"]).to_csv(path, index=False)
    dataset_id = _register_frame(frame, path)

    with pytest.raises(DataValidationError):
        train_model(dataset_id, "label", "decision_tree")


def test_unknown_dataset_is_rejected():
    with pytest.raises(DataValidationError):
        train_model("ds-does-not-exist", "label", "random_forest")


def test_evaluation_metrics_come_from_real_predictions(registered, frames):
    meta = train_model(registered["_test_training-set.csv"], "label", "random_forest")
    record = evaluate_model(meta["id"], registered["_test_testing-set.csv"])

    assert record["rowsEvaluated"] == len(frames["testing"])
    matrix_total = sum(sum(row) for row in record["confusionMatrix"])
    assert matrix_total == record["rowsEvaluated"]
    assert record["correct"] == sum(record["confusionMatrix"][i][i] for i in range(len(record["confusionMatrix"])))
    assert record["accuracy"] == pytest.approx(record["correct"] / record["rowsEvaluated"])
    assert 0.0 <= record["accuracy"] <= 1.0
    assert record["target"] == "label"
    assert record["isMulticlass"] is False


def test_evaluation_uses_the_correct_positive_class(registered):
    meta = train_model(registered["_test_training-set.csv"], "label", "random_forest")
    record = evaluate_model(meta["id"], registered["_test_testing-set.csv"])

    assert record["binary"]["positiveClass"] == "1"
    per_class = {item["label"]: item for item in record["perClass"]}
    assert record["binary"]["truePositive"] == per_class["1"]["truePositive"]
    assert record["binary"]["falseNegative"] == per_class["1"]["falseNegative"]
    assert record["binary"]["falsePositiveRate"] == pytest.approx(per_class["1"]["falsePositiveRate"])


def test_evaluation_does_not_refit_the_saved_pipeline(registered):
    meta = train_model(registered["_test_training-set.csv"], "label", "logistic_regression")
    artifact_path = model_artifact_path(meta["id"])

    coefficients_before = joblib.load(artifact_path)["pipeline"].named_steps["model"].coef_.copy()
    evaluate_model(meta["id"], registered["_test_testing-set.csv"])
    coefficients_after = joblib.load(artifact_path)["pipeline"].named_steps["model"].coef_.copy()

    assert np.allclose(coefficients_before, coefficients_after), (
        "evaluation must reuse the fitted preprocessing pipeline, never refit it"
    )


def test_evaluation_is_deterministic(registered):
    meta = train_model(registered["_test_training-set.csv"], "label", "random_forest")
    first = evaluate_model(meta["id"], registered["_test_testing-set.csv"])
    second = evaluate_model(meta["id"], registered["_test_testing-set.csv"])
    assert first["confusionMatrix"] == second["confusionMatrix"]
    assert first["accuracy"] == second["accuracy"]


def test_multiclass_evaluation_reports_macro_rates_and_explanation(registered):
    meta = train_model(registered["_test_training-set.csv"], "attack_cat", "random_forest")
    record = evaluate_model(meta["id"], registered["_test_testing-set.csv"])

    assert record["isMulticlass"] is True
    assert record["binary"] == {}
    assert record["macroFalsePositiveRate"] is not None
    assert record["macroFalseNegativeRate"] is not None
    assert "one-vs-rest" in record["fprFnrExplanation"]
    for item in record["perClass"]:
        assert item["displayLabel"], "each class needs a display label"


def test_evaluation_dataset_without_the_target_column_is_rejected(registered, tmp_path, frames):
    traffic = frames["traffic"]  # synthetic traffic without labels
    assert "label" not in traffic.columns
    path = tmp_path / "unlabelled.csv"
    traffic.to_csv(path, index=False)
    dataset_id = _register_frame(traffic, path)

    meta = train_model(registered["_test_training-set.csv"], "label", "decision_tree")
    with pytest.raises(DataValidationError) as exc:
        evaluate_model(meta["id"], dataset_id)
    assert "label" in str(exc.value)


def test_evaluation_report_csv_contains_only_computed_values(registered):
    meta = train_model(registered["_test_training-set.csv"], "label", "decision_tree")
    record = evaluate_model(meta["id"], registered["_test_testing-set.csv"])
    report = evaluation_report_csv(record)

    assert report.startswith("section,metric,value")
    assert "metrics,accuracy," in report
    assert "per_class,class,support,precision,recall,f1" in report
    assert "confusion_matrix,actual\\predicted" in report
    assert str(record["rowsEvaluated"]) in report
