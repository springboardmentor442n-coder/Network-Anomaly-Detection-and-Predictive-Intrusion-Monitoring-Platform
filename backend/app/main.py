import asyncio, json, os, sqlite3, threading
from datetime import datetime, timedelta
from pathlib import Path
import jwt, pandas as pd
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .ml_pipeline import Pipeline

BASE = Path(__file__).resolve().parent.parent
SECRET = os.getenv("JWT_SECRET", "netshield-dev-secret-change-me-in-production-0123456789")
CHUNK_SIZE = 250
_default = BASE / "data" / "cicids2017_cleaned.csv"
CSV_PATH = os.getenv("CSV_FILE_PATH") or str(_default if _default.exists() else BASE / "data" / "sample_traffic.csv")
USERS = {"admin": ("admin123", "admin"), "analyst": ("analyst123", "analyst")}  # demo only

app = FastAPI(title="NetShield AI", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

try:
    pipeline = Pipeline()
except Exception as e:  # models not trained yet
    pipeline = None

# ---------- SQLite: alerts + audit log ----------
db = sqlite3.connect(BASE / "netshield.db", check_same_thread=False)
db.row_factory = sqlite3.Row
lock = threading.Lock()
db.executescript("""CREATE TABLE IF NOT EXISTS alerts(id INTEGER PRIMARY KEY, ts TEXT, src TEXT, dst TEXT, cls TEXT,
 conf REAL, score INT, label TEXT, status TEXT DEFAULT 'open');
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, ts TEXT, user TEXT, action TEXT);""")

def q(sql, args=()):
    with lock:
        cur = db.execute(sql, args); db.commit()
        return [dict(r) for r in cur.fetchall()]

def audit(user, action):
    q("INSERT INTO audit(ts,user,action) VALUES(?,?,?)", (datetime.utcnow().isoformat(), user, action))

# ---------- Auth & RBAC ----------
def decode(token):
    try:
        return jwt.decode(token, SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")

def current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    return decode(authorization[7:])

def stream_user(token: str = Query(...)):      # EventSource can't send headers -> token in URL
    return decode(token)

def admin_only(u=Depends(current_user)):
    if u["role"] != "admin":
        raise HTTPException(403, "Admin role required")
    return u

class Login(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
def login(c: Login):
    u = USERS.get(c.username)
    if not u or u[0] != c.password:
        raise HTTPException(401, "Wrong username or password")
    tok = jwt.encode({"sub": c.username, "role": u[1], "exp": datetime.utcnow() + timedelta(hours=8)}, SECRET, algorithm="HS256")
    audit(c.username, "login")
    return {"access_token": tok, "role": u[1], "username": c.username}

@app.get("/api/health")
def health():
    return {"models_loaded": pipeline is not None, "csv": CSV_PATH, "csv_exists": os.path.exists(CSV_PATH),
            "classes": pipeline.classes if pipeline else [], "anomaly_model": bool(pipeline and pipeline.iso is not None)}

# ---------- Alerts / incidents ----------
@app.get("/api/alerts")
def alerts(limit: int = 50, user=Depends(current_user)):
    return q("SELECT * FROM alerts ORDER BY id DESC LIMIT ?", (limit,))

class Status(BaseModel):
    status: str   # open | investigating | resolved

@app.patch("/api/alerts/{aid}")
def set_status(aid: int, s: Status, user=Depends(current_user)):
    if s.status not in ("open", "investigating", "resolved"):
        raise HTTPException(400, "Bad status")
    q("UPDATE alerts SET status=? WHERE id=?", (s.status, aid))
    audit(user["sub"], f"alert {aid} -> {s.status}")
    return {"ok": True}

@app.get("/api/audit")
def audit_log(user=Depends(admin_only)):
    return q("SELECT * FROM audit ORDER BY id DESC LIMIT 100")

# ---------- SSE streaming scan (always starts at row 1, no saved cursor) ----------
async def scan_events(request: Request, user: str):
    mid, last_hb = 0, asyncio.get_event_loop().time()
    if pipeline is None or not os.path.exists(CSV_PATH):
        msg = "Models not trained (run train.py)" if pipeline is None else "CSV not found"
        yield f"id: 0\nevent: error\ndata: {json.dumps({'error': msg})}\n\n"
        return
    pipeline.risk.reset()
    audit(user, "scan started")
    reader = pd.read_csv(CSV_PATH, chunksize=CHUNK_SIZE)
    try:
        for chunk in reader:
            if await request.is_disconnected():
                break
            mid += 1
            try:
                rows = await asyncio.to_thread(pipeline.process_chunk, chunk)   # keep event loop free
                top = sorted([r for r in rows if r["risk_label"] == "Critical"], key=lambda r: -r["risk_score"])[:3]
                for r in top:
                    q("INSERT INTO alerts(ts,src,dst,cls,conf,score,label) VALUES(?,?,?,?,?,?,?)",
                      (r["timestamp"], r["source_ip"], r["destination_ip"], r["predicted_class"], r["confidence"], r["risk_score"], r["risk_label"]))
                yield f"id: {mid}\nevent: message\ndata: {json.dumps({'id': mid, 'type': 'chunk_result', 'rows': rows})}\n\n"
            except Exception as exc:       # log and carry on with the next chunk
                yield f"id: {mid}\nevent: warning\ndata: {json.dumps({'id': mid, 'type': 'chunk_error', 'detail': str(exc)})}\n\n"
            now = asyncio.get_event_loop().time()
            if now - last_hb >= 20:
                mid += 1; last_hb = now
                yield f"id: {mid}\nevent: heartbeat\ndata: {json.dumps({'id': mid, 'type': 'heartbeat'})}\n\n"
            await asyncio.sleep(0.15)
        mid += 1
        yield f"id: {mid}\nevent: done\ndata: {json.dumps({'id': mid, 'type': 'scan_complete'})}\n\n"
    finally:
        reader.close()

@app.get("/api/stream/scan")
async def stream_scan(request: Request, user=Depends(stream_user)):
    return StreamingResponse(scan_events(request, user["sub"]), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

app.mount("/", StaticFiles(directory=str(BASE.parent / "frontend"), html=True), name="ui")
