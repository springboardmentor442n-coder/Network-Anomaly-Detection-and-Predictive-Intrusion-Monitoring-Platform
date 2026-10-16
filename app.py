import asyncio, csv, hmac, io, json, os, re, time
try:
    from dotenv import load_dotenv; load_dotenv()  # reads .env from the project folder
except ImportError:
    pass
from collections import Counter
from datetime import datetime, timedelta, timezone
import joblib, numpy as np, pandas as pd
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool
from fastapi.templating import Jinja2Templates
from live_capture import capture_flows
from live_processor import features, predict, save, summarize
import perf
from risk_engine import SEVERITY_TABLE, compute_risk_score

DATA_PATH = os.getenv("NETSHIELD_DATA", "dataset/UNSW_NB15_testing-set.parquet")
MODEL_DIR = os.getenv("NETSHIELD_MODEL_DIR", "model")
DB_PATH = os.getenv("NETSHIELD_DB", "netshield.db")
INGEST_KEY = os.getenv("NETSHIELD_INGEST_KEY", "dev-ingest-key")  # CHANGE in production
CHUNK, HEARTBEAT, DELAY = 500, 20, float(os.getenv("NETSHIELD_DELAY", "0.2"))
now = lambda: datetime.now(timezone.utc)

# ---------- SQL: MySQL/MariaDB from XAMPP (see db.py) ----------
from db import sql, insert_id, init as init_db
init_db()
import live_processor as lp
lp.get_model(lp.active_name())  # load the active model at startup

# ---------- auth (auth.py: SQLite users, PBKDF2 hashes, signed expiring tokens) ----------
import auth

from security import audit, current_user, require

class Cred(BaseModel):
    username: str
    password: str

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

def _page(name):
    def view(request: Request):
        return templates.TemplateResponse(request, name + ".html", {"page": name})
    return view

PAGES = {"/": "dashboard", "/live": "live_monitor", "/alerts": "alerts", "/risk": "risk_scoring",
         "/history": "history", "/models": "models", "/performance": "performance", "/incidents": "incidents", "/reports": "reports", "/admin": "admin", "/detection": "detection", "/login": "login", "/register": "register"}
for _path, _name in PAGES.items():
    app.add_api_route(_path, _page(_name), methods=["GET"], include_in_schema=False)

@app.middleware("http")
async def timing(request: Request, call_next):
    t0 = time.perf_counter()
    resp = await call_next(request)
    if request.url.path.startswith("/api/") and request.url.path not in ("/api/live", "/api/scan"):   # streams stay open on purpose
        perf.record("api_ms", (time.perf_counter() - t0) * 1000)
    return resp

from extras import router as extras_router
app.include_router(extras_router)

@app.post("/api/register")
def register(c: Cred, request: Request):
    u = c.username.strip()
    if not 3 <= len(u) <= 32 or len(c.password) < 8:
        raise HTTPException(400, "Username 3-32 characters, password 8+ characters")
    if not auth.create_user(u, c.password):
        raise HTTPException(409, "That username is taken")
    audit(u.lower(), "register", "", request)
    return {"token": auth.make_token(u), "user": u.lower(), "role": auth.get_role(u)}

@app.post("/api/login")
def login(c: Cred, request: Request):
    u = c.username.strip()
    if not auth.check_user(u, c.password):
        audit(u.lower()[:32], "login_failed", "", request)
        raise HTTPException(401, "Wrong username or password")
    audit(u.lower(), "login", "", request)
    return {"token": auth.make_token(u), "user": u.lower(), "role": auth.get_role(u)}

# ---------- dashboard data from SQL ----------
@app.get("/api/stats")
def stats(tz: int = 0, user=Depends(current_user)):
    tz = max(-840, min(840, tz))      # minutes east of UTC, sent by the browser
    t = sql("""SELECT COUNT(*) n, CAST(COALESCE(SUM(prediction='Normal'),0) AS UNSIGNED) normal,
               CAST(COALESCE(SUM(risk_score),0) AS UNSIGNED) s FROM detections""")[0]
    cut = (now() - timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")
    kv = lambda q: {r["k"]: int(r["v"]) for r in sql(q)}
    return {"total": int(t["n"]), "normal": int(t["normal"]), "score_sum": int(t["s"]),
            "levels": kv("SELECT risk_label k, COUNT(*) v FROM detections GROUP BY risk_label"),
            "classes": kv("SELECT prediction k, COUNT(*) v FROM detections GROUP BY prediction"),
            "rows": sql("SELECT DATE_FORMAT(ts,'%Y-%m-%d %H:%i:%s') AS `time`, prediction, risk_score, risk_label FROM detections ORDER BY id DESC LIMIT 200"),
            "hourly": sql("""SELECT DATE_FORMAT(DATE_ADD(MIN(ts), INTERVAL %s MINUTE),'%%H:00') h, CAST(SUM(prediction='Normal') AS UNSIGNED) n,
                       CAST(SUM(prediction<>'Normal') AS UNSIGNED) a FROM detections WHERE ts>=%s
                       GROUP BY DATE_FORMAT(DATE_ADD(ts, INTERVAL %s MINUTE),'%%Y-%%m-%%d %%H') ORDER BY MIN(ts)""", (tz, cut, tz))}

# ---------- real-time: sensors POST flows, every logged-in dashboard gets them over SSE ----------
subs: set = set()

def publish(msg):
    for q in subs:
        if q.full():
            q.get_nowait()  # slow browser: drop its oldest message, never block the pipeline
        q.put_nowait(msg)

@app.post("/api/ingest")
async def ingest(request: Request):
    if not hmac.compare_digest(request.headers.get("x-api-key", ""), INGEST_KEY):
        raise HTTPException(401, "bad api key")
    flows = (await request.json()).get("flows", [])
    if not flows or len(flows) > 5000:
        raise HTTPException(400, "send 1-5000 flows")
    def work():
        df = pd.DataFrame(flows); res = predict(df); save(res, df, "live"); return summarize(res)
    try:
        batch = await run_in_threadpool(work)
    except Exception as e:
        raise HTTPException(422, f"could not score flows: {e}")
    publish(("batch", batch))
    return {"scored": batch["n"]}

# ---------- live monitor: the server-side source behind the Start / Stop live buttons ----------
LIVE_INTERVAL = float(os.getenv("NETSHIELD_INTERVAL", "1"))
LIVE_BATCH = int(os.getenv("NETSHIELD_LIVE_BATCH", "10"))
monitor = {"task": None, "cap": None, "source": None, "iface": None}

def _running():
    t = monitor["task"]
    return bool(t and not t.done())

def _live_work(flows, source="live"):
    df = pd.DataFrame(flows); res = predict(df); save(res, df, source); return summarize(res)

async def _monitor_loop(session):
    tot, status = {"flows": 0, "attacks": 0, "alerts": 0, "max_risk": 0}, "finished"
    try:
        it = await run_in_threadpool(lambda: iter(capture_flows(DATA_PATH, LIVE_BATCH, int(time.time()))))
        while (flows := await run_in_threadpool(next, it, None)) is not None:
            try:
                b = await run_in_threadpool(_live_work, flows)
                publish(("batch", b))
                tot["flows"] += b["n"]; tot["attacks"] += b["n"] - b["classes"].get("Normal", 0)
                tot["alerts"] += b["levels"].get("High", 0) + b["levels"].get("Critical", 0)
                tot["max_risk"] = max(tot["max_risk"], b["rows"][0]["risk_score"] if b["rows"] else 0)
                sql("UPDATE live_history SET flows=%s, attacks=%s, alerts=%s, max_risk=%s WHERE id=%s",
                    (tot["flows"], tot["attacks"], tot["alerts"], tot["max_risk"], session))
            except Exception as e:
                print("live batch failed:", repr(e))
            await asyncio.sleep(LIVE_INTERVAL)
        publish(("done", {}))
    except asyncio.CancelledError:
        status = "stopped"
        raise
    except Exception as e:
        status = "error"
        print("live monitor stopped:", repr(e))
        publish(("scan_error", {"message": f"Live monitor stopped: {e}"}))
    finally:
        sql("UPDATE live_history SET status=%s, stopped_at=UTC_TIMESTAMP() WHERE id=%s", (status, session))

async def _network_loop(session, cap):
    """Real traffic: finished flows from the network adapter are scored every second."""
    tot, status = {"flows": 0, "attacks": 0, "alerts": 0, "max_risk": 0}, "stopped"
    try:
        while True:
            await asyncio.sleep(LIVE_INTERVAL)
            recs = await run_in_threadpool(cap.pop_ready)
            for i in range(0, len(recs), 500):
                try:
                    b = await run_in_threadpool(_live_work, recs[i:i + 500], "network")
                    publish(("batch", b))
                    tot["flows"] += b["n"]; tot["attacks"] += b["n"] - b["classes"].get("Normal", 0)
                    tot["alerts"] += b["levels"].get("High", 0) + b["levels"].get("Critical", 0)
                    tot["max_risk"] = max(tot["max_risk"], b["rows"][0]["risk_score"] if b["rows"] else 0)
                    sql("UPDATE live_history SET flows=%s, attacks=%s, alerts=%s, max_risk=%s WHERE id=%s",
                        (tot["flows"], tot["attacks"], tot["alerts"], tot["max_risk"], session))
                except Exception as e:
                    print("network batch failed:", repr(e))
    except asyncio.CancelledError:
        raise
    except Exception as e:
        status = "error"
        print("network capture stopped:", repr(e))
        publish(("scan_error", {"message": f"Network capture stopped: {e}"}))
    finally:
        cap.stop()
        sql("UPDATE live_history SET status=%s, stopped_at=UTC_TIMESTAMP() WHERE id=%s", (status, session))

class LiveStart(BaseModel):
    source: str = "demo"          # demo = replay the dataset, network = capture real traffic
    iface: str | None = None

@app.post("/api/live/start")
async def live_start(body: LiveStart = LiveStart(), user=Depends(require("analyst"))):
    if _running():
        return {"running": True, "source": monitor["source"]}
    cap = None
    if body.source == "network":
        from packet_capture import Capturer, capture_help
        cap = Capturer(body.iface or None, idle=float(os.getenv("NETSHIELD_CAPTURE_IDLE", "3")))
        try:
            await run_in_threadpool(cap.start)
        except Exception as e:
            raise HTTPException(400, capture_help(str(e)))
    elif body.source != "demo":
        raise HTTPException(400, "Unknown source")
    sid = insert_id("INSERT INTO live_history(started_at, started_by, status, source, iface) VALUES(UTC_TIMESTAMP(), %s, 'running', %s, %s)",
                    (user, body.source, (body.iface or "")[:100] or None))
    monitor.update(cap=cap, source=body.source, iface=body.iface)
    monitor["task"] = asyncio.create_task(_network_loop(sid, cap) if cap else _monitor_loop(sid))
    audit(user, "live_start", f"session {sid} ({body.source}{' ' + body.iface if body.iface else ''})")
    return {"running": True, "source": body.source}

@app.post("/api/live/stop")
async def live_stop(user=Depends(require("analyst"))):
    t = monitor["task"]
    if t and not t.done():
        t.cancel()
        await asyncio.gather(t, return_exceptions=True)  # wait until the session row is closed
    monitor.update(task=None, cap=None)
    audit(user, "live_stop")
    return {"running": False}

@app.get("/api/live/status")
def live_status(user=Depends(current_user)):
    cap, run = monitor.get("cap"), _running()
    return {"running": run, "source": monitor.get("source") if run else None, "iface": monitor.get("iface"),
            "packets": cap.packets if cap and run else 0, "open_flows": len(cap.flows) if cap and run else 0}

@app.get("/api/interfaces")
def interfaces(user=Depends(require("analyst"))):
    try:
        from packet_capture import list_interfaces
        return {"available": True, "interfaces": list_interfaces()}
    except Exception as e:
        return {"available": False, "interfaces": [], "error": str(e)}

@app.get("/api/live/history")
def live_history(user=Depends(current_user)):
    return {"rows": sql("SELECT id, started_at, stopped_at, started_by, status, source, iface, flows, attacks, alerts, max_risk "
                        "FROM live_history ORDER BY id DESC LIMIT 50")}

@app.get("/api/live/status")
def live_status(user=Depends(current_user)):
    return {"running": _running()}

async def sse(request, q, cleanup):
    seq = 0
    try:
        while True:
            try:
                kind, data = await asyncio.wait_for(q.get(), HEARTBEAT)
            except asyncio.TimeoutError:
                kind, data = "heartbeat", {}
            seq += 1
            yield f"id: {seq}\nevent: {kind}\ndata: {json.dumps({'id': seq, 'type': kind, **data})}\n\n"
            if kind in ("done", "scan_error") or await request.is_disconnected():
                break
    finally:
        cleanup()

def sse_response(gen):
    return StreamingResponse(gen, media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.get("/api/live")
async def live(request: Request, user=Depends(current_user)):
    q = asyncio.Queue(maxsize=50); subs.add(q)
    return sse_response(sse(request, q, lambda: subs.discard(q)))

# ---------- replay scan of the dataset file (not saved to SQL), always from row one ----------
def read_chunks(path):
    if path.endswith(".parquet"):
        import pyarrow.parquet as pq
        for b in pq.ParquetFile(path).iter_batches(batch_size=CHUNK):
            yield b.to_pandas()
    else:
        for d in pd.read_csv(path, chunksize=CHUNK, skipinitialspace=True, encoding="latin-1"):
            d.columns = d.columns.astype(str).str.strip()
            yield d

def _scan_work(chunk):
    res = predict(chunk); save(res, chunk, "scan", os.path.basename(DATA_PATH)); return summarize(res)

@app.get("/api/scan")
async def scan(request: Request, user=Depends(require("analyst"))):
    q = asyncio.Queue(maxsize=8)
    audit(user, "scan_start")
    async def producer():
        try:
            it = read_chunks(DATA_PATH)
            while (chunk := await run_in_threadpool(next, it, None)) is not None:
                try:
                    await q.put(("batch", await run_in_threadpool(_scan_work, chunk)))
                except Exception as e:
                    print("chunk failed:", repr(e))
                await asyncio.sleep(DELAY)
        except Exception as e:
            await q.put(("scan_error", {"message": str(e)}))
        await q.put(("done", {}))
    task = asyncio.create_task(producer())
    return sse_response(sse(request, q, task.cancel))

# ---------- take information from files: upload a .csv or .parquet, score it, save to SQL ----------
MAX_UPLOAD = int(os.getenv("NETSHIELD_MAX_UPLOAD_MB", "100")) * 1024 * 1024

@app.post("/api/upload")
async def upload(request: Request, name: str = "", user=Depends(require("analyst"))):
    too_big = HTTPException(413, f"File too large (max {MAX_UPLOAD >> 20} MB)")
    if int(request.headers.get("content-length") or 0) > MAX_UPLOAD:
        raise too_big
    raw = await request.body()
    if len(raw) > MAX_UPLOAD:
        raise too_big
    def load():
        n = name.lower()
        if n.endswith(".parquet"): return pd.read_parquet(io.BytesIO(raw))
        if n.endswith(".csv"): return pd.read_csv(io.BytesIO(raw), skipinitialspace=True, encoding="latin-1").rename(columns=lambda c: str(c).strip())
        raise HTTPException(400, "Upload a .csv or .parquet file")
    try:
        df = await run_in_threadpool(load)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Could not read file: {e}")
    missing = [c for c in features if c not in df.columns]
    if missing:
        raise HTTPException(422, "File is missing columns: " + ", ".join(missing[:8]) + (" ..." if len(missing) > 8 else ""))
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", os.path.basename(name))[:80] or "upload"
    os.makedirs("uploads", exist_ok=True)  # keep a copy of every analyzed file
    with open(os.path.join("uploads", datetime.now().strftime("%Y%m%d_%H%M%S_") + safe), "wb") as f:
        f.write(raw)
    def score_all():
        attacks = 0
        for i in range(0, len(df), CHUNK):  # fixed chunks, same as the stream
            part = df.iloc[i:i + CHUNK]; res = predict(part); save(res, part, "upload", safe)
            attacks += sum(r[0] != "Normal" for r in res)
        return attacks
    try:
        attacks = await run_in_threadpool(score_all)
    except Exception as e:
        raise HTTPException(422, f"could not score file: {e}")
    audit(user, "upload", f"{safe}: {len(df)} rows")
    return {"rows": len(df), "attacks": attacks}

# ---------- Alerts, Risk Scoring and Activity History pages ----------
@app.get("/api/alerts")
def alerts(level: str = "", status: str = "open", user=Depends(current_user)):
    where, args = [], []
    if level in ("High", "Critical"):
        where.append("risk_label=%s"); args.append(level)
    if status == "open": where.append("status='open'")
    elif status == "ack": where.append("status='acknowledged'")
    w = (" WHERE " + " AND ".join(where)) if where else ""
    return {"rows": sql("SELECT id, ts, prediction, confidence, risk_score, risk_label, (status='acknowledged') AS ack FROM alerts"
                        + w + " ORDER BY id DESC LIMIT 200", tuple(args) or None)}

@app.get("/api/alerts/count")
def alert_count(user=Depends(current_user)):
    return {"open": int(sql("SELECT COUNT(*) n FROM alerts WHERE status='open'")[0]["n"])}

class Ack(BaseModel):
    ids: list[int] = []
    all: bool = False

@app.post("/api/alerts/ack")
def ack(a: Ack, user=Depends(require("analyst"))):
    base = "UPDATE alerts SET status='acknowledged', ack_by=%s, ack_at=UTC_TIMESTAMP() WHERE status='open'"
    if a.all:
        sql(base, (user,))
    elif a.ids:
        sql(base + " AND id IN (%s)" % ",".join(["%s"] * len(a.ids)), (user, *a.ids))
    audit(user, "alert_ack", "all" if a.all else str(a.ids)[:150])
    return {"ok": True}

@app.get("/api/risk")
def risk_info(user=Depends(current_user)):
    return {"severity": SEVERITY_TABLE, "cutoffs": [[25, "Low"], [50, "Medium"], [75, "High"], [100, "Critical"]],
            "by_class": sql("""SELECT prediction, COUNT(*) n, ROUND(AVG(risk_score),1) av, MAX(risk_score) mx
                               FROM detections GROUP BY prediction ORDER BY n DESC""")}

@app.get("/api/risk/score")
def risk_score(cls: str, conf: float, user=Depends(current_user)):
    if not 0 <= conf <= 1:
        raise HTTPException(400, "conf must be between 0 and 1")
    return compute_risk_score(cls, conf)

HCOLS = "id, ts, prediction, confidence, risk_score, risk_label, anomaly_score, model, source, source_name, proto, service, state, dur, sbytes, dbytes"

def _hist_where(level, cls, hours, source=""):
    w, a = [], []
    if level in ("Low", "Medium", "High", "Critical"): w.append("risk_label=%s"); a.append(level)
    if source in ("live", "upload", "scan", "network"): w.append("source=%s"); a.append(source)
    if cls: w.append("prediction=%s"); a.append(cls)
    if hours > 0: w.append("ts>=%s"); a.append((now() - timedelta(hours=hours)).strftime("%Y-%m-%d %H:%M:%S"))
    return (" WHERE " + " AND ".join(w)) if w else "", a

@app.get("/api/history")
def history(page: int = 1, size: int = 50, level: str = "", cls: str = "", hours: int = 0, source: str = "", user=Depends(current_user)):
    size, page = max(1, min(size, 200)), max(1, page)
    where, a = _hist_where(level, cls, hours, source)
    total = int(sql("SELECT COUNT(*) n FROM detections" + where, tuple(a) or None)[0]["n"])
    rows = sql("SELECT " + HCOLS + " FROM detections" + where
               + " ORDER BY id DESC LIMIT %s OFFSET %s", tuple(a) + (size, (page - 1) * size))
    return {"total": total, "rows": rows}

@app.get("/api/history.csv")
def history_csv(level: str = "", cls: str = "", hours: int = 0, source: str = "", user=Depends(current_user)):
    where, a = _hist_where(level, cls, hours, source)
    rows = sql("SELECT " + HCOLS + " FROM detections" + where
               + " ORDER BY id DESC LIMIT 50000", tuple(a) or None)
    buf = io.StringIO(); w = csv.writer(buf)
    cols = [c.strip() for c in HCOLS.split(",")]
    w.writerow(cols)
    w.writerows([[r[c] for c in cols] for r in rows])
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=activity_history.csv"})

# ---------- monitoring: health, performance counters, model quality ----------
@app.get("/api/health")
def health():
    try:
        sql("SELECT 1"); db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "database": db_ok, "model": lp.active_name(), "dashboards_connected": len(subs)}

@app.get("/api/performance")
def performance(user=Depends(current_user)):
    return {"perf": perf.snapshot(), "dashboards_connected": len(subs), "model": lp.active_name()}

@app.post("/api/metrics/evaluate")
async def metrics_evaluate(n: int = 1000, name: str = "", user=Depends(require("analyst"))):
    try:
        return await run_in_threadpool(lp.evaluate, DATA_PATH, max(100, min(n, 5000)), name or None)
    except Exception as e:
        raise HTTPException(400, str(e))

# ---------- AI models: compare them and choose which one scores new traffic ----------
class UseModel(BaseModel):
    name: str

@app.get("/api/models")
def models_info(user=Depends(current_user)):
    return {"active": lp.active_name(), "models": lp.list_models(), "anomaly": lp.anomaly_available()}

@app.post("/api/models/active")
async def models_set(m: UseModel, user=Depends(require("analyst"))):
    try:
        await run_in_threadpool(lp.set_active, m.name)
    except Exception as e:
        raise HTTPException(400, f"Could not switch to {m.name}: {e}")
    audit(user, "model_switch", m.name)
    return {"active": lp.active_name()}

@app.post("/api/models/test")
async def models_test(n: int = 500, user=Depends(require("analyst"))):
    try:
        return await run_in_threadpool(lp.compare_on_sample, DATA_PATH, max(50, min(n, 2000)))
    except Exception as e:
        raise HTTPException(400, str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", port=8000, reload=True)
