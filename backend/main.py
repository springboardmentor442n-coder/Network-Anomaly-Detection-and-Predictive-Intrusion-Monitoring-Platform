import asyncio, contextlib, csv, hashlib, hmac, json, logging, os, secrets, sqlite3, time, uuid
from collections import Counter, deque
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from pathlib import Path
import jwt, pandas as pd, psutil
from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

try:
    from .engine import Engine
except ImportError:
    from engine import Engine
ROOT = Path(__file__).resolve().parents[1]
from dotenv import load_dotenv
load_dotenv(ROOT / ".env", override=False)
DATA = Path(os.getenv("NETSHIELD_DATA", str(ROOT / "data"))).resolve()
DATA.mkdir(parents=True, exist_ok=True)
DB = DATA / "netshield.db"
CHUNK = int(os.getenv("CHUNK_SIZE", "200"))
MAX_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(512 * 1024 * 1024)))
secretfile = DATA / ".jwt-secret"
if not secretfile.exists():
    try:
        with secretfile.open("x") as f:
            f.write(secrets.token_hex(32))
        secretfile.chmod(0o600)
    except FileExistsError:
        pass
SECRET = os.getenv("JWT_SECRET") or secretfile.read_text().strip()
security = HTTPBearer()
jobs = {}
pool = ThreadPoolExecutor(max_workers=2)
engine = None
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("netshield")


def now():
    return datetime.now(timezone.utc).isoformat()


def capture_hour(value):
    """Use CSV capture time, never ingestion time; ambiguous slash dates are day-first."""
    if not value:return None
    text=str(value).strip()
    try:return datetime.fromisoformat(text.replace("Z", "+00:00")).strftime("%Y-%m-%d %H")
    except ValueError:pass
    for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d-%m-%Y %H:%M:%S"):
        try:return datetime.strptime(text,fmt).strftime("%Y-%m-%d %H")
        except ValueError:pass
    return None


def memory_rss():
    try:
        return round(psutil.Process().memory_info().rss / 1024**2, 2)
    except (psutil.Error, OSError):
        return None


@contextlib.contextmanager
def connection():
    c = sqlite3.connect(DB, timeout=30)
    try:
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA journal_mode=WAL")
        # SQLite's own context manager commits or rolls back, but does not close
        # its connection. Always release the handle, including on exceptions.
        with c:
            yield c
    finally:
        c.close()


def init():
    with connection() as c:
        c.executescript(
            """CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT UNIQUE,password TEXT,role TEXT,created TEXT);
CREATE TABLE IF NOT EXISTS scans(id TEXT PRIMARY KEY,owner TEXT,source TEXT,status TEXT,created TEXT,summary TEXT);
CREATE TABLE IF NOT EXISTS flows(id INTEGER PRIMARY KEY,scan_id TEXT,row_number INTEGER,payload TEXT);
CREATE INDEX IF NOT EXISTS flow_scan ON flows(scan_id,row_number);
CREATE TABLE IF NOT EXISTS incidents(id INTEGER PRIMARY KEY,scan_id TEXT,row_number INTEGER,owner TEXT,label TEXT,risk INTEGER,status TEXT DEFAULT 'Open',note TEXT DEFAULT '',created TEXT);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor TEXT,action TEXT,detail TEXT,created TEXT);"""
        )
        existing = {r["name"] for r in c.execute("PRAGMA table_info(incidents)")}
        for name, definition in [
            ("group_key", "TEXT"),
            ("occurrences", "INTEGER DEFAULT 1"),
            ("src_ip", "TEXT"),
            ("dst_ip", "TEXT"),
            ("last_seen", "TEXT"),
        ]:
            if name not in existing:
                c.execute(f"ALTER TABLE incidents ADD COLUMN {name} {definition}")
        c.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS incident_group ON incidents(group_key)"
        )


def audit(actor, action, detail=""):
    with connection() as c:
        c.execute(
            "INSERT INTO audit(actor,action,detail,created) VALUES(?,?,?,?)",
            (actor, action, detail, now()),
        )


def password_hash(password):
    salt = secrets.token_hex(16)
    value = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), 310000
    ).hex()
    return salt + ":" + value


def password_ok(password, stored):
    salt, expected = stored.split(":")
    return hmac.compare_digest(
        expected,
        hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 310000).hex(),
    )


@asynccontextmanager
async def lifespan(app):
    global engine
    init()
    engine = (
        Engine(ROOT / "models/bundle.joblib")
        if (ROOT / "models/bundle.joblib").exists()
        else None
    )
    # Interrupted history is preserved, but scan positions are never resumed.
    with connection() as c:
        c.execute("UPDATE scans SET status='Interrupted' WHERE status='Running'")
    yield
    for j in jobs.values():
        j["stop"].set()
    await asyncio.gather(*(j["task"] for j in jobs.values()), return_exceptions=True)
    pool.shutdown(wait=True, cancel_futures=True)


app = FastAPI(title="TraceVigil AI", lifespan=lifespan)


class Credentials(BaseModel):
    username: str = Field(min_length=3, max_length=120, pattern=r"^[a-zA-Z0-9@._+-]+$")
    password: str = Field(min_length=10, max_length=128)


def user(auth: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(auth.credentials, SECRET, algorithms=["HS256"])
        name = payload["sub"]
        with connection() as c:
            row = c.execute(
                "SELECT username,role,email,display_name,email_verified,auth_version FROM users WHERE username=?", (name,)
            ).fetchone()
        if not row or not row["email_verified"] or payload.get("v") != row["auth_version"]:
            raise ValueError()
        return dict(row)
    except Exception:
        raise HTTPException(401, "Invalid or expired access token")


def admin(u=Depends(user)):
    if u["role"] != "Admin":
        raise HTTPException(403, "Admin role required")
    return u


def authorize(scan, u):
    with connection() as c:
        row = c.execute("SELECT * FROM scans WHERE id=?", (scan,)).fetchone()
    if not row:
        raise HTTPException(404, "Scan not found")
    if row["owner"] != u["username"] and u["role"] != "Admin":
        raise HTTPException(403, "Scan belongs to another analyst")
    return dict(row)


@app.post("/api/signup")
def signup(body: Credentials):
    with connection() as c:
        try:
            c.execute(
                "INSERT INTO users(username,password,role,created) VALUES(?,?,?,?)",
                (body.username, password_hash(body.password), "Analyst", now()),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(409, "Username already exists")
    audit(body.username, "signup")
    return {"message": "Account created. Log in."}


@app.post("/api/login")
def login(body: Credentials):
    with connection() as c:
        row = c.execute(
            "SELECT * FROM users WHERE username=?", (body.username,)
        ).fetchone()
    if not row or not password_ok(body.password, row["password"]):
        raise HTTPException(401, "Incorrect credentials")
    audit(body.username, "login")
    return {
        "access_token": jwt.encode(
            {
                "sub": body.username,
                "exp": datetime.now(timezone.utc) + timedelta(hours=2),
            },
            SECRET,
            algorithm="HS256",
        ),
        "token_type": "bearer",
        "role": row["role"],
    }


@app.get("/api/me")
def me(u=Depends(user)):
    return u


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "models_ready": engine is not None,
        "transport": "SSE via authenticated fetch; polling fallback",
        "workers": 1,
        "chunk_size": CHUNK,
    }


@app.get("/api/models")
def metrics(u=Depends(user)):
    if not engine:
        raise HTTPException(503, "Run train.py first")
    return engine.bundle["metadata"]


@app.post("/api/upload")
async def upload(file: UploadFile = File(...), u=Depends(user)):
    if u["role"] == "Viewer":
        raise HTTPException(403, "Viewer cannot upload")
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "CSV file required")
    name = "upload_" + uuid.uuid4().hex + ".csv"
    path = DATA / name
    size = 0
    try:
        with path.open("wb") as target:
            while data := await file.read(1024 * 1024):
                size += len(data)
                if size > MAX_BYTES:
                    raise HTTPException(413, "File exceeds upload size limit")
                target.write(data)
        # Uploads remain private: the API lists only each user's own files and demo files.
        with connection() as c:
            c.execute(
                "INSERT INTO audit(actor,action,detail,created) VALUES(?,?,?,?)",
                (u["username"], "upload", name, now()),
            )
    except BaseException:
        path.unlink(missing_ok=True)
        raise
    finally:
        await file.close()
    return {"source": name, "bytes": size, "original_filename": file.filename}


def permitted(source, u):
    path = (DATA / source).resolve()
    if (
        not path.is_relative_to(DATA)
        or path.suffix.lower() != ".csv"
        or not path.is_file()
    ):
        raise HTTPException(400, "Select a CSV in the configured data directory")
    if path.name.startswith("upload_") and u["role"] != "Admin":
        with connection() as c:
            found = c.execute(
                "SELECT 1 FROM audit WHERE actor=? AND action='upload' AND detail=?",
                (u["username"], path.name),
            ).fetchone()
        if not found:
            raise HTTPException(403, "Upload belongs to another analyst")
    return path


@app.get("/api/sources")
def source_inventory(u=Depends(user)):
    with connection() as c:
        own = {
            r["detail"]
            for r in c.execute(
                "SELECT detail FROM audit WHERE actor=? AND action='upload'",
                (u["username"],),
            )
        }
    return [
        {"name": p.relative_to(DATA).as_posix(), "bytes": p.stat().st_size}
        for p in sorted(DATA.rglob("*.csv"))
        if "prepared" not in p.parts
        and (not p.name.startswith("upload_") or p.name in own or u["role"] == "Admin")
    ]


class ScanBody(BaseModel):
    source: str
    transport: str = "sse"


def put(j, kind, **data):
    j["sequence"] += 1
    if len(j["events"]) == j["events"].maxlen:
        j["dropped"] += 1
    j["events"].append({"id": j["sequence"], "type": kind, **data})
    j["ready"].set()


def work_chunk(chunk, offset, scan, owner):
    rows, performance = engine.score(chunk, offset)
    with connection() as c:
        c.executemany(
            "INSERT INTO flows(scan_id,row_number,payload) VALUES(?,?,?)",
            [
                (scan, r["row_number"], json.dumps(r, separators=(",", ":")))
                for r in rows
            ],
        )
        alerts = [
            r
            for r in rows
            if r.get("risk_score", 0) >= 51 or r.get("needs_review", False)
        ]
        grouped = {}
        for r in alerts:
            source = r["src_ip"]["value"] or "Unavailable"
            destination = r["dst_ip"]["value"] or "Unavailable"
            key = hashlib.sha256(
                json.dumps([scan, source, destination, r["consensus"]]).encode()
            ).hexdigest()
            if key not in grouped:
                grouped[key] = {
                    "row": r["row_number"],
                    "source": source,
                    "destination": destination,
                    "label": r["consensus"],
                    "risk": r["risk_score"],
                    "count": 0,
                }
            grouped[key]["risk"] = max(grouped[key]["risk"], r["risk_score"])
            grouped[key]["count"] += 1
        c.executemany(
            """INSERT INTO incidents(scan_id,row_number,owner,label,risk,created,group_key,occurrences,src_ip,dst_ip,last_seen) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(group_key) DO UPDATE SET occurrences=incidents.occurrences+excluded.occurrences,risk=MAX(incidents.risk,excluded.risk),last_seen=excluded.last_seen""",
            [
                (
                    scan,
                    g["row"],
                    owner,
                    g["label"],
                    g["risk"],
                    now(),
                    key,
                    g["count"],
                    g["source"],
                    g["destination"],
                    now(),
                )
                for key, g in grouped.items()
            ],
        )
    return rows, performance, len(alerts)


def next_chunk(reader):
    try:
        return next(reader)
    except StopIteration:
        return None


async def produce(scan, j, path, owner):
    loop = asyncio.get_running_loop()
    reader = None
    start = time.perf_counter()
    processed = scored = invalid = alerts = agree = skipped = 0
    risks = Counter()
    labels = Counter()
    protocols = Counter()
    latencies = []
    model_totals = Counter()
    source_counts = Counter()
    trends = Counter()
    traffic_trends = {}
    status = "Completed"
    try:
        reader = await loop.run_in_executor(
            pool, lambda: pd.read_csv(path, chunksize=CHUNK)
        )
        put(
            j,
            "start",
            scan_id=scan,
            source=path.name,
            chunk_size=CHUNK,
            transport=j["transport"],
            scope=engine.bundle["metadata"]["scope"],
        )
        while not j["stop"].is_set():
            if j["transport"] == "polling" and time.monotonic() - j["last_poll"] > 30:
                j["stop"].set()
                break
            chunk = await loop.run_in_executor(pool, next_chunk, reader)
            if chunk is None:
                break
            if j["stop"].is_set():
                break
            try:
                rows, perf, count = await loop.run_in_executor(
                    pool, work_chunk, chunk, processed, scan, owner
                )
            except Exception as e:
                skipped += len(chunk)
                log.exception("Chunk scoring failure scan=%s", scan)
                put(
                    j,
                    "error",
                    message=str(e),
                    recoverable=True,
                    first_row=processed + 1,
                    skipped_rows=len(chunk),
                )
                processed += len(chunk)
                continue
            processed += len(chunk)
            scored += perf["valid"]
            invalid += perf["invalid"]
            alerts += count
            latencies.append(perf["pipeline_ms"])
            latencies = latencies[-1000:]
            model_totals.update(perf["model_ms"])
            for r in rows:
                protocols[r.get("protocol_name") or r["protocol"] or "Unavailable"] += 1
                if r["status"] == "scored":
                    risks[r["risk_label"]] += 1
                    labels[r["consensus"]] += 1
                    agree += int(r["models_agree"])
                    bucket = capture_hour(r.get("timestamp"))
                    if bucket and (bucket in traffic_trends or len(traffic_trends) < 512):
                        entry = traffic_trends.setdefault(bucket, {"benign": 0, "attacks": 0, "total": 0})
                        entry["total"] += 1
                        entry["benign" if r["consensus"] == "BENIGN" else "attacks"] += 1
                    if r["consensus"] != "BENIGN":
                        address = r["src_ip"]["value"] or "Unavailable"
                        if address in source_counts or len(source_counts) < 5000:
                            source_counts[address] += 1
                        stamp = str(r.get("timestamp") or "Unavailable")[:13]
                        if stamp in trends or len(trends) < 512:
                            trends[stamp] += 1
            # Persist all rows; UI receives a bounded recent window even for large chunks.
            put(
                j,
                "chunk",
                rows=rows[-200:],
                rows_per_second=round(
                    scored / max(0.001, time.perf_counter() - start), 2
                ),
                processed=processed,
                scored=scored,
                invalid=invalid,
                alerts=alerts,
                performance=perf,
                risk_distribution=dict(risks),
                attack_types=dict(labels),
                protocols=dict(protocols),
                top_sources=dict(source_counts.most_common(10)),
                attack_timeline=dict(sorted(trends.items())),
                traffic_timeline=dict(sorted(traffic_trends.items())),
                dropped_messages=j["dropped"],
            )
            await asyncio.sleep(0.01)
        if j["stop"].is_set():
            status = "Stopped"
        elif skipped:
            status = "CompletedWithErrors"
    except Exception as e:
        status = "Failed"
        log.exception("Scan failed")
        put(j, "error", message=str(e), recoverable=False)
    finally:
        if reader:
            await loop.run_in_executor(pool, reader.close)
        elapsed = time.perf_counter() - start
        import numpy as np

        summary = {
            "scan_id": scan,
            "status": status,
            "rows_read": processed,
            "scored": scored,
            "invalid": invalid,
            "skipped_rows": skipped,
            "alerts": alerts,
            "risk_distribution": dict(risks),
            "attack_types": dict(labels),
            "protocols": dict(protocols),
            "top_sources": dict(source_counts.most_common(10)),
            "attack_timeline": dict(sorted(trends.items())),
            "traffic_timeline": dict(sorted(traffic_trends.items())),
            "analytics_caps": {"tracked_sources": 5000, "time_buckets": 512},
            "model_agreement_rate": agree / scored if scored else None,
            "elapsed_seconds": round(elapsed, 3),
            "rows_per_second": round(scored / elapsed, 2) if elapsed else 0,
            "pipeline_p50_ms": float(np.median(latencies)) if latencies else None,
            "pipeline_p95_ms": (
                float(np.percentile(latencies, 95)) if latencies else None
            ),
            "latency_window_chunks": len(latencies),
            "model_total_ms": dict(model_totals),
            "process_rss_mb": memory_rss(),
            "dropped_messages": j["dropped"]
            + int(len(j["events"]) == j["events"].maxlen),
            "scope": engine.bundle["metadata"]["scope"],
            "risk_policy": "mentor-compatible-v1",
        }
        with connection() as c:
            c.execute(
                "UPDATE scans SET status=?,summary=? WHERE id=?",
                (status, json.dumps(summary), scan),
            )
        audit(owner, "scan_" + status.lower(), scan)
        put(j, "done", summary=summary)
        j["finished"] = True


@app.post("/api/scans")
async def create_scan(body: ScanBody, u=Depends(user)):
    if not engine:
        raise HTTPException(503, "Train models first")

    if u["role"] == "Viewer":
        raise HTTPException(403, "Viewer cannot start scans")
    path = permitted(body.source, u)
    if body.transport not in ["sse", "polling"]:
        raise HTTPException(400, "Choose sse or polling")
    if sum(not j["finished"] for j in jobs.values()) >= 2:
        raise HTTPException(429, "Two scans already active; stop or wait")
    if len(jobs) >= 50:
        for key in list(jobs):
            if jobs[key]["finished"]:
                del jobs[key]
    # Validate schema before responding; no hidden zero filling.
    try:
        engine.mapping((await asyncio.to_thread(pd.read_csv, path, nrows=0)).columns)
    except Exception as e:
        raise HTTPException(422, str(e))
    scan = uuid.uuid4().hex
    j = {
        "events": deque(maxlen=8),
        "sequence": 0,
        "dropped": 0,
        "ready": asyncio.Event(),
        "stop": asyncio.Event(),
        "finished": False,
        "transport": body.transport,
        "connected": False,
        "created": time.monotonic(),
        "last_poll": time.monotonic(),
    }
    jobs[scan] = j
    with connection() as c:
        c.execute(
            "INSERT INTO scans VALUES(?,?,?,?,?,?)",
            (scan, u["username"], body.source, "Running", now(), None),
        )
    j["task"] = asyncio.create_task(produce(scan, j, path, u["username"]))
    audit(u["username"], "scan_started", scan)

    async def abandoned():
        await asyncio.sleep(30)
        if not j["connected"] and not j["finished"]:
            j["stop"].set()

    asyncio.create_task(abandoned())
    return {
        "scan_id": scan,
        "events_url": f"/api/scans/{scan}/events",
        "restart_rule": "Every new scan starts at row 1",
    }


@app.get("/api/scans/{scan}/events")
async def events(scan: str, request: Request, u=Depends(user)):
    authorize(scan, u)
    j = jobs.get(scan)
    if not j:
        raise HTTPException(
            410, "Server restarted or scan expired. Click Scan to start a NEW scan."
        )
    if j["transport"] != "sse":
        raise HTTPException(409, "Scan transport is polling")
    if j["connected"]:
        raise HTTPException(409, "Scan already has a consumer")
    j["connected"] = True

    async def generate():
        disconnected = asyncio.Event()

        async def watch_disconnect():
            while True:
                message = await request.receive()
                if message["type"] == "http.disconnect":
                    disconnected.set()
                    j["stop"].set()
                    j["ready"].set()
                    return

        watcher = asyncio.create_task(watch_disconnect())
        try:
            while True:
                if disconnected.is_set():
                    break
                if j["events"]:
                    event = j["events"].popleft()
                    yield f"id: {event['id']}\nevent: {event['type']}\ndata: {json.dumps(event)}\n\n"
                    if event["type"] == "done":
                        break
                elif j["finished"]:
                    break
                else:
                    j["ready"].clear()
                    try:
                        await asyncio.wait_for(j["ready"].wait(), timeout=20)
                    except asyncio.TimeoutError:
                        j["sequence"] += 1
                        yield f"id: {j['sequence']}\nevent: heartbeat\ndata: {json.dumps({'id':j['sequence'],'type':'heartbeat'})}\n\n"
        finally:
            watcher.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await watcher
            if not j["finished"]:
                j["stop"].set()

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/scans/{scan}/poll")
async def poll(scan: str, u=Depends(user)):
    authorize(scan, u)
    j = jobs.get(scan)
    if not j:
        raise HTTPException(410, "Scan no longer in this process")
    if j["transport"] != "polling":
        raise HTTPException(409, "Scan transport is SSE")
    j["connected"] = True
    j["last_poll"] = time.monotonic()
    events = list(j["events"])
    j["events"].clear()
    return {"events": events, "finished": j["finished"]}


@app.post("/api/scans/{scan}/stop")
async def stop(scan: str, u=Depends(user)):
    authorize(scan, u)
    if scan in jobs:
        jobs[scan]["stop"].set()
    return {
        "message": "Stop requested; current bounded inference may finish, no further chunks read"
    }


@app.get("/api/scans")
def history(u=Depends(user)):
    with connection() as c:
        rows = (
            c.execute("SELECT * FROM scans ORDER BY created DESC LIMIT 50").fetchall()
            if u["role"] == "Admin"
            else c.execute(
                "SELECT * FROM scans WHERE owner=? ORDER BY created DESC LIMIT 50",
                (u["username"],),
            ).fetchall()
        )
    return [dict(r) for r in rows]


@app.get("/api/scans/{scan}/report")
def report(scan: str, u=Depends(user)):
    record = authorize(scan, u)
    record["summary"] = json.loads(record["summary"]) if record["summary"] else None
    return {"scan": record, "models": engine.bundle["metadata"] if engine else None}


@app.get("/api/scans/{scan}/report-html", response_class=HTMLResponse)
def report_html(scan: str, u=Depends(user)):
    try:
        from .reports import render_report
    except ImportError:
        from reports import render_report
    record = authorize(scan, u)
    record["summary"] = json.loads(record["summary"]) if record["summary"] else None
    return render_report(record, engine.bundle["metadata"] if engine else {})


@app.get("/api/scans/{scan}/export")
def export(scan: str, u=Depends(user)):
    authorize(scan, u)

    def lines():
        with connection() as c:
            for row in c.execute(
                "SELECT payload FROM flows WHERE scan_id=? ORDER BY row_number", (scan,)
            ):
                yield row["payload"] + "\n"

    return StreamingResponse(
        lines(),
        media_type="application/x-ndjson",
        headers={"Content-Disposition": f'attachment; filename="{scan}.ndjson"'},
    )


@app.delete("/api/scans/{scan}")
def delete_scan(scan: str, u=Depends(user)):
    record = authorize(scan, u)
    if u["role"] == "Viewer":
        raise HTTPException(403, "Viewer cannot delete scans")
    if record["status"] == "Running":
        raise HTTPException(409, "Stop the scan and wait for completion first")
    with connection() as c:
        c.execute("DELETE FROM flows WHERE scan_id=?", (scan,))
        c.execute("DELETE FROM incidents WHERE scan_id=?", (scan,))
        c.execute("DELETE FROM scans WHERE id=?", (scan,))
    jobs.pop(scan, None)
    audit(u["username"], "scan_deleted", scan)
    return {"message": "Scan results and incidents deleted; source CSV preserved"}


@app.get("/api/incidents")
def incidents(u=Depends(user)):
    with connection() as c:
        rows = (
            c.execute("SELECT * FROM incidents ORDER BY id DESC LIMIT 200").fetchall()
            if u["role"] == "Admin"
            else c.execute(
                "SELECT * FROM incidents WHERE owner=? ORDER BY id DESC LIMIT 200",
                (u["username"],),
            ).fetchall()
        )
    return [dict(r) for r in rows]


class IncidentUpdate(BaseModel):
    status: str
    note: str = Field(default="", max_length=2000)


@app.patch("/api/incidents/{incident}")
def incident_update(incident: int, body: IncidentUpdate, u=Depends(user)):
    if u["role"] == "Viewer":
        raise HTTPException(403, "Viewer cannot modify incidents")
    if body.status not in ["Open", "Investigating", "Resolved", "False Positive"]:
        raise HTTPException(422, "Invalid status")
    with connection() as c:
        row = c.execute(
            "SELECT owner FROM incidents WHERE id=?", (incident,)
        ).fetchone()
        if not row:
            raise HTTPException(404, "Incident not found")
        if row["owner"] != u["username"] and u["role"] != "Admin":
            raise HTTPException(403, "Incident belongs to another analyst")
        c.execute(
            "UPDATE incidents SET status=?,note=? WHERE id=?",
            (body.status, body.note, incident),
        )
    audit(u["username"], "incident_updated", str(incident))
    return {"status": body.status}


@app.get("/api/team")
def team(u=Depends(admin)):
    with connection() as c:
        return [
            dict(r) for r in c.execute("SELECT id,username,role,created FROM users")
        ]


class RoleUpdate(BaseModel):
    role: str


@app.patch("/api/team/{username}")
def role_update(username: str, body: RoleUpdate, u=Depends(admin)):
    if body.role not in ["Admin", "Analyst", "Viewer"]:
        raise HTTPException(422, "Invalid role")
    if username == u["username"]:
        raise HTTPException(400, "Cannot change your own role")
    with connection() as c:
        result = c.execute(
            "UPDATE users SET role=? WHERE username=?", (body.role, username)
        )
        if not result.rowcount:
            raise HTTPException(404, "User not found")
    audit(u["username"], "role_changed", username + ":" + body.role)
    return {"role": body.role}


@app.get("/api/audit")
def audits(u=Depends(admin)):
    with connection() as c:
        return [
            dict(r) for r in c.execute("SELECT * FROM audit ORDER BY id DESC LIMIT 200")
        ]


@app.get("/")
def index():
    return FileResponse(ROOT / "frontend/index.html")


from .investigation import install as install_investigation
import sys
install_investigation(sys.modules[__name__])
from .secure_auth import install as install_secure_auth
install_secure_auth(sys.modules[__name__])

app.mount("/static", StaticFiles(directory=ROOT / "frontend"), name="static")
