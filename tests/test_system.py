import json, os, tempfile, shutil, uuid, time
from pathlib import Path
import pytest, pandas as pd

TMP = Path(tempfile.mkdtemp())
os.environ["NETSHIELD_DATA"] = str(TMP)
os.environ["CHUNK_SIZE"] = "50"
ROOT = Path(__file__).resolve().parents[1]
for f in (ROOT / "data").glob("*.csv"):
    shutil.copy(f, TMP / f.name)
from backend import main
from backend.engine import Engine, risk, ip
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    with TestClient(main.app) as c:
        yield c
    shutil.rmtree(TMP)


def account(c, name):
    body = {"username": name, "password": "StrongPassword2026!"}
    assert c.post("/api/signup", json=body).status_code == 200
    r = c.post("/api/login", json=body)
    assert r.status_code == 200
    return {"Authorization": "Bearer " + r.json()["access_token"]}


@pytest.fixture(scope="module")
def auth(client):
    return account(client, "testanalyst")


def scan(c, h, source="sample_traffic.csv", transport="sse"):
    r = c.post("/api/scans", json={"source": source, "transport": transport}, headers=h)
    assert r.status_code == 200, r.text
    return r.json()["scan_id"]


def messages(text):
    return [
        json.loads(line[6:]) for line in text.splitlines() if line.startswith("data: ")
    ]


def test_risk_boundaries():
    assert risk("DDoS", 0.8)["risk_score"] == 72
    assert risk("DDoS", 0.8)["risk_label"] == "High"
    assert risk("BENIGN", 1)["risk_score"] == 0
    for x, label in [(25, "Low"), (50, "Medium"), (75, "High"), (76, "Critical")]:
        assert risk("Heartbleed", x / 95)["risk_label"] == label
    assert risk("PortScan", 1)["severity"] == 30
    assert risk("new label", 0.8)["unknown_severity"]


def test_ip():
    assert ip("192.0.2.1")["status"] == "valid"
    assert ip("2001:db8::1")["status"] == "valid"
    assert ip("bad")["status"] == "invalid"


def test_health_auth_roles(client, auth):
    assert client.get("/api/health").json()["models_ready"]
    assert client.get("/api/models").status_code in [401, 403]
    assert client.get("/api/team", headers=auth).status_code == 403
    assert client.get("/", headers=auth).status_code == 200
    assert client.get("/api/models", headers=auth).json()["demo"] is False


def test_full_stream_restart_and_export(client, auth):
    for iteration in range(2):
        sid = scan(client, auth)
        response = client.get("/api/scans/" + sid + "/events", headers=auth)
        events = messages(response.text)
        assert response.headers["content-type"].startswith("text/event-stream")
        assert events[0]["type"] == "start"
        assert events[-1]["type"] == "done"
        ids = [e["id"] for e in events]
        assert ids == sorted(set(ids))
        rows = [r for e in events if e["type"] == "chunk" for r in e["rows"]]
        assert [r["row_number"] for r in rows] == list(range(1, 303))
        assert all(len(r["models"]) == 3 for r in rows)
        assert rows[0]["src_ip"]["status"] == "column_absent"
        summary = events[-1]["summary"]
        assert summary["rows_read"] == 302
        assert summary["scored"] == 302
        report = client.get("/api/scans/" + sid + "/report", headers=auth).json()
        assert report["scan"]["summary"]["rows_read"] == 302
        exported = client.get(
            "/api/scans/" + sid + "/export", headers=auth
        ).text.splitlines()
        assert len(exported) == 302
        assert (
            client.get("/api/scans/" + sid + "/events", headers=auth).status_code == 409
        )


@pytest.mark.parametrize("source", ["../main.py", "missing.csv"])
def test_path_validation(client, auth, source):
    assert (
        client.post("/api/scans", json={"source": source}, headers=auth).status_code
        == 400
    )


def test_schema_invalid_values_and_truth_not_used(client, auth):
    df = pd.read_csv(ROOT / "data/sample_traffic.csv").head(6)
    original = df.copy()
    df[df.columns[0]] = df[df.columns[0]].astype(float)
    df.loc[0, df.columns[0]] = float("inf")
    df["Label"] = "DDoS"
    df["Src IP"] = "bad-ip"
    df["Dst IP"] = "2001:db8::1"
    path = TMP / "quality.csv"
    df.to_csv(path, index=False)
    sid = scan(client, auth, "quality.csv")
    events = messages(client.get("/api/scans/" + sid + "/events", headers=auth).text)
    rows = [r for e in events if e["type"] == "chunk" for r in e["rows"]]
    assert rows[0]["status"] == "invalid"
    assert rows[1]["src_ip"]["status"] == "invalid"
    assert rows[1]["dst_ip"]["status"] == "valid"
    assert events[-1]["summary"]["invalid"] == 1
    eng = main.engine
    a, _ = eng.score(original, 0)
    b, _ = eng.score(original.assign(Label="DDoS"), 0)
    assert [r["models"] for r in a] == [r["models"] for r in b]
    df.drop(columns=[df.columns[0]]).to_csv(TMP / "missingfeature.csv", index=False)
    assert (
        client.post(
            "/api/scans", json={"source": "missingfeature.csv"}, headers=auth
        ).status_code
        == 422
    )


def test_polling_and_stop(client, auth):
    sid = scan(client, auth, transport="polling")
    events = []
    for _ in range(300):
        data = client.get("/api/scans/" + sid + "/poll", headers=auth).json()
        events += data["events"]
        if data["finished"]:
            break
        time.sleep(0.02)
    assert events[-1]["type"] == "done"
    assert events[-1]["summary"]["rows_read"] == 302
    sid = scan(client, auth, transport="polling")
    assert client.post("/api/scans/" + sid + "/stop", headers=auth).status_code == 200
    for _ in range(300):
        report = client.get("/api/scans/" + sid + "/report", headers=auth).json()
        if report["scan"]["summary"]:
            break
        time.sleep(0.02)
    assert report["scan"]["status"] == "Stopped"
    assert report["scan"]["summary"]["rows_read"] < 302
    assert client.get("/api/scans/" + sid + "/report", headers=auth).status_code == 200


def test_ownership_upload_incident_rbac(client, auth):
    other = account(client, "otheranalyst")
    upload = client.post(
        "/api/upload",
        files={
            "file": (
                "flows.csv",
                (ROOT / "data/sample_traffic.csv").read_bytes(),
                "text/csv",
            )
        },
        headers=auth,
    )
    assert upload.status_code == 200
    source = upload.json()["source"]
    assert source not in [
        x["name"] for x in client.get("/api/sources", headers=other).json()
    ]
    assert (
        client.post("/api/scans", json={"source": source}, headers=other).status_code
        == 403
    )
    sid = scan(client, auth)
    client.get("/api/scans/" + sid + "/events", headers=auth)
    assert client.get("/api/scans/" + sid + "/report", headers=other).status_code == 403
    incidents = client.get("/api/incidents", headers=auth).json()
    assert incidents
    i = incidents[0]["id"]
    body = {"status": "Investigating", "note": "Inspect source flow"}
    assert (
        client.patch("/api/incidents/" + str(i), json=body, headers=other).status_code
        == 403
    )
    assert (
        client.patch("/api/incidents/" + str(i), json=body, headers=auth).status_code
        == 200
    )
    with main.connection() as c:
        c.execute("UPDATE users SET role='Viewer' WHERE username='otheranalyst'")
    assert (
        client.post(
            "/api/scans", json={"source": "sample_traffic.csv"}, headers=other
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/upload", files={"file": ("a.csv", b"foo", "text/csv")}, headers=other
        ).status_code
        == 403
    )


def test_slow_consumer_buffer_and_durable_export(client, auth):
    old = main.CHUNK
    main.CHUNK = 20
    try:
        sid = scan(client, auth, transport="polling")
        for _ in range(500):
            if main.jobs[sid]["finished"]:
                break
            time.sleep(0.03)
        j = main.jobs[sid]
        assert j["finished"]
        assert len(j["events"]) <= 8
        assert j["dropped"] > 0
        report = client.get("/api/scans/" + sid + "/report", headers=auth).json()[
            "scan"
        ]["summary"]
        assert report["rows_read"] == 302
        assert (
            len(
                client.get(
                    "/api/scans/" + sid + "/export", headers=auth
                ).text.splitlines()
            )
            == 302
        )
        assert j["events"][-1]["type"] == "done"
    finally:
        main.CHUNK = old


def test_chunk_failure_continues_and_is_reported(client, auth, monkeypatch):
    original = main.engine.score
    calls = [0]

    def faulty(chunk, offset):
        calls[0] += 1
        if calls[0] == 1:
            raise ValueError("Injected first-chunk inference failure")
        return original(chunk, offset)

    monkeypatch.setattr(main.engine, "score", faulty)
    sid = scan(client, auth)
    events = messages(client.get("/api/scans/" + sid + "/events", headers=auth).text)
    assert any(e["type"] == "error" and e["recoverable"] for e in events)
    summary = events[-1]["summary"]
    assert summary["status"] == "CompletedWithErrors"
    assert summary["skipped_rows"] == 50
    assert summary["scored"] == 252


def test_restart_has_no_resume_cursor(client, auth):
    sid = scan(client, auth)
    client.get("/api/scans/" + sid + "/events", headers=auth)
    del main.jobs[sid]
    assert client.get("/api/scans/" + sid + "/events", headers=auth).status_code == 410
    assert (
        client.get("/api/scans/" + sid + "/report", headers=auth).json()["scan"][
            "summary"
        ]["rows_read"]
        == 302
    )


def test_telemetry_failure_does_not_fail_scan(client, auth, monkeypatch):
    def broken():
        raise main.psutil.NoSuchProcess(999999)

    monkeypatch.setattr(main.psutil, "Process", broken)
    sid = scan(client, auth)
    events = messages(client.get("/api/scans/" + sid + "/events", headers=auth).text)
    assert events[-1]["summary"]["status"] == "Completed"
    assert events[-1]["summary"]["process_rss_mb"] is None


def test_real_ip_demo_and_grouped_incidents(client, auth):
    sid = scan(client, auth, "cicids_demo_real_ips.csv")
    events = messages(client.get("/api/scans/" + sid + "/events", headers=auth).text)
    rows = [r for e in events if e["type"] == "chunk" for r in e["rows"]]
    assert rows
    assert all(
        r["src_ip"]["status"] == "valid" and r["dst_ip"]["status"] == "valid"
        for r in rows
    )
    assert any(r["src_port"] is not None for r in rows)
    assert all("review_reasons" in r and len(r["feature_evidence"]) == 15 for r in rows)
    html = client.get("/api/scans/" + sid + "/report-html", headers=auth)
    assert html.status_code == 200
    assert "NetShield AI Security Analysis Report" in html.text
    assert "Top predicted attack sources" in html.text
    with main.connection() as c:
        incidents = c.execute(
            "SELECT occurrences FROM incidents WHERE scan_id=?", (sid,)
        ).fetchall()
    assert sum(r["occurrences"] for r in incidents) == events[-1]["summary"]["alerts"]
    assert len(incidents) <= events[-1]["summary"]["alerts"]


def test_nested_source_and_cleanup(client, auth):
    nested = TMP / "cicids"
    nested.mkdir(exist_ok=True)
    shutil.copy(ROOT / "data/sample_traffic.csv", nested / "tiny.csv")
    assert "cicids/tiny.csv" in [
        r["name"] for r in client.get("/api/sources", headers=auth).json()
    ]
    sid = scan(client, auth, "cicids/tiny.csv")
    client.get("/api/scans/" + sid + "/events", headers=auth)
    assert client.delete("/api/scans/" + sid, headers=auth).status_code == 200
    assert (nested / "tiny.csv").exists()
    assert client.get("/api/scans/" + sid + "/report", headers=auth).status_code == 404
    with main.connection() as c:
        assert (
            c.execute("SELECT COUNT(*) FROM flows WHERE scan_id=?", (sid,)).fetchone()[
                0
            ]
            == 0
        )
