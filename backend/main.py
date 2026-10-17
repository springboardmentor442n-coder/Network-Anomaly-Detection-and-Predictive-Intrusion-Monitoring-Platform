import io, json, os, random
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from database import get_db
from models import PastRun, User

try:
    from database import engine
except ImportError:
    engine = None

BASE = Path(__file__).resolve().parent
MODEL_DIR = BASE.parent / "model"
model = joblib.load(MODEL_DIR / "xgboost_model.pkl")
encoder = joblib.load(MODEL_DIR / "onehot_encoder.pkl")
feature_info = joblib.load(MODEL_DIR / "feature_info.pkl")
label_encoder = joblib.load(MODEL_DIR / "xgb_label_encoder.pkl")
numeric_cols = feature_info["numeric_cols"]
categorical_cols = feature_info["categorical_cols"]
print("ML model, encoder, and feature information loaded successfully!")

from database import Base
from models_extra import audit  # noqa: F401  (also registers the new tables)
try:
    _s = next(get_db())
    Base.metadata.create_all(bind=_s.get_bind())
    _s.close()
except Exception as e:
    print("create_all skipped:", e)

# Auto-add the created_at column to an existing database (needs created_at in models.py)
try:
    if engine is not None and hasattr(PastRun, "created_at"):
        t = PastRun.__tablename__
        if "created_at" not in [c["name"] for c in inspect(engine).get_columns(t)]:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {t} ADD COLUMN created_at DATETIME"))
except Exception as e:
    print("created_at migration skipped:", e)

app = FastAPI(title="ThreatRadar")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "threat-radar-secret-key")
ALGORITHM = "HS256"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in os.getenv("FRONTEND_ORIGIN", "").split(",") if o],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

severity = {"Normal": 0, "Generic": 30, "Exploits": 60, "Fuzzers": 50, "DoS": 90,
            "Reconnaissance": 30, "Analysis": 40, "Backdoor": 80, "Shellcode": 80, "Worms": 90}
LEVELS = np.array(["Low", "Medium", "High", "Critical"])


class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str

class PredictionRequest(BaseModel):
    features: dict



def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Please log in.")
    try:
        payload = jwt.decode(authorization.split(" ", 1)[1], SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(401, "Invalid or expired token. Please log in again.")
    user = db.query(User).filter(User.email == payload.get("sub")).first()
    if not user:
        raise HTTPException(401, "User account not found.")
    return user


def require_role(*roles):
    def checker(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(403, f"Your role ({user.role}) cannot do this. Required: {', '.join(roles)}.")
        return user
    return checker


def score_frame(df: pd.DataFrame):
    """Run the model on a dataframe. Returns predictions, confidence, risk score, risk level."""
    X = df.drop(columns=[c for c in ("id", "label", "attack_cat") if c in df.columns])
    missing = [c for c in numeric_cols + categorical_cols if c not in X.columns]
    if missing:
        raise HTTPException(400, f"CSV is missing required feature columns: {missing}")
    Xf = np.hstack([X[numeric_cols].to_numpy(), encoder.transform(X[categorical_cols])])
    pred = label_encoder.inverse_transform(model.predict(Xf)).astype(str)
    conf = model.predict_proba(Xf).max(axis=1)
    sev = pd.Series(pred).map(severity).fillna(0).to_numpy()
    score = sev * conf
    lvl = LEVELS[np.digitize(score, [25, 50, 75], right=True)]
    return pred, conf, score, lvl


@app.get("/")
def home():
    return {"message": "ThreatRadar API is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Enter a valid email")
    if len(request.password) < 8:
        raise HTTPException(400, "Password must contain at least 8 characters")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "An account with this email already exists")
    user = User(email=email, hashed_password=pwd_context.hash(request.password), role="Analyst")
    db.add(user); db.commit(); db.refresh(user)
    audit(db, user.email, "REGISTER")
    return {"success": True, "message": "Account created successfully", "email": user.email, "role": user.role}


@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not pwd_context.verify(request.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password")
    token = jwt.encode(
        {"sub": user.email, "role": user.role, "exp": datetime.now(timezone.utc) + timedelta(hours=8)},
        SECRET_KEY, algorithm=ALGORITHM)
    audit(db, user.email, "LOGIN")
    return {"success": True, "message": "Login successful", "access_token": token,
            "email": user.email, "role": user.role}


@app.post("/predict")
def predict(request: PredictionRequest, user: User = Depends(get_current_user)):
    pred, conf, score, lvl = score_frame(pd.DataFrame([request.features]))
    return {"prediction": pred[0], "confidence": round(float(conf[0]), 4),
            "risk_score": round(float(score[0]), 2), "risk_level": str(lvl[0])}


@app.post("/predict-csv")
async def predict_csv(file: UploadFile = File(...), db: Session = Depends(get_db),
                      current_user: User = Depends(require_role("Admin", "Analyst"))):
    stream = io.BytesIO(await file.read())
    total = threats = critical = alerts = anomalies = 0
    from extras import anomaly_count
    threat_dist, risk_dist, results = Counter(), Counter({l: 0 for l in LEVELS}), []
    try:
        for df in pd.read_csv(stream, chunksize=10000):
            pred, conf, score, lvl = score_frame(df)
            is_threat = pred != "Normal"
            total += len(pred)
            anomalies += anomaly_count(df)
            threats += int(is_threat.sum())
            threat_dist.update(pred.tolist())
            risk_dist.update(lvl[is_threat].tolist())
            critical += int((is_threat & (lvl == "Critical")).sum())
            alerts += int((is_threat & np.isin(lvl, ["High", "Critical"])).sum())
            if len(results) < 100:
                for i in range(min(100 - len(results), len(pred))):
                    results.append({"prediction": pred[i], "confidence": round(float(conf[i]), 4),
                                    "risk_score": round(float(score[i]), 2), "risk_level": str(lvl[i])})
    except pd.errors.EmptyDataError:
        raise HTTPException(400, "The uploaded CSV file is empty.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(400, f"Could not process this CSV file: {exc}")

    kwargs = dict(user_id=current_user.id, source="CSV", filename=file.filename, total_rows=total,
                  threats_detected=threats, critical_threats=critical, active_alerts=alerts,
                  threat_distribution=json.dumps(dict(threat_dist)),
                  risk_distribution=json.dumps({l: risk_dist[l] for l in LEVELS}),
                  results_json=json.dumps(results))
    if hasattr(PastRun, "created_at"):
        kwargs["created_at"] = datetime.utcnow()
    run = PastRun(**kwargs)
    db.add(run); db.commit(); db.refresh(run)
    from extras import after_csv_run
    after_csv_run(db, current_user, run, results)
    return {"filename": file.filename, "total_rows": total, "threats_detected": threats,
            "critical_threats": critical, "active_alerts": alerts,
            "threat_distribution": dict(threat_dist), "risk_distribution": {l: risk_dist[l] for l in LEVELS},
            "results": results, "anomalies": anomalies, "run_id": run.id}


# ---------------- Past runs ----------------
@app.get("/runs")
def list_runs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (db.query(PastRun, User.email).join(User, User.id == PastRun.user_id)
            .order_by(PastRun.id.desc()).limit(100).all())
    out = []
    for r, owner in rows:
        risk = json.loads(r.risk_distribution or "{}")
        top = next((l for l in ("Critical", "High", "Medium", "Low") if risk.get(l)), "Low")
        created = getattr(r, "created_at", None)
        out.append({"id": r.id, "filename": r.filename, "created_at": created.isoformat() if created else None,
                    "run_by": owner, "mine": r.user_id == user.id,
                    "can_delete": r.user_id == user.id or user.role == "Admin",
                    "total_rows": r.total_rows, "threats_detected": r.threats_detected,
                    "critical_threats": r.critical_threats, "active_alerts": r.active_alerts,
                    "highest_risk": top, "threat_distribution": json.loads(r.threat_distribution or "{}"),
                    "risk_distribution": risk})
    return out

@app.get("/runs/{run_id}")
def get_run(run_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(PastRun).filter(PastRun.id == run_id).first()
    if not r:
        raise HTTPException(404, "Run not found.")
    return {"id": r.id, "results": json.loads(r.results_json or "[]")}

@app.delete("/runs/{run_id}")
def delete_run(run_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(PastRun).filter(PastRun.id == run_id)
    if user.role != "Admin":
        q = q.filter(PastRun.user_id == user.id)
    r = q.first()
    if not r:
        raise HTTPException(404, "Run not found, or you can only delete your own runs.")
    audit(db, user.email, "DELETE_RUN", f"run {run_id}: {r.filename}")
    db.delete(r); db.commit()
    return {"success": True}


# ---------------- Live monitoring ----------------
# Replays real UNSW-NB15 rows through your XGBoost model, so every prediction is genuine.
REPLAY = None
try:
    f = next((BASE.parent / "datasets").glob("UNSW_NB15_training*.csv"))
    _df = pd.read_csv(f)
    REPLAY = _df.sample(min(5000, len(_df)), random_state=7).reset_index(drop=True)
    print(f"Live monitoring replay loaded: {len(REPLAY)} flows")
except Exception as e:
    print("Live replay dataset not found, using simulation:", e)

@app.get("/live")
def live(n: int = 4, source: str = "replay", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = min(max(n, 1), 10)
    if source == "capture":
        from capture import harvest_events
        from extras import live_hook as _hook
        events = harvest_events()
        _hook(db, user, events)
        return {"events": events}
    now = datetime.now(timezone.utc).isoformat()
    if REPLAY is not None:
        rows = REPLAY.sample(n)
        pred, conf, score, lvl = score_frame(rows)
        protos = rows["proto"].astype(str).tolist() if "proto" in rows else ["tcp"] * n
        svcs = rows["service"].astype(str).tolist() if "service" in rows else ["-"] * n
    else:
        pred = np.array(random.choices(list(severity), weights=[60, 10, 9, 6, 4, 4, 2, 2, 2, 1], k=n))
        conf = np.random.uniform(0.8, 0.99, n)
        score = pd.Series(pred).map(severity).to_numpy() * conf
        lvl = LEVELS[np.digitize(score, [25, 50, 75], right=True)]
        protos, svcs = ["tcp"] * n, ["-"] * n
    from extras import anomaly_flags, live_hook
    anom = anomaly_flags(rows) if REPLAY is not None else np.zeros(n, dtype=bool)
    events = [{
        "time": now, "src": f"10.0.{random.randint(0, 9)}.{random.randint(2, 254)}",
        "dst": f"192.168.1.{random.randint(2, 254)}", "proto": protos[i], "service": svcs[i],
        "prediction": str(pred[i]), "confidence": round(float(conf[i]), 4),
        "risk_score": round(float(score[i]), 2), "risk_level": str(lvl[i]), "anomaly": bool(anom[i])} for i in range(n)]
    live_hook(db, user, events)
    return {"events": events}

from extras import router as _extras_router  # noqa: E402
app.include_router(_extras_router)

try:  # real packet capture is optional (needs scapy and Npcap)
    from capture import router as _capture_router  # noqa: E402
    app.include_router(_capture_router)
except Exception as e:
    print("Real packet capture disabled:", e)