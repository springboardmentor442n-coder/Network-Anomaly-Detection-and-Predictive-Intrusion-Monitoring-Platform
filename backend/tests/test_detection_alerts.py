"""Threat detection and alert-management tests."""

from __future__ import annotations

import pytest

from app.alerts import (
    bulk_update_status,
    create_alerts,
    delete_alerts,
    get_alert,
    list_alerts,
    stats,
    update_status,
)
from app.ml.detection import (
    DEFAULT_SEVERITY_RULES,
    detection_results_csv,
    fire_alerts,
    read_results,
    run_detection,
    severity_for,
)
from app.ml.schema_utils import DataValidationError
from app.ml.training import train_model
from app.store import list_datasets, sync_project_datasets

SEVERITIES = {"critical", "high", "medium", "low"}


@pytest.fixture()
def registered(data_paths) -> dict[str, str]:
    sync_project_datasets()
    return {item["filename"]: item["id"] for item in list_datasets()}


@pytest.fixture()
def model_id(registered) -> str:
    return train_model(registered["_test_training-set.csv"], "label", "random_forest")["id"]


def test_detection_requires_a_trained_model(registered, data_paths):
    with pytest.raises(DataValidationError) as exc:
        run_detection(
            source_path=data_paths["traffic"],
            source_filename="traffic.csv",
            model_id=None,
            mode="model",
        )
    assert "no trained model" in str(exc.value).lower()


def test_model_detection_scores_every_row(model_id, data_paths, frames):
    record = run_detection(
        source_path=data_paths["traffic"],
        source_filename="_test_traffic.csv",
        model_id=model_id,
        mode="model",
    )

    assert record["mode"] == "model"
    assert record["modeLabel"] == "Machine-learning model"
    assert record["rowsScanned"] == len(frames["traffic"])
    assert record["predictedAttackCount"] + record["predictedNormalCount"] == record["rowsScanned"]
    assert record["confidenceSupported"] is True


def test_detection_rows_are_persisted_and_consistent(model_id, data_paths):
    record = run_detection(
        source_path=data_paths["traffic"],
        source_filename="_test_traffic.csv",
        model_id=model_id,
        mode="model",
    )
    rows = read_results(record["id"])

    assert len(rows) == record["rowsScanned"]
    for row in rows:
        assert row["severity"] in SEVERITIES
        assert row["predictedLabel"] in {"Attack", "Normal"}
        assert row["detectionReason"], "every record must explain why it was graded that way"
        assert row["recommendedAction"]
        assert isinstance(row["inputFeatures"], dict)


def test_normal_records_are_graded_low_severity(model_id, data_paths):
    record = run_detection(
        source_path=data_paths["traffic"],
        source_filename="_test_traffic.csv",
        model_id=model_id,
        mode="model",
    )
    rows = read_results(record["id"])
    for row in rows:
        if row["predictedLabel"] == "Normal":
            assert row["severity"] == "low"
            assert row["isThreat"] is False


def test_detection_output_is_deterministic(model_id, data_paths):
    first = run_detection(
        source_path=data_paths["traffic"], source_filename="t.csv", model_id=model_id, mode="model"
    )
    second = run_detection(
        source_path=data_paths["traffic"], source_filename="t.csv", model_id=model_id, mode="model"
    )
    assert first["predictedAttackCount"] == second["predictedAttackCount"]
    assert [row["severity"] for row in read_results(first["id"])] == [
        row["severity"] for row in read_results(second["id"])
    ]


def test_detection_results_csv_has_the_report_columns(model_id, data_paths):
    record = run_detection(
        source_path=data_paths["traffic"], source_filename="t.csv", model_id=model_id, mode="model"
    )
    csv = detection_results_csv(read_results(record["id"]))
    header = csv.splitlines()[0]
    assert header == (
        "record_reference,predicted_class,attack_category,confidence,"
        "risk_severity,detection_explanation,recommended_action"
    )
    assert len(csv.splitlines()) == record["rowsScanned"] + 1


def test_heuristic_mode_is_labelled_as_rule_based(data_paths):
    record = run_detection(
        source_path=data_paths["traffic"],
        source_filename="traffic.csv",
        model_id=None,
        mode="heuristic",
    )
    assert record["mode"] == "heuristic"
    assert record["modeLabel"] == "Rule-based assessment"
    assert record["confidenceSupported"] is False
    rows = read_results(record["id"])
    assert rows and all("NOT a machine-learning prediction" in row["detectionReason"] for row in rows)


def test_heuristic_mode_never_raises_alerts(data_paths):
    record = run_detection(
        source_path=data_paths["traffic"], source_filename="traffic.csv", model_id=None, mode="heuristic"
    )
    outcome = fire_alerts(record)
    assert outcome.get("skipped") is True
    assert outcome["created"] == 0
    assert stats()["total"] == 0


def test_severity_rules_are_applied_and_documented():
    rules = dict(DEFAULT_SEVERITY_RULES)
    assert severity_for("Attack", 0.95, rules)[0] == "critical"
    assert severity_for("Attack", 0.80, rules)[0] == "high"
    assert severity_for("Attack", 0.65, rules)[0] == "medium"
    assert severity_for("Attack", 0.10, rules)[0] == "medium"
    assert severity_for("Attack", None, rules)[0] == "medium"
    assert severity_for("Normal", 0.99, rules)[0] == "low"


def test_alerts_are_created_from_threats_and_deduplicated(model_id, data_paths):
    first = run_detection(
        source_path=data_paths["traffic"], source_filename="t.csv", model_id=model_id, mode="model"
    )
    threats = sum(1 for row in read_results(first["id"]) if row["isThreat"])
    assert threats > 0, "the synthetic traffic fixture must contain at least one predicted attack"

    outcome = fire_alerts(first)
    assert outcome["created"] == threats
    assert outcome["duplicates"] == 0
    assert stats()["total"] == threats

    # Re-firing the same detection must not duplicate a single alert.
    again = fire_alerts(first)
    assert again["created"] == 0
    assert again["duplicates"] == threats
    assert stats()["total"] == threats


def test_alert_status_updates_and_stats(model_id, data_paths):
    record = run_detection(
        source_path=data_paths["traffic"], source_filename="t.csv", model_id=model_id, mode="model"
    )
    fire_alerts(record)
    page = list_alerts(page=1, page_size=200)
    assert page["total"] > 0

    alert_id = page["items"][0]["id"]
    updated = update_status(alert_id, "acknowledged")
    assert updated["status"] == "acknowledged"
    assert get_alert(alert_id)["status"] == "acknowledged"

    counts = stats()
    assert counts["byStatus"]["acknowledged"] >= 1
    assert counts["total"] == page["total"]
    assert sum(counts["bySeverity"].values()) == counts["total"]


def test_invalid_alert_status_is_rejected(model_id, data_paths):
    record = run_detection(
        source_path=data_paths["traffic"], source_filename="t.csv", model_id=model_id, mode="model"
    )
    fire_alerts(record)
    alert_id = list_alerts(page_size=1)["items"][0]["id"]
    with pytest.raises(ValueError):
        update_status(alert_id, "ignored")


def test_alert_filtering_search_and_sorting(model_id, data_paths):
    record = run_detection(
        source_path=data_paths["traffic"], source_filename="t.csv", model_id=model_id, mode="model"
    )
    fire_alerts(record)

    everything = list_alerts(page_size=200)
    by_severity = list_alerts(severity=everything["items"][0]["severity"], page_size=200)
    assert by_severity["total"] >= 1
    assert all(item["severity"] == everything["items"][0]["severity"] for item in by_severity["items"])

    search_term = everything["items"][0]["id"][:6]
    found = list_alerts(search=search_term, page_size=200)
    assert found["total"] >= 1

    sorted_desc = list_alerts(sort="severity", order="desc", page_size=200)
    ranks = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    values = [ranks[item["severity"]] for item in sorted_desc["items"]]
    assert values == sorted(values, reverse=True)


def test_bulk_status_update_and_delete(model_id, data_paths):
    record = run_detection(
        source_path=data_paths["traffic"], source_filename="t.csv", model_id=model_id, mode="model"
    )
    fire_alerts(record)
    ids = [item["id"] for item in list_alerts(page_size=200)["items"]]

    assert bulk_update_status(ids[:2], "resolved") == len(ids[:2])
    assert all(get_alert(alert_id)["status"] == "resolved" for alert_id in ids[:2])

    deleted = delete_alerts(ids)
    assert deleted == len(ids)
    assert stats()["total"] == 0


def test_create_alerts_without_threats_is_a_noop():
    outcome = create_alerts({"id": "det-x"}, [])
    assert outcome["created"] == 0
    assert "no threat" in outcome["message"].lower()
