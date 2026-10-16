"""End-to-end API tests exercising the real HTTP surface with FastAPI's TestClient."""

from __future__ import annotations

import time

import pytest


def _wait_for_job(client, job_id: str, timeout: float = 180.0) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        response = client.get(f"/api/jobs/{job_id}")
        assert response.status_code == 200, response.text
        job = response.json()
        if job["status"] in {"succeeded", "failed"}:
            return job
        time.sleep(0.2)
    raise AssertionError(f"job {job_id} did not finish within {timeout}s")


def _upload(client, path, name):
    with open(path, "rb") as handle:
        return client.post("/api/datasets/upload", files={"file": (name, handle, "text/csv")})


@pytest.fixture()
def uploaded(client, data_paths) -> dict[str, str]:
    ids: dict[str, str] = {}
    for key, name in (
        ("training", "Synthetic_training-set.csv"),
        ("testing", "Synthetic_testing-set.csv"),
    ):
        response = _upload(client, data_paths[key], name)
        assert response.status_code == 200, response.text
        ids[key] = response.json()["id"]
    return ids


def test_health_and_meta(client):
    health = client.get("/api/health")
    assert health.status_code == 200
    body = health.json()
    assert body["status"] == "ok"
    assert body["scikitLearn"], "the response must report the real scikit-learn version"

    meta = client.get("/api/meta").json()
    assert {item["id"] for item in meta["algorithms"]} == {
        "random_forest",
        "decision_tree",
        "logistic_regression",
    }
    assert {item["id"] for item in meta["targets"]} == {"label", "attack_cat"}
    assert meta["severityRules"]["critical"] >= meta["severityRules"]["high"]


def test_state_is_aggregated(client):
    state = client.get("/api/state").json()
    assert set(state) >= {"datasets", "alerts", "storage", "server"}
    assert set(state["alerts"]["byStatus"]) == {"open", "acknowledged", "resolved"}


def test_root_endpoint(client):
    assert client.get("/").status_code == 200


def test_upload_validates_extension(client, tmp_path):
    path = tmp_path / "traffic.txt"
    path.write_text("a,b\n1,2\n")
    response = _upload(client, path, "traffic.txt")
    assert response.status_code == 400
    assert response.json()["detail"]["error"] == "dataset_validation_failed"


def test_upload_rejects_empty_file(client, tmp_path):
    path = tmp_path / "empty.csv"
    path.write_bytes(b"")
    response = _upload(client, path, "empty.csv")
    assert response.status_code == 400


def test_upload_rejects_csv_without_targets(client, tmp_path, frames):
    path = tmp_path / "no_target.csv"
    frames["training"].drop(columns=["label", "attack_cat"]).to_csv(path, index=False)
    response = _upload(client, path, "no_target.csv")
    assert response.status_code == 400
    assert "details" in response.json()["detail"]


def test_uploaded_dataset_profile_and_tables(client, uploaded, frames):
    dataset_id = uploaded["training"]

    summary = client.get(f"/api/datasets/{dataset_id}/summary")
    assert summary.status_code == 200
    payload = summary.json()
    assert payload["dataset"]["hasLabel"] is True
    assert payload["dataset"]["hasAttackCat"] is True
    assert payload["profile"]["rows"] == len(frames["training"])

    page = client.get(f"/api/datasets/{dataset_id}/rows?page=1&page_size=5").json()
    assert page["total"] == len(frames["training"])
    assert len(page["rows"]) == 5
    assert page["totalPages"] == (len(frames["training"]) + 4) // 5

    options = client.get(f"/api/datasets/{dataset_id}/filter-options").json()
    assert "tcp" in options["protocols"]
    assert options["labels"]

    export = client.get(f"/api/datasets/{dataset_id}/export")
    assert export.status_code == 200
    assert "text/csv" in export.headers["content-type"]

    report = client.get(f"/api/datasets/{dataset_id}/report")
    assert report.status_code == 200
    assert "dataset_summary" in report.headers["content-disposition"]


def test_rows_endpoint_validates_pagination(client, uploaded):
    dataset_id = uploaded["training"]
    assert client.get(f"/api/datasets/{dataset_id}/rows?page=0").status_code == 422
    assert client.get(f"/api/datasets/{dataset_id}/rows?page_size=5000").status_code == 422


def test_unknown_dataset_returns_404(client):
    assert client.get("/api/datasets/ds-missing/summary").status_code == 404
    assert client.get("/api/datasets/ds-missing/rows").status_code == 404


def test_full_train_evaluate_detect_alert_workflow(client, uploaded, data_paths):
    # --- train -------------------------------------------------------------
    train = client.post(
        "/api/models/train",
        json={"datasetId": uploaded["training"], "target": "label", "algorithm": "decision_tree"},
    )
    assert train.status_code == 200, train.text
    job = _wait_for_job(client, train.json()["jobId"])
    assert job["status"] == "succeeded", job.get("error")
    model_id = job["result"]["modelId"]

    active = client.get("/api/models/active").json()
    assert active["model"]["id"] == model_id
    assert active["model"]["featureCount"] > 0

    # --- evaluate ----------------------------------------------------------
    evaluate = client.post(
        "/api/evaluate", json={"modelId": model_id, "testDatasetId": uploaded["testing"]}
    )
    assert evaluate.status_code == 200, evaluate.text
    eval_job = _wait_for_job(client, evaluate.json()["jobId"])
    assert eval_job["status"] == "succeeded", eval_job.get("error")
    record = eval_job["result"]["evaluation"]

    assert record["rowsEvaluated"] > 0
    assert record["accuracy"] is not None
    assert sum(sum(row) for row in record["confusionMatrix"]) == record["rowsEvaluated"]

    latest = client.get("/api/evaluations/latest").json()["evaluation"]
    assert latest["id"] == record["id"]

    listing = client.get("/api/evaluations").json()
    assert listing["comparison"] and listing["comparison"][0]["modelId"] == model_id

    evaluation_report = client.get(f"/api/evaluations/{record['id']}/report")
    assert evaluation_report.status_code == 200
    assert "accuracy" in evaluation_report.text

    # --- detect ------------------------------------------------------------
    with open(data_paths["traffic"], "rb") as handle:
        detect = client.post(
            "/api/detect",
            files={"file": ("traffic.csv", handle, "text/csv")},
            data={"model_id": model_id, "mode": "model", "create_alerts": "false"},
        )
    assert detect.status_code == 200, detect.text
    detection_id = detect.json()["detectionId"]
    detect_job = _wait_for_job(client, detect.json()["jobId"])
    assert detect_job["status"] == "succeeded", detect_job.get("error")

    rows = client.get(f"/api/detections/{detection_id}/rows?page=1&page_size=10").json()
    assert rows["total"] > 0
    assert len(rows["rows"]) == min(10, rows["total"])
    assert rows["detection"]["mode"] == "model"
    assert rows["detection"]["rowsScanned"] == rows["total"]

    threats_only = client.get(
        f"/api/detections/{detection_id}/rows?only_threats=true&page_size=200"
    ).json()
    assert all(item["isThreat"] for item in threats_only["rows"])

    detection_report = client.get(f"/api/detections/{detection_id}/report")
    assert detection_report.status_code == 200
    assert detection_report.text.startswith("record_reference,predicted_class")

    # --- alerts ------------------------------------------------------------
    raised = client.post(f"/api/detections/{detection_id}/alerts")
    assert raised.status_code == 200
    created = raised.json()["created"]

    stats = client.get("/api/alerts/stats").json()
    assert stats["total"] == created

    again = client.post(f"/api/detections/{detection_id}/alerts").json()
    assert again["created"] == 0, "duplicate alerts must be prevented by the fingerprint"
    assert again["duplicates"] == created

    alerts = client.get("/api/alerts?page=1&pageSize=10").json()
    assert alerts["total"] == created

    if created:
        alert_id = alerts["items"][0]["id"]
        patched = client.patch(f"/api/alerts/{alert_id}", json={"status": "acknowledged"})
        assert patched.status_code == 200
        assert patched.json()["alert"]["status"] == "acknowledged"

        invalid = client.patch(f"/api/alerts/{alert_id}", json={"status": "nope"})
        assert invalid.status_code == 422

        bulk = client.post("/api/alerts/bulk-status", json={"ids": [alert_id], "status": "resolved"})
        assert bulk.status_code == 200
        assert bulk.json()["status"] == "resolved"

        alert_report = client.get("/api/alerts/report")
        assert alert_report.status_code == 200
        assert alert_report.text.startswith("alert_id,timestamp,category,severity,status")

        removed = client.post("/api/alerts/delete", json={"ids": [alert_id], "confirm": True})
        assert removed.status_code == 200
        assert removed.json()["deleted"] == 1


def test_detection_without_a_model_fails_clearly(client, data_paths):
    with open(data_paths["traffic"], "rb") as handle:
        response = client.post(
            "/api/detect",
            files={"file": ("traffic.csv", handle, "text/csv")},
            data={"mode": "model", "create_alerts": "false"},
        )
    assert response.status_code == 200
    job = _wait_for_job(client, response.json()["jobId"])
    assert job["status"] == "failed"
    assert "no trained model" in (job["error"] or "").lower()


def test_heuristic_detection_is_labelled_and_raises_no_alerts(client, data_paths):
    with open(data_paths["traffic"], "rb") as handle:
        response = client.post(
            "/api/detect",
            files={"file": ("traffic.csv", handle, "text/csv")},
            data={"mode": "heuristic", "create_alerts": "true"},
        )
    assert response.status_code == 200
    job = _wait_for_job(client, response.json()["jobId"])
    assert job["status"] == "succeeded", job.get("error")
    assert job["result"]["detection"]["modeLabel"] == "Rule-based assessment"
    assert client.get("/api/alerts/stats").json()["total"] == 0


def test_detect_rejects_non_csv(client):
    response = client.post(
        "/api/detect",
        files={"file": ("traffic.json", b"{}", "application/json")},
        data={"mode": "heuristic"},
    )
    assert response.status_code == 400
    assert response.json()["detail"]["error"] == "bad_extension"


def test_detect_rejects_unknown_mode(client, data_paths):
    with open(data_paths["traffic"], "rb") as handle:
        response = client.post(
            "/api/detect",
            files={"file": ("traffic.csv", handle, "text/csv")},
            data={"mode": "psychic"},
        )
    assert response.status_code == 400


def test_train_rejects_unknown_algorithm(client, uploaded):
    response = client.post(
        "/api/models/train",
        json={"datasetId": uploaded["training"], "target": "label", "algorithm": "neural_magic"},
    )
    assert response.status_code == 422


def test_project_files_endpoint(client):
    payload = client.get("/api/datasets/project-files").json()
    assert "files" in payload
    assert payload["directory"] == "data"
