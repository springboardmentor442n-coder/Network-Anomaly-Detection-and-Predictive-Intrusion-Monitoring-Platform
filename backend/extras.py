"""ThreatRadar extras: anomaly detection, incidents, notifications, team management,
audit log, model evaluation and downloadable reports. Loaded from the bottom of main.py."""
import csv
import io
import json
import os
import smtplib
import threading
import time
import urllib.request
from collections import Counter
from email.message import EmailMessage

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from pydantic import BaseModel
from sklearn.ensemble import IsolationForest
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support
from sqlalchemy.orm import Session

from main import (REPLAY, PastRun, User, categorical_cols, encoder, get_current_user,
                  get_db, label_encoder, numeric_cols, require_role, score_frame, severity)
from models_extra import AuditLog, Incident, Notification, audit

router = APIRouter()
ROLES = ("Admin", "Analyst", "Viewer")
STATUSES = ("New", "Investigating", "Resolved")


# ---------------- Anomaly detection (Isolation Forest, unsupervised) ----------------
_iso = None

def _features(df: pd.DataFrame):
    X = df.drop(columns=[c for c in ("id", "label", "attack_cat") if c in df.columns])
    return np.hstack([X[numeric_cols].to_numpy(), encoder.transform(X[categorical_cols])])

def get_iso():
    """Train once, on Normal traffic only, so anything unusual scores as an outlier."""
    global _iso
    if _iso is None:
        _iso = False
        if REPLAY is not None:
            if "attack_cat" in REPLAY:
                normal = REPLAY[REPLAY["attack_cat"].astype(str).str.strip() == "Normal"]
            elif "label" in REPLAY:
                normal = REPLAY[REPLAY["label"] == 0]
            else:
                normal = REPLAY
            if len(normal) >= 200:
                _iso = IsolationForest(n_estimators=100, contamination=0.05, random_state=7).fit(_features(normal))
    return _iso or None

def anomaly_flags(df: pd.DataFrame) -> np.ndarray:
    iso = get_iso()
    if iso is None:
        return np.zeros(len(df), dtype=bool)
    try:
        return iso.predict(_features(df)) == -1
    except Exception as e:
        print("anomaly detection skipped:", e)
        return np.zeros(len(df), dtype=bool)

def anomaly_count(df: pd.DataFrame) -> int:
    return int(anomaly_flags(df).sum())


# ---------------- Notifications (in-app, plus optional Slack and email) ----------------
def _send_external(title: str, body: str):
    hook = os.getenv("SLACK_WEBHOOK_URL")
    if hook:
        try:
            req = urllib.request.Request(hook, data=json.dumps({"text": f"*{title}*\n{body}"}).encode(),
                                         headers={"Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=5)
        except Exception as e:
            print("Slack notification failed:", e)
    host, to = os.getenv("SMTP_HOST"), os.getenv("ALERT_EMAIL_TO")
    if host and to:
        try:
            msg = EmailMessage()
            msg["Subject"] = "[ThreatRadar] " + title
            msg["From"] = os.getenv("SMTP_USER", "threatradar@localhost")
            msg["To"] = to
            msg.set_content(body)
            with smtplib.SMTP(host, int(os.getenv("SMTP_PORT", "587")), timeout=10) as s:
                s.starttls()
                if os.getenv("SMTP_USER"):
                    s.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASS", ""))
                s.send_message(msg)
        except Exception as e:
            print("Email notification failed:", e)

def notify(db: Session, title: str, body: str):
    db.add(Notification(title=title, body=body))
    db.commit()
    threading.Thread(target=_send_external, args=(title, body), daemon=True).start()


# ---------------- Hooks used by main.py ----------------
def after_csv_run(db: Session, user: User, run: PastRun, results: list):
    audit(db, user.email, "CSV_ANALYSIS", f"{run.filename}: {run.total_rows} rows, {run.threats_detected} threats")
    for r in [r for r in results if r["risk_level"] in ("High", "Critical")][:15]:
        db.add(Incident(source="CSV", run_id=run.id, attack=r["prediction"], risk_score=r["risk_score"],
                        confidence=r["confidence"], risk_level=r["risk_level"], status="New"))
    db.commit()
    if run.critical_threats:
        notify(db, f"{run.critical_threats} critical threats in {run.filename}",
               f"Run {run.id} by {user.email}: {run.threats_detected} threats, {run.active_alerts} active alerts.")

_last_live = 0.0

def live_hook(db: Session, user: User, events: list):
    """Open an incident (at most one every 15 seconds) when live traffic scores Critical."""
    global _last_live
    crit = [e for e in events if e["risk_level"] == "Critical"]
    if crit and time.time() - _last_live > 15:
        _last_live = time.time()
        e = crit[0]
        db.add(Incident(source="LIVE", attack=e["prediction"], risk_score=e["risk_score"],
                        confidence=e["confidence"], risk_level="Critical", status="New"))
        db.commit()
        notify(db, f"Critical {e['prediction']} detected",
               f"Live flow {e['src']} to {e['dst']} ({e['proto']}) scored {e['risk_score']}.")


# ---------------- Endpoints ----------------
class RoleBody(BaseModel):
    role: str

class StatusBody(BaseModel):
    status: str


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"email": user.email, "role": user.role}


@router.get("/users")
def list_users(db: Session = Depends(get_db), admin: User = Depends(require_role("Admin"))):
    counts = Counter(uid for (uid,) in db.query(PastRun.user_id).all())
    return [{"id": u.id, "email": u.email, "role": u.role, "runs": counts.get(u.id, 0),
             "created_at": u.created_at.isoformat() if u.created_at else None}
            for u in db.query(User).order_by(User.id).all()]


@router.patch("/users/{uid}/role")
def set_role(uid: int, body: RoleBody, db: Session = Depends(get_db), admin: User = Depends(require_role("Admin"))):
    if body.role not in ROLES:
        raise HTTPException(400, "Role must be Admin, Analyst or Viewer.")
    target = db.get(User, uid)
    if not target:
        raise HTTPException(404, "User not found.")
    if target.id == admin.id and body.role != "Admin":
        raise HTTPException(400, "You can't remove your own Admin role.")
    old, target.role = target.role, body.role
    db.commit()
    audit(db, admin.email, "ROLE_CHANGE", f"{target.email}: {old} to {body.role}")
    return {"success": True}


@router.get("/audit")
def audit_log(db: Session = Depends(get_db), admin: User = Depends(require_role("Admin"))):
    rows = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(200).all()
    return [{"id": a.id, "created_at": a.created_at.isoformat(), "user": a.user_email,
             "action": a.action, "detail": a.detail} for a in rows]


@router.get("/incidents")
def list_incidents(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(Incident).order_by(Incident.id.desc()).limit(200).all()
    return [{"id": i.id, "created_at": i.created_at.isoformat(), "source": i.source, "run_id": i.run_id,
             "attack": i.attack, "risk_score": i.risk_score, "confidence": i.confidence,
             "risk_level": i.risk_level, "status": i.status, "updated_by": i.updated_by} for i in rows]


@router.patch("/incidents/{iid}")
def set_status(iid: int, body: StatusBody, db: Session = Depends(get_db),
               user: User = Depends(require_role("Admin", "Analyst"))):
    if body.status not in STATUSES:
        raise HTTPException(400, "Status must be New, Investigating or Resolved.")
    inc = db.get(Incident, iid)
    if not inc:
        raise HTTPException(404, "Incident not found.")
    old, inc.status, inc.updated_by = inc.status, body.status, user.email
    db.commit()
    audit(db, user.email, "INCIDENT_STATUS", f"INC-{iid:04d}: {old} to {body.status}")
    return {"success": True}


@router.get("/notifications")
def list_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(Notification).order_by(Notification.id.desc()).limit(30).all()
    return [{"id": n.id, "created_at": n.created_at.isoformat(), "title": n.title,
             "body": n.body, "read": bool(n.read)} for n in rows]


@router.post("/notifications/read")
def mark_read(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Notification).update({Notification.read: True})
    db.commit()
    return {"success": True}


@router.post("/evaluate")
async def evaluate(file: UploadFile = File(...), db: Session = Depends(get_db),
                   user: User = Depends(require_role("Admin", "Analyst"))):
    """Compare model predictions with the true attack_cat labels in an uploaded CSV."""
    stream = io.BytesIO(await file.read())
    y_true, y_pred = [], []
    try:
        for df in pd.read_csv(stream, chunksize=10000):
            if "attack_cat" not in df.columns:
                raise HTTPException(400, "The CSV needs an attack_cat column with the true labels (for example the UNSW-NB15 testing set).")
            truth = df["attack_cat"].fillna("Normal").astype(str).str.strip().replace({"Backdoors": "Backdoor", "": "Normal"})
            pred = score_frame(df)[0]
            y_true += truth.tolist()
            y_pred += pred.tolist()
    except pd.errors.EmptyDataError:
        raise HTTPException(400, "The uploaded CSV file is empty.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(400, f"Could not evaluate this CSV file: {exc}")

    labels = [str(c) for c in label_encoder.classes_]
    yt, yp = np.array(y_true), np.array(y_pred)
    p, r, f, sup = precision_recall_fscore_support(yt, yp, labels=labels, zero_division=0)
    wp, wr, wf, _ = precision_recall_fscore_support(yt, yp, labels=labels, average="weighted", zero_division=0)
    mp, mr, mf, _ = precision_recall_fscore_support(yt, yp, labels=labels, average="macro", zero_division=0)
    cm = confusion_matrix(yt, yp, labels=labels)
    ni = labels.index("Normal") if "Normal" in labels else 0
    normal_total = int(cm[ni].sum())
    attacks = yt != "Normal"
    audit(db, user.email, "EVALUATION", f"{file.filename}: {len(yt)} rows")
    return {
        "filename": file.filename, "rows": int(len(yt)),
        "accuracy": float((yt == yp).mean()),
        "weighted": {"precision": float(wp), "recall": float(wr), "f1": float(wf)},
        "macro": {"precision": float(mp), "recall": float(mr), "f1": float(mf)},
        "fpr": float(1 - cm[ni][ni] / normal_total) if normal_total else 0.0,
        "detection_rate": float((yp[attacks] != "Normal").mean()) if attacks.any() else 0.0,
        "labels": labels, "matrix": cm.tolist(),
        "per_class": [{"label": labels[i], "precision": float(p[i]), "recall": float(r[i]),
                       "f1": float(f[i]), "support": int(sup[i])} for i in range(len(labels))],
    }


def _csv_response(rows: list, filename: str) -> Response:
    out = io.StringIO()
    csv.writer(out).writerows(rows)
    return Response(out.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/runs/{rid}/report")
def run_report(rid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.get(PastRun, rid)
    if not r:
        raise HTTPException(404, "Run not found.")
    owner = db.get(User, r.user_id)
    rows = [["ThreatRadar detection report"], ["File", r.filename], ["Run by", owner.email if owner else ""],
            ["Date (UTC)", getattr(r, "created_at", "")], ["Total rows", r.total_rows],
            ["Threats detected", r.threats_detected], ["Critical threats", r.critical_threats],
            ["Active alerts", r.active_alerts], [], ["Attack category", "Count"]]
    rows += [[k, v] for k, v in json.loads(r.threat_distribution or "{}").items()]
    rows += [[], ["Risk level", "Count"]] + [[k, v] for k, v in json.loads(r.risk_distribution or "{}").items()]
    rows += [[], ["Sample predictions (first 100)"], ["#", "Prediction", "Confidence", "Risk score", "Risk level"]]
    rows += [[i + 1, x["prediction"], x["confidence"], x["risk_score"], x["risk_level"]]
             for i, x in enumerate(json.loads(r.results_json or "[]"))]
    return _csv_response(rows, f"threatradar_run_{rid}.csv")


@router.get("/intel/report")
def intel_report(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    runs = db.query(PastRun).all()
    totals, risk = Counter(), Counter()
    for r in runs:
        totals.update(json.loads(r.threat_distribution or "{}"))
        risk.update(json.loads(r.risk_distribution or "{}"))
    rows = [["ThreatRadar threat intelligence report"], ["Runs analysed", len(runs)],
            ["Total events", sum(r.total_rows or 0 for r in runs)],
            ["Total threats", sum(r.threats_detected or 0 for r in runs)], [],
            ["Attack category", "Severity (0-90)", "Detected events"]]
    rows += [[k, severity.get(k, 0), v] for k, v in sorted(totals.items(), key=lambda x: -x[1])]
    rows += [[], ["Risk level", "Threat events"]] + [[k, risk.get(k, 0)] for k in ("Low", "Medium", "High", "Critical")]
    return _csv_response(rows, "threatradar_intelligence_report.csv")