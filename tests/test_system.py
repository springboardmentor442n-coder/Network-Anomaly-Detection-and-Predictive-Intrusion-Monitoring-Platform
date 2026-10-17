import json, os, tempfile, shutil, uuid, time
from pathlib import Path
import pytest, pandas as pd

ROOT = Path(__file__).resolve().parents[1]
TMP = Path(tempfile.mkdtemp(prefix="tracevigil-tests-"))
os.environ["NETSHIELD_DATA"] = str(TMP)
os.environ["CHUNK_SIZE"] = "50"
# Only the small committed real-IP demo is needed. Do not copy a user's large
# datasets or depend on the ignored legacy data/sample_traffic.csv file.
DEMO = ROOT / "data/cicids_demo_real_ips.csv"
SAMPLE = TMP / "sample_traffic.csv"
demo_rows = pd.read_csv(DEMO, nrows=302)
if demo_rows.empty:
    raise ValueError("The committed CICIDS demo must contain rows for integration tests")
features = json.loads((ROOT / "models/metrics.json").read_text(encoding="utf-8"))["features"]
# Repeated rows provide a deterministic 302-row streaming test fixture only.
# They are not a new evaluation dataset or evidence of model accuracy.
sample_rows = demo_rows.iloc[[i % len(demo_rows) for i in range(302)]]
sample_rows.loc[:, features].to_csv(SAMPLE, index=False)
shutil.copy(DEMO, TMP / DEMO.name)
from backend import main
from backend.engine import Engine, risk, ip
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client(auth_providers):
    try:
        with TestClient(main.app) as c:
            yield c
    finally:
        shutil.rmtree(TMP)


@pytest.fixture(scope="module", autouse=True)
def auth_providers():
    from backend import secure_auth
    patch=pytest.MonkeyPatch()
    patch.setenv("REGISTRATION_CODE","test-invitation")
    # Local .env allowlists must not reject the suite's dummy email accounts.
    # This is scoped to the test process; never edit the user's .env file.
    patch.setenv("AUTHORIZED_EMAILS", "")
    for key in ["SMTP_HOST","SMTP_FROM","SMTP_USER","SMTP_PASSWORD"]:patch.setenv(key,"test-only")
    global REAL_CAPTCHA
    REAL_CAPTCHA=secure_auth.captcha
    patch.setattr(secure_auth,"captcha",lambda token,request:None)
    patch.setattr(secure_auth,"send_code",lambda email,code: TEST_MAIL.__setitem__(email,code))
    yield
    patch.undo()

TEST_MAIL={}
def account(c, name):
    body={"username":name,"display_name":name,"email":name+"@example.test","password":"StrongPassword2026!","confirm_password":"StrongPassword2026!","invitation_code":"test-invitation","accept_policy":True,"captcha_token":"mock"}
    with main.connection() as conn:conn.execute("DELETE FROM auth_limits")
    r=c.post("/api/signup",json=body);assert r.status_code==200,r.text
    assert c.post("/api/auth/verify",json={"challenge_id":r.json()["challenge_id"],"code":TEST_MAIL[body['email']]}).status_code==200
    r=c.post("/api/login",json={"email":body['email'],"password":body['password'],"captcha_token":"mock"})
    assert r.status_code==200,r.text
    return {"Authorization":"Bearer "+r.json()["access_token"]}


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


def test_connection_commit_rollback_and_close(client):
    with main.connection() as c:
        c.execute("CREATE TABLE connection_probe(value TEXT)")
        c.execute("INSERT INTO connection_probe VALUES ('committed')")
    with pytest.raises(main.sqlite3.ProgrammingError, match="closed"):
        c.execute("SELECT 1")
    with pytest.raises(RuntimeError, match="rollback probe"):
        with main.connection() as failed:
            failed.execute("INSERT INTO connection_probe VALUES ('rolled back')")
            raise RuntimeError("rollback probe")
    with pytest.raises(main.sqlite3.ProgrammingError, match="closed"):
        failed.execute("SELECT 1")
    with main.connection() as check:
        assert [r[0] for r in check.execute("SELECT value FROM connection_probe")] == ["committed"]


def test_signup_email_allowlist(client, monkeypatch):
    monkeypatch.setenv("AUTHORIZED_EMAILS", "approvedanalyst@example.test")
    rejected = client.post("/api/signup", json={
        "username": "blockedanalyst", "display_name": "Blocked Analyst",
        "email": "blockedanalyst@example.test", "password": "StrongPassword2026!",
        "confirm_password": "StrongPassword2026!", "invitation_code": "test-invitation",
        "accept_policy": True, "captcha_token": "mock",
    })
    assert rejected.status_code == 403
    assert rejected.json()["detail"] == "This email is not authorised for the workspace"
    assert "blockedanalyst@example.test" not in TEST_MAIL
    approved = account(client, "approvedanalyst")
    assert client.get("/api/me", headers=approved).status_code == 200


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
    df = pd.read_csv(SAMPLE).head(6)
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
                SAMPLE.read_bytes(),
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
    assert "TraceVigil AI Security Analysis Report" in html.text
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
    shutil.copy(SAMPLE, nested / "tiny.csv")
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


def test_native_xgboost_artifact_and_missing_file(tmp_path):
    import joblib

    bundle = joblib.load(ROOT / "models/bundle.joblib")
    assert "xgboost" not in bundle["models"]
    assert bundle["native_xgboost"] == "xgboost_model.json"
    assert list(main.engine.models) == ["random_forest", "xgboost", "extra_trees"]
    shutil.copy(ROOT / "models/bundle.joblib", tmp_path / "bundle.joblib")
    with pytest.raises(FileNotFoundError, match="Missing native XGBoost model"):
        Engine(tmp_path / "bundle.joblib")


def test_investigation_addons(client, auth):
    from backend.investigation import baseline
    from openpyxl import load_workbook
    import io
    uid='addon-'+uuid.uuid4().hex
    import pandas as pd
    demo=pd.read_csv(ROOT/'data/cicids_demo_real_ips.csv').head(25)
    evidence,_=main.engine.score(demo,0)
    first=next(r for r in evidence if r['status']=='scored')
    source=first['src_ip']['value'] or 'Unavailable';dest=first['dst_ip']['value'] or 'Unavailable'
    first['needs_review']=True
    first['row_number']=25
    first['timestamp']='2026-10-15 12:00:00'
    summary={'rows_read':1,'scored':1,'alerts':1,'attack_types':{first['consensus']:1}}
    with main.connection() as c:
        c.execute('INSERT INTO scans(id,owner,source,status,created,summary) VALUES(?,?,?,?,?,?)',(uid,'testanalyst','demo.csv','Completed',main.now(),json.dumps(summary)))
        for num in range(1,25):
            earlier=dict(first);earlier['row_number']=num
            earlier['timestamp']='2026-10-14 12:00:00' if num<24 else '2026-10-16 12:00:00'
            earlier['needs_review']=False
            c.execute('INSERT INTO flows(scan_id,row_number,payload) VALUES(?,?,?)',(uid,num,json.dumps(earlier)))
        c.execute('INSERT INTO flows(scan_id,row_number,payload) VALUES(?,?,?)',(uid,first['row_number'],json.dumps(first)))
        cur=c.execute('INSERT INTO incidents(scan_id,row_number,owner,label,risk,status,note,created,group_key,occurrences,src_ip,dst_ip) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',(uid,first['row_number'],'testanalyst',first['consensus'],first['risk_score'],'Open','=1+1',main.now(),uid,1,source,dest));iid=cur.lastrowid
    base='/api/incidents/'+str(iid)
    r=client.get(base+'/case',headers=auth);assert r.status_code==200,r.text
    assert r.json()['anchor']['row_number']==first['row_number']
    assert all(r['status']=='available' and r['samples']==23 for r in r.json()['baseline'])
    explain=client.get(base+'/explanation',headers=auth);assert explain.status_code==200,explain.text
    assert explain.json()['sum_check'] and len(explain.json()['features'])==15
    pdf=client.get(base+'/case.pdf',headers=auth);assert pdf.content.startswith(b'%PDF-')
    book=client.get('/api/incidents-export.xlsx',headers=auth);assert book.status_code==200
    wb=load_workbook(io.BytesIO(book.content));cells=[c for row in wb.active for c in row if c.value=='=1+1'];assert cells and all(c.data_type=='s' for c in cells)
    overview=client.get('/api/overview',headers=auth);assert overview.json()['totals']['rows_read']>=1
    other=account(client,'other'+uuid.uuid4().hex[:8])
    for route in ['/case','/explanation','/case.pdf']:assert client.get(base+route,headers=other).status_code==403
    for route in ['/api/overview',base+'/case','/api/incidents-export.xlsx']:assert client.get(route).status_code in [401,403]
    # Constant histories are explicit rather than dividing by zero.
    b=baseline([{'feature_evidence':{'x':2}}]*20,{'feature_evidence':{'x':5}},['x'])[0]
    assert b['constant_reference_deviation'] and b['z_score'] is None


def test_verified_auth_lifecycle(client):
    from backend import secure_auth
    from starlette.requests import Request
    def payload(name):return {"username":name,"display_name":"Mansi G","email":name+"@example.test","password":"StrongPassword2026!","confirm_password":"StrongPassword2026!","invitation_code":"test-invitation","accept_policy":True,"captcha_token":"mock"}
    with main.connection() as c:c.execute('DELETE FROM auth_limits')
    b=payload('security'+uuid.uuid4().hex[:6]);r=client.post('/api/signup',json=b);assert r.status_code==200,r.text
    challenge=r.json()['challenge_id'];code=TEST_MAIL[b['email']]
    assert 'code' not in r.json() and 'access_token' not in r.json()
    assert client.post('/api/login',json={'email':b['email'],'password':b['password']}).status_code==401
    wrong='000000' if code!='000000' else '111111'
    assert client.post('/api/auth/verify',json={'challenge_id':challenge,'code':wrong}).status_code==400
    assert client.post('/api/auth/verify',json={'challenge_id':challenge,'code':code}).status_code==200
    assert client.post('/api/auth/verify',json={'challenge_id':challenge,'code':code}).status_code==400
    login=client.post('/api/login',json={'email':b['email'],'password':b['password']});assert login.status_code==200
    headers={'Authorization':'Bearer '+login.json()['access_token']}
    assert client.get('/api/me',headers=headers).json()['display_name']=='Mansi G'
    assert client.get('/api/me',headers=headers).headers['cache-control']=='no-store'
    with main.connection() as c:c.execute('UPDATE users SET auth_version=auth_version+1 WHERE username=?',(b['username'],))
    assert client.get('/api/me',headers=headers).status_code==401
    # Expiry and attempt exhaustion persist in the database.
    with main.connection() as c:c.execute('DELETE FROM auth_limits')
    b2=payload('expiry'+uuid.uuid4().hex[:6]);r=client.post('/api/signup',json=b2);cid=r.json()['challenge_id']
    for _ in range(5):assert client.post('/api/auth/verify',json={'challenge_id':cid,'code':'000000' if TEST_MAIL[b2['email']]!='000000' else '111111'}).status_code==400
    assert client.post('/api/auth/verify',json={'challenge_id':cid,'code':TEST_MAIL[b2['email']]}).status_code==400
    with main.connection() as c:c.execute('DELETE FROM auth_limits')
    b3=payload('expired'+uuid.uuid4().hex[:6]);r=client.post('/api/signup',json=b3);cid=r.json()['challenge_id']
    with main.connection() as c:c.execute('UPDATE enrollment SET expires=0 WHERE id=?',(cid,))
    assert client.post('/api/auth/verify',json={'challenge_id':cid,'code':TEST_MAIL[b3['email']]}).status_code==400
    with main.connection() as c:c.execute('DELETE FROM auth_limits')
    b4=payload('legacy'+uuid.uuid4().hex[:6])
    with main.connection() as c:c.execute('INSERT INTO users(username,password,role,created) VALUES(?,?,?,?)',(b4['username'],main.password_hash(b4['password']),'Analyst',main.now()))
    b4['legacy_username']=b4['username'];r=client.post('/api/signup',json=b4);assert r.status_code==200,r.text
    assert client.post('/api/auth/verify',json={'challenge_id':r.json()['challenge_id'],'code':TEST_MAIL[b4['email']]}).status_code==200
    assert client.post('/api/login',json={'email':b4['email'],'password':b4['password']}).status_code==200
    assert client.post('/api/login',json={'username':b4['username'],'password':b4['password']}).status_code==422
    # Missing provider configuration fails closed; hostname and action are checked.
    request=Request({'type':'http','headers':[],'client':('127.0.0.1',1)})
    with pytest.MonkeyPatch.context() as patch:
        patch.delenv('TURNSTILE_SECRET_KEY',raising=False)
        with pytest.raises(main.HTTPException) as e:REAL_CAPTCHA('token',request)
        assert e.value.status_code==503
        patch.setenv('TURNSTILE_SECRET_KEY','secret');patch.setenv('TURNSTILE_HOSTNAME','localhost')
        class Fake:
            def json(self):return {'success':True,'hostname':'evil.example','action':'auth'}
        patch.setattr(secure_auth.httpx,'post',lambda *a,**k:Fake())
        with pytest.raises(main.HTTPException) as e:REAL_CAPTCHA('token',request)
        assert e.value.status_code==400


def test_capture_hour_and_auth_limits(client):
    assert main.capture_hour('2017-07-05 13:12:00')=='2017-07-05 13'
    assert main.capture_hour('05/07/2017 13:12')=='2017-07-05 13'
    assert main.capture_hour('missing') is None
    with main.connection() as c:c.execute('DELETE FROM auth_limits')
    body={'email':'absent@example.test','password':'wrong'}
    for _ in range(15):assert client.post('/api/login',json=body).status_code==401
    assert client.post('/api/login',json=body).status_code==429
