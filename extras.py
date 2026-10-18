"""Admin (users, roles, teams, audit log), incident management, threat-intelligence report, notification log."""
import html
import forecast, siem, threatintel, timeutil
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, PlainTextResponse
from pydantic import BaseModel
from db import insert_id, sql
from security import audit, current_user, require

router = APIRouter()
now = lambda: datetime.now(timezone.utc)
ROLES = ("viewer", "analyst", "admin")
STATUSES = ("open", "investigating", "resolved", "closed")

# ---------- who am I, and who can I assign work to ----------
@router.get("/api/me")
def me(user=Depends(current_user)):
    r = sql("SELECT u.role, t.name team FROM users u LEFT JOIN teams t ON t.id=u.team_id WHERE u.username=%s", (user,))[0]
    return {"username": user, "role": r["role"], "team": r["team"]}

@router.get("/api/users")
def users_list(user=Depends(current_user)):
    return {"users": [r["username"] for r in sql("SELECT username FROM users ORDER BY username")]}

# ---------- admin: users, roles, teams, audit log, notification log ----------
class UserEdit(BaseModel):
    role: str | None = None
    team_id: int | None = None
    clear_team: bool = False

class TeamIn(BaseModel):
    name: str

@router.get("/api/admin/users")
def admin_users(user=Depends(require("admin"))):
    return {"users": sql("SELECT u.username, u.role, u.team_id, t.name team FROM users u LEFT JOIN teams t ON t.id=u.team_id ORDER BY u.username"),
            "teams": sql("SELECT id, name FROM teams ORDER BY name")}

@router.post("/api/admin/users/{username}")
def admin_edit_user(username: str, e: UserEdit, request: Request, user=Depends(require("admin"))):
    username = username.lower()
    if e.role is not None:
        if e.role not in ROLES:
            raise HTTPException(400, "Unknown role")
        if username == user and e.role != "admin":
            raise HTTPException(400, "You cannot remove your own admin role")
        sql("UPDATE users SET role=%s WHERE username=%s", (e.role, username))
        audit(user, "role_change", f"{username} -> {e.role}", request)
    if e.clear_team or e.team_id is not None:
        sql("UPDATE users SET team_id=%s WHERE username=%s", (None if e.clear_team else e.team_id, username))
        audit(user, "team_change", f"{username} -> {'none' if e.clear_team else e.team_id}", request)
    return {"ok": True}

@router.post("/api/admin/teams")
def admin_team(t: TeamIn, request: Request, user=Depends(require("admin"))):
    name = t.name.strip()[:40]
    if not name:
        raise HTTPException(400, "Team name required")
    try:
        insert_id("INSERT INTO teams(name) VALUES(%s)", (name,))
    except Exception:
        raise HTTPException(409, "That team already exists")
    audit(user, "team_create", name, request)
    return {"ok": True}

@router.get("/api/admin/audit")
def admin_audit(limit: int = 200, user=Depends(require("admin"))):
    return {"rows": sql("SELECT id, ts, username, action, detail, ip FROM audit_log ORDER BY id DESC LIMIT %s", (max(1, min(limit, 1000)),))}

@router.get("/api/admin/notifications")
def admin_notifications(user=Depends(require("admin"))):
    return {"rows": sql("SELECT ts, channel, target, subject, status, error FROM notification_log ORDER BY id DESC LIMIT 50")}

# ---------- incident management ----------
class IncidentIn(BaseModel):
    alert_id: int | None = None
    title: str = ""
    severity: str = "High"
    assignee: str | None = None

class IncidentEdit(BaseModel):
    status: str | None = None
    assignee: str | None = None
    note: str | None = None

@router.post("/api/incidents")
def incident_create(i: IncidentIn, request: Request, user=Depends(require("analyst"))):
    title = i.title.strip()[:120]
    sev = i.severity if i.severity in ("Low", "Medium", "High", "Critical") else "High"
    if i.alert_id:
        a = sql("SELECT prediction, risk_label, risk_score FROM alerts WHERE id=%s", (i.alert_id,))
        if not a:
            raise HTTPException(404, "Alert not found")
        title, sev = title or f"{a[0]['prediction']} detected (risk {a[0]['risk_score']})", a[0]["risk_label"]
        sql("UPDATE alerts SET status='acknowledged', ack_by=%s, ack_at=UTC_TIMESTAMP() WHERE id=%s AND status='open'", (user, i.alert_id))
    if not title:
        raise HTTPException(400, "Give the incident a title")
    iid = insert_id("""INSERT INTO incidents(alert_id,title,severity,assignee,created_by,created_at,updated_at)
                       VALUES(%s,%s,%s,%s,%s,UTC_TIMESTAMP(),UTC_TIMESTAMP())""", (i.alert_id, title, sev, (i.assignee or "")[:32] or None, user))
    audit(user, "incident_create", f"#{iid} {title}", request)
    return {"id": iid}

@router.get("/api/incidents")
def incident_list(status: str = "", user=Depends(current_user)):
    w = " WHERE status=%s" if status in STATUSES else ""
    return {"rows": sql("SELECT id, alert_id, title, severity, status, assignee, created_by, created_at, updated_at FROM incidents"
                        + w + " ORDER BY id DESC LIMIT 200", (status,) if w else None)}

@router.post("/api/incidents/{iid}")
def incident_edit(iid: int, e: IncidentEdit, request: Request, user=Depends(require("analyst"))):
    if not sql("SELECT 1 FROM incidents WHERE id=%s", (iid,)):
        raise HTTPException(404, "Incident not found")
    if e.status is not None:
        if e.status not in STATUSES:
            raise HTTPException(400, "Unknown status")
        sql("UPDATE incidents SET status=%s, updated_at=UTC_TIMESTAMP() WHERE id=%s", (e.status, iid))
        audit(user, "incident_status", f"#{iid} -> {e.status}", request)
    if e.assignee is not None:
        sql("UPDATE incidents SET assignee=%s, updated_at=UTC_TIMESTAMP() WHERE id=%s", ((e.assignee or "")[:32] or None, iid))
        audit(user, "incident_assign", f"#{iid} -> {e.assignee or 'nobody'}", request)
    if e.note and e.note.strip():
        sql("INSERT INTO incident_notes(incident_id,username,ts,note) VALUES(%s,%s,UTC_TIMESTAMP(),%s)", (iid, user, e.note.strip()[:500]))
        sql("UPDATE incidents SET updated_at=UTC_TIMESTAMP() WHERE id=%s", (iid,))
    return {"ok": True}

@router.get("/api/incidents/{iid}/notes")
def incident_notes(iid: int, user=Depends(current_user)):
    return {"rows": sql("SELECT username, ts, note FROM incident_notes WHERE incident_id=%s ORDER BY id", (iid,))}

# ---------- threat intelligence report (attack trends, protocol analysis, risk) ----------
def _core_report(days, tz=0):
    a = ((now() - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S"),)
    k = sql("""SELECT COUNT(*) total, CAST(COALESCE(SUM(prediction<>'Normal'),0) AS UNSIGNED) attacks,
               CAST(COALESCE(SUM(risk_label='Critical'),0) AS UNSIGNED) critical, CAST(COALESCE(SUM(risk_label='High'),0) AS UNSIGNED) high,
               ROUND(COALESCE(AVG(risk_score),0),1) avg_risk,
               CAST(COALESCE(SUM(prediction='Normal' AND anomaly_score>=50),0) AS UNSIGNED) suspicious
               FROM detections WHERE ts>=%s""", a)[0]
    kp = {x: (float(v) if x == "avg_risk" else int(v)) for x, v in k.items()}
    kp["open_alerts"] = int(sql("SELECT COUNT(*) n FROM alerts WHERE status='open' AND ts>=%s", a)[0]["n"])
    kp["open_incidents"] = int(sql("SELECT COUNT(*) n FROM incidents WHERE status IN ('open','investigating')")[0]["n"])
    def by(col, lim):
        return [{"name": r["p"], "total": int(r["total"]), "attacks": int(r["attacks"])} for r in sql(
            f"""SELECT COALESCE({col},'unknown') p, COUNT(*) total, CAST(COALESCE(SUM(prediction<>'Normal'),0) AS UNSIGNED) attacks
                FROM detections WHERE ts>=%s GROUP BY p ORDER BY total DESC LIMIT {lim}""", a)]
    return {
        "days": days, "kpis": kp, "protocols": by("proto", 10), "services": by("service", 8),
        "daily": [{"d": str(r["d"]), "total": int(r["total"]), "attacks": int(r["attacks"])} for r in sql(
            """SELECT DATE(DATE_ADD(ts, INTERVAL %s MINUTE)) d, COUNT(*) total, CAST(COALESCE(SUM(prediction<>'Normal'),0) AS UNSIGNED) attacks
               FROM detections WHERE ts>=%s GROUP BY DATE(DATE_ADD(ts, INTERVAL %s MINUTE)) ORDER BY d""", (tz, a[0], tz))],
        "types": [{"name": r["prediction"], "n": int(r["n"]), "avg_risk": float(r["av"]), "max_risk": int(r["mx"])} for r in sql(
            """SELECT prediction, COUNT(*) n, ROUND(AVG(risk_score),1) av, MAX(risk_score) mx FROM detections
               WHERE ts>=%s AND prediction<>'Normal' GROUP BY prediction ORDER BY n DESC""", a)],
        "top": [{**r, "ts": str(r["ts"])} for r in sql(
            """SELECT ts, prediction, risk_score, risk_label, model, source, proto, service FROM detections
               WHERE ts>=%s ORDER BY risk_score DESC, id DESC LIMIT 10""", a)],
        "models": [{"name": r["m"], "n": int(r["n"])} for r in sql(
            "SELECT COALESCE(model,'unknown') m, COUNT(*) n FROM detections WHERE ts>=%s GROUP BY m ORDER BY n DESC", a)],
    }

def build_report(days, tz=0):
    r = _core_report(days, tz)
    r["tz"] = tz
    since = (now() - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    r["top_ips"] = [{"ip": q["ip"], "flows": int(q["flows"]), "attacks": int(q["attacks"]), "max_risk": int(q["mx"]), "blocklist": threatintel.in_blocklist(q["ip"])}
                    for q in sql("""SELECT src_ip ip, COUNT(*) flows, CAST(COALESCE(SUM(prediction<>'Normal'),0) AS UNSIGNED) attacks, MAX(risk_score) mx
                                    FROM detections WHERE ts>=%s AND src_ip IS NOT NULL GROUP BY src_ip ORDER BY attacks DESC, flows DESC LIMIT 10""", (since,))]
    return r

def render_html(r):
    e = html.escape
    def tbl(head, rows):
        return ("<table><tr>" + "".join(f"<th>{e(h)}</th>" for h in head) + "</tr>"
                + "".join("<tr>" + "".join(f"<td>{e(str(c))}</td>" for c in row) + "</tr>" for row in rows) + "</table>")
    k, pct = r["kpis"], lambda a, b: f"{(a / b * 100 if b else 0):.1f}%"
    parts = ["<!doctype html><html><head><meta charset='utf-8'><title>NetShield AI threat report</title><style>",
             "body{font-family:Segoe UI,Arial,sans-serif;max-width:920px;margin:30px auto;color:#111;padding:0 16px}",
             "table{border-collapse:collapse;width:100%;margin:8px 0 22px}th,td{border:1px solid #ccc;padding:6px 10px;text-align:left;font-size:14px}",
             "th{background:#eaf0ff}h2{margin-top:28px}</style></head><body>",
             "<h1>NetShield AI - Threat Intelligence Report</h1>",
             f"<p>Period: last {r['days']} day(s). Generated {timeutil.shift(now().strftime('%Y-%m-%d %H:%M:%S'), r.get('tz', 0))} ({timeutil.offset_label(r.get('tz', 0))}). Press Ctrl+P to save as PDF.</p>",
             "<h2>Summary</h2>", tbl(["Flows analyzed", "Attacks", "Attack rate", "Critical", "High", "Average risk", "Suspicious 'Normal' flows", "Open alerts", "Open incidents"],
                                      [[k["total"], k["attacks"], pct(k["attacks"], k["total"]), k["critical"], k["high"], k["avg_risk"], k["suspicious"], k["open_alerts"], k["open_incidents"]]]),
             "<h2>Attack types</h2>", tbl(["Attack", "Detections", "Average risk", "Highest risk"], [[t["name"], t["n"], t["avg_risk"], t["max_risk"]] for t in r["types"]]),
             "<h2>Daily trend</h2>", tbl(["Day", "Flows", "Attacks", "Attack rate"], [[d["d"], d["total"], d["attacks"], pct(d["attacks"], d["total"])] for d in r["daily"]]),
             "<h2>Protocol analysis</h2>", tbl(["Protocol", "Flows", "Attacks", "Attack rate"], [[p["name"], p["total"], p["attacks"], pct(p["attacks"], p["total"])] for p in r["protocols"]]),
             "<h2>Services</h2>", tbl(["Service", "Flows", "Attacks", "Attack rate"], [[p["name"], p["total"], p["attacks"], pct(p["attacks"], p["total"])] for p in r["services"]]),
             "<h2>Highest-risk detections</h2>", tbl(["Time", "Attack", "Risk", "Level", "Model", "Source", "Protocol", "Service"],
                                                     [[timeutil.shift(t["ts"], r.get("tz", 0)), t["prediction"], t["risk_score"], t["risk_label"], t["model"], t["source"], t["proto"], t["service"]] for t in r["top"]]),
             "<h2>Top source IPs</h2>", tbl(["IP", "Flows", "Attacks", "Highest risk", "On blocklist"], [[i["ip"], i["flows"], i["attacks"], i["max_risk"], "yes" if i["blocklist"] else "no"] for i in r.get("top_ips", [])]),
             "<h2>Models used</h2>", tbl(["Model", "Predictions"], [[m["name"], m["n"]] for m in r["models"]]), "</body></html>"]
    return "".join(parts)

@router.get("/api/report")
def report(days: int = 7, tz: int = 0, user=Depends(current_user)):
    return build_report(max(1, min(days, 90)), max(-840, min(840, tz)))

@router.get("/api/report.html")
def report_html(days: int = 7, tz: int = 0, user=Depends(current_user)):
    return HTMLResponse(render_html(build_report(max(1, min(days, 90)), max(-840, min(840, tz)))))

# ---------- intrusion forecast ----------
@router.get("/api/forecast")
def forecast_api(hours: int = 12, history: int = 72, tz: int = 0, user=Depends(current_user)):
    hours, history, tz = max(1, min(hours, 48)), max(12, min(history, 336)), max(-840, min(840, tz))
    off = timedelta(minutes=tz)                        # hours are grouped in the viewer's local time
    now_local = now() + off
    start = (now_local - timedelta(hours=history)).replace(minute=0, second=0, microsecond=0)
    rows = sql("""SELECT DATE_FORMAT(DATE_ADD(ts, INTERVAL %s MINUTE),'%%Y-%%m-%%d %%H') h,
                  CAST(COALESCE(SUM(prediction<>'Normal'),0) AS UNSIGNED) attacks,
                  CAST(COALESCE(SUM(risk_label IN ('High','Critical')),0) AS UNSIGNED) high
                  FROM detections WHERE ts>=%s GROUP BY h ORDER BY h""", (tz, (start - off).strftime("%Y-%m-%d %H:%M:%S")))
    got = {r["h"]: (int(r["attacks"]), int(r["high"])) for r in rows}
    labels, att, high, t = [], [], [], start
    while t <= now_local:
        k = t.strftime("%Y-%m-%d %H")
        labels.append(k[5:]); a, h = got.get(k, (0, 0)); att.append(a); high.append(h)
        t += timedelta(hours=1)
    fc, band = forecast.forecast(att, hours)
    fh, _ = forecast.forecast(high, hours)
    return {"labels": labels, "attacks": att, "high": high, "forecast": fc, "forecast_high": fh, "band": band,
            "forecast_labels": [(now_local + timedelta(hours=i + 1)).strftime("%m-%d %H") for i in range(hours)], "outlook": forecast.outlook(att, fc)}

# ---------- threat intelligence report (attack trends, protocol analysis, risk) ----------
def _core_report(days, tz=0):
    a = ((now() - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S"),)
    k = sql("""SELECT COUNT(*) total, CAST(COALESCE(SUM(prediction<>'Normal'),0) AS UNSIGNED) attacks,
               CAST(COALESCE(SUM(risk_label='Critical'),0) AS UNSIGNED) critical, CAST(COALESCE(SUM(risk_label='High'),0) AS UNSIGNED) high,
               ROUND(COALESCE(AVG(risk_score),0),1) avg_risk,
               CAST(COALESCE(SUM(prediction='Normal' AND anomaly_score>=50),0) AS UNSIGNED) suspicious
               FROM detections WHERE ts>=%s""", a)[0]
    kp = {x: (float(v) if x == "avg_risk" else int(v)) for x, v in k.items()}
    kp["open_alerts"] = int(sql("SELECT COUNT(*) n FROM alerts WHERE status='open' AND ts>=%s", a)[0]["n"])
    kp["open_incidents"] = int(sql("SELECT COUNT(*) n FROM incidents WHERE status IN ('open','investigating')")[0]["n"])
    def by(col, lim):
        return [{"name": r["p"], "total": int(r["total"]), "attacks": int(r["attacks"])} for r in sql(
            f"""SELECT COALESCE({col},'unknown') p, COUNT(*) total, CAST(COALESCE(SUM(prediction<>'Normal'),0) AS UNSIGNED) attacks
                FROM detections WHERE ts>=%s GROUP BY p ORDER BY total DESC LIMIT {lim}""", a)]
    return {
        "days": days, "kpis": kp, "protocols": by("proto", 10), "services": by("service", 8),
        "daily": [{"d": str(r["d"]), "total": int(r["total"]), "attacks": int(r["attacks"])} for r in sql(
            """SELECT DATE(DATE_ADD(ts, INTERVAL %s MINUTE)) d, COUNT(*) total, CAST(COALESCE(SUM(prediction<>'Normal'),0) AS UNSIGNED) attacks
               FROM detections WHERE ts>=%s GROUP BY DATE(DATE_ADD(ts, INTERVAL %s MINUTE)) ORDER BY d""", (tz, a[0], tz))],
        "types": [{"name": r["prediction"], "n": int(r["n"]), "avg_risk": float(r["av"]), "max_risk": int(r["mx"])} for r in sql(
            """SELECT prediction, COUNT(*) n, ROUND(AVG(risk_score),1) av, MAX(risk_score) mx FROM detections
               WHERE ts>=%s AND prediction<>'Normal' GROUP BY prediction ORDER BY n DESC""", a)],
        "top": [{**r, "ts": str(r["ts"])} for r in sql(
            """SELECT ts, prediction, risk_score, risk_label, model, source, proto, service FROM detections
               WHERE ts>=%s ORDER BY risk_score DESC, id DESC LIMIT 10""", a)],
        "models": [{"name": r["m"], "n": int(r["n"])} for r in sql(
            "SELECT COALESCE(model,'unknown') m, COUNT(*) n FROM detections WHERE ts>=%s GROUP BY m ORDER BY n DESC", a)],
    }

def build_report(days, tz=0):
    r = _core_report(days, tz)
    r["tz"] = tz
    since = (now() - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    r["top_ips"] = [{"ip": q["ip"], "flows": int(q["flows"]), "attacks": int(q["attacks"]), "max_risk": int(q["mx"]), "blocklist": threatintel.in_blocklist(q["ip"])}
                    for q in sql("""SELECT src_ip ip, COUNT(*) flows, CAST(COALESCE(SUM(prediction<>'Normal'),0) AS UNSIGNED) attacks, MAX(risk_score) mx
                                    FROM detections WHERE ts>=%s AND src_ip IS NOT NULL GROUP BY src_ip ORDER BY attacks DESC, flows DESC LIMIT 10""", (since,))]
    return r

def render_html(r):
    e = html.escape
    def tbl(head, rows):
        return ("<table><tr>" + "".join(f"<th>{e(h)}</th>" for h in head) + "</tr>"
                + "".join("<tr>" + "".join(f"<td>{e(str(c))}</td>" for c in row) + "</tr>" for row in rows) + "</table>")
    k, pct = r["kpis"], lambda a, b: f"{(a / b * 100 if b else 0):.1f}%"
    parts = ["<!doctype html><html><head><meta charset='utf-8'><title>NetShield AI threat report</title><style>",
             "body{font-family:Segoe UI,Arial,sans-serif;max-width:920px;margin:30px auto;color:#111;padding:0 16px}",
             "table{border-collapse:collapse;width:100%;margin:8px 0 22px}th,td{border:1px solid #ccc;padding:6px 10px;text-align:left;font-size:14px}",
             "th{background:#eaf0ff}h2{margin-top:28px}</style></head><body>",
             "<h1>NetShield AI - Threat Intelligence Report</h1>",
             f"<p>Period: last {r['days']} day(s). Generated {timeutil.shift(now().strftime('%Y-%m-%d %H:%M:%S'), r.get('tz', 0))} ({timeutil.offset_label(r.get('tz', 0))}). Press Ctrl+P to save as PDF.</p>",
             "<h2>Summary</h2>", tbl(["Flows analyzed", "Attacks", "Attack rate", "Critical", "High", "Average risk", "Suspicious 'Normal' flows", "Open alerts", "Open incidents"],
                                      [[k["total"], k["attacks"], pct(k["attacks"], k["total"]), k["critical"], k["high"], k["avg_risk"], k["suspicious"], k["open_alerts"], k["open_incidents"]]]),
             "<h2>Attack types</h2>", tbl(["Attack", "Detections", "Average risk", "Highest risk"], [[t["name"], t["n"], t["avg_risk"], t["max_risk"]] for t in r["types"]]),
             "<h2>Daily trend</h2>", tbl(["Day", "Flows", "Attacks", "Attack rate"], [[d["d"], d["total"], d["attacks"], pct(d["attacks"], d["total"])] for d in r["daily"]]),
             "<h2>Protocol analysis</h2>", tbl(["Protocol", "Flows", "Attacks", "Attack rate"], [[p["name"], p["total"], p["attacks"], pct(p["attacks"], p["total"])] for p in r["protocols"]]),
             "<h2>Services</h2>", tbl(["Service", "Flows", "Attacks", "Attack rate"], [[p["name"], p["total"], p["attacks"], pct(p["attacks"], p["total"])] for p in r["services"]]),
             "<h2>Highest-risk detections</h2>", tbl(["Time", "Attack", "Risk", "Level", "Model", "Source", "Protocol", "Service"],
                                                     [[timeutil.shift(t["ts"], r.get("tz", 0)), t["prediction"], t["risk_score"], t["risk_label"], t["model"], t["source"], t["proto"], t["service"]] for t in r["top"]]),
             "<h2>Top source IPs</h2>", tbl(["IP", "Flows", "Attacks", "Highest risk", "On blocklist"], [[i["ip"], i["flows"], i["attacks"], i["max_risk"], "yes" if i["blocklist"] else "no"] for i in r.get("top_ips", [])]),
             "<h2>Models used</h2>", tbl(["Model", "Predictions"], [[m["name"], m["n"]] for m in r["models"]]), "</body></html>"]
    return "".join(parts)

@router.get("/api/report")
def report(days: int = 7, tz: int = 0, user=Depends(current_user)):
    return build_report(max(1, min(days, 90)), max(-840, min(840, tz)))

@router.get("/api/report.html")
def report_html(days: int = 7, tz: int = 0, user=Depends(current_user)):
    return HTMLResponse(render_html(build_report(max(1, min(days, 90)), max(-840, min(840, tz)))))

# ---------- intrusion forecast ----------
@router.get("/api/forecast")
def forecast_api(hours: int = 12, history: int = 72, user=Depends(current_user)):
    hours, history = max(1, min(hours, 48)), max(12, min(history, 336))
    start = (now() - timedelta(hours=history)).replace(minute=0, second=0, microsecond=0)
    rows = sql("""SELECT DATE_FORMAT(ts,'%%Y-%%m-%%d %%H') h, CAST(COALESCE(SUM(prediction<>'Normal'),0) AS UNSIGNED) attacks,
                  CAST(COALESCE(SUM(risk_label IN ('High','Critical')),0) AS UNSIGNED) high
                  FROM detections WHERE ts>=%s GROUP BY h ORDER BY h""", (start.strftime("%Y-%m-%d %H:%M:%S"),))
    got = {r["h"]: (int(r["attacks"]), int(r["high"])) for r in rows}
    labels, att, high, t = [], [], [], start
    while t <= now():
        k = t.strftime("%Y-%m-%d %H")
        labels.append(k[5:]); a, h = got.get(k, (0, 0)); att.append(a); high.append(h)
        t += timedelta(hours=1)
    fc, band = forecast.forecast(att, hours)
    fh, _ = forecast.forecast(high, hours)
    return {"labels": labels, "attacks": att, "high": high, "forecast": fc, "forecast_high": fh, "band": band,
            "forecast_labels": [(now() + timedelta(hours=i + 1)).strftime("%m-%d %H") for i in range(hours)], "outlook": forecast.outlook(att, fc)}

# ---------- threat intelligence ----------
@router.get("/api/threatintel/{ip}")
def ti_lookup(ip: str, user=Depends(current_user)):
    try:
        return threatintel.lookup(ip)
    except ValueError:
        raise HTTPException(400, "That is not a valid IP address")

# ---------- SIEM export (pull) ----------
@router.get("/api/siem/export")
def siem_export(format: str = "cef", limit: int = 200, user=Depends(require("analyst"))):
    rows = sql("SELECT ts, prediction, confidence, risk_score, risk_label, source, source_name, src_ip FROM alerts ORDER BY id DESC LIMIT %s",
               (max(1, min(limit, 2000)),))
    return PlainTextResponse(siem.export(rows, format))
