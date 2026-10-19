"""Application audit events and local, role-scoped IP evidence investigations."""
import contextvars
import hashlib
import ipaddress
import json
import sqlite3
import time
import uuid
from collections import Counter
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Query, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.responses import Response
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

REQUEST_CONTEXT = contextvars.ContextVar("security_request", default=None)
IP_WINDOW = 50000
EXPORT_LIMIT = 10000
STATUSES = ("Open", "Investigating", "Resolved", "False Positive")


def clean(value, maximum=300):
    return "".join(c for c in str(value or "") if c >= " " and c != "\x7f")[:maximum]


def address(value):
    try:
        text = str(value or "").strip()
        if "%" in text:
            return None
        return str(ipaddress.ip_address(text))
    except ValueError:
        return None


def classification(ip):
    parsed = ipaddress.ip_address(ip)
    if parsed.is_loopback:
        kind = "Loopback"
    elif parsed.is_unspecified:
        kind = "Unspecified"
    elif parsed.is_multicast:
        kind = "Multicast"
    elif parsed.is_link_local:
        kind = "Link local"
    elif parsed.version == 4 and parsed in ipaddress.ip_network("100.64.0.0/10"):
        kind = "Shared address space"
    elif parsed.is_global:
        kind = "Globally routable"
    else:
        kind = "Private or special use"
    return {"ip": ip, "version": parsed.version, "kind": kind,
            "globally_routable": parsed.is_global,
            "interpretation": "Address properties do not establish reputation, ownership or a person's identity."}


def event_properties(action):
    if action in {"login", "logout", "email_verified"}:
        return "Authentication", "Success", "Info"
    if action.startswith("scan_"):
        failed = action in {"scan_failed", "scan_completedwitherrors"}
        return "Scan", "Failure" if failed else "Success", "Warning" if failed else "Info"
    if action.startswith("incident_"):
        return "Investigation", "Success", "Info"
    if action == "role_changed":
        return "Administration", "Success", "Warning"
    if action == "upload":
        return "Data", "Success", "Info"
    return "Application", "Success", "Info"


def capture_time(value):
    text = str(value or "").strip()
    try:
        stamp = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        stamp = None
        for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d-%m-%Y %H:%M:%S"):
            try:
                stamp = datetime.strptime(text, fmt)
                break
            except ValueError:
                pass
    if stamp is None:
        return None
    if stamp.tzinfo is not None:
        stamp = stamp.astimezone(timezone.utc).replace(tzinfo=None)
    return stamp


class IPNote(BaseModel):
    ip: str = Field(min_length=2, max_length=64)
    status: str
    note: str = Field(default="", max_length=2000)
    version: int = Field(default=0, ge=0)


def install(m):
    previous_init = m.init

    def insert(c, actor, action, detail="", *, category=None, outcome=None,
               severity=None, resource=None, http_status=None, legacy_id=None,
               created=None, context=True):
        ctx = (REQUEST_CONTEXT.get() or {}) if context else {}
        default_category, default_outcome, default_severity = event_properties(action)
        return c.execute("""INSERT OR IGNORE INTO security_events
            (created,actor,action,category,outcome,severity,resource,client_ip,
             request_id,http_status,detail,legacy_audit_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
            (created or m.now(), clean(actor, 120) or "anonymous", clean(action, 80),
             category or default_category, outcome or default_outcome, severity or default_severity,
             clean(resource or detail or ctx.get("route") or "workspace", 240),
             ctx.get("client_ip"), ctx.get("request_id"), http_status,
             clean(detail, 500), legacy_id)).lastrowid

    def record(actor, action, detail="", **kwargs):
        try:
            with m.connection() as c:
                return insert(c, actor, action, detail, **kwargs)
        except sqlite3.Error:
            m.log.exception("Security event could not be persisted")
            return None

    def enhanced_audit(actor, action, detail=""):
        with m.connection() as c:
            cur = c.execute("INSERT INTO audit(actor,action,detail,created) VALUES(?,?,?,?)",
                            (actor, action, detail, m.now()))
            insert(c, actor, action, detail, legacy_id=cur.lastrowid)

    def init():
        previous_init()
        with m.connection() as c:
            c.executescript("""
                CREATE TABLE IF NOT EXISTS security_events(
                    id INTEGER PRIMARY KEY,created TEXT NOT NULL,actor TEXT NOT NULL,
                    action TEXT NOT NULL,category TEXT NOT NULL,outcome TEXT NOT NULL,
                    severity TEXT NOT NULL,resource TEXT,client_ip TEXT,request_id TEXT,
                    http_status INTEGER,detail TEXT,legacy_audit_id INTEGER UNIQUE);
                CREATE INDEX IF NOT EXISTS security_actor ON security_events(actor,id);
                CREATE INDEX IF NOT EXISTS security_created ON security_events(created);
                CREATE INDEX IF NOT EXISTS security_ip ON security_events(client_ip,id);
                CREATE INDEX IF NOT EXISTS security_action ON security_events(action,id);
                CREATE TRIGGER IF NOT EXISTS security_no_update BEFORE UPDATE ON security_events
                    BEGIN SELECT RAISE(ABORT,'Security events are append only'); END;
                CREATE TRIGGER IF NOT EXISTS security_no_delete BEFORE DELETE ON security_events
                    BEGIN SELECT RAISE(ABORT,'Security events are append only'); END;
                CREATE TABLE IF NOT EXISTS revoked_tokens(digest TEXT PRIMARY KEY,expires REAL NOT NULL);
                CREATE TABLE IF NOT EXISTS ip_cases(
                    owner TEXT NOT NULL,ip TEXT NOT NULL,status TEXT NOT NULL,note TEXT NOT NULL,
                    version INTEGER NOT NULL,updated TEXT NOT NULL,PRIMARY KEY(owner,ip));
            """)
            columns = {r["name"] for r in c.execute("PRAGMA table_info(flows)")}
            for name in ("source_ip", "destination_ip", "recorded_at"):
                if name not in columns:
                    c.execute(f"ALTER TABLE flows ADD COLUMN {name} TEXT")
            c.execute("CREATE INDEX IF NOT EXISTS flow_source_ip ON flows(source_ip,id)")
            c.execute("CREATE INDEX IF NOT EXISTS flow_destination_ip ON flows(destination_ip,id)")
            c.execute("CREATE TABLE IF NOT EXISTS security_migrations(name TEXT PRIMARY KEY)")
            migrated = c.execute("SELECT 1 FROM security_migrations WHERE name='flow_ip_v1'").fetchone()
        if not migrated:
            after = 0
            while True:
                with m.connection() as c:
                    rows = c.execute("SELECT id,payload FROM flows WHERE id>? ORDER BY id LIMIT 1000", (after,)).fetchall()
                    if not rows:
                        c.execute("INSERT OR IGNORE INTO security_migrations VALUES('flow_ip_v1')")
                        break
                    for row in rows:
                        try:
                            payload = json.loads(row["payload"])
                            src = address(payload.get("src_ip", {}).get("value"))
                            dst = address(payload.get("dst_ip", {}).get("value"))
                        except (ValueError, AttributeError):
                            src = dst = None
                        c.execute("UPDATE flows SET source_ip=?,destination_ip=? WHERE id=?", (src, dst, row["id"]))
                    after = rows[-1]["id"]
        # Preserve the old event's actual recorded timestamp; missing facts stay null.
        with m.connection() as c:
            legacy = c.execute("""SELECT a.* FROM audit a LEFT JOIN security_events e
                ON e.legacy_audit_id=a.id WHERE e.id IS NULL ORDER BY a.id""")
            for row in legacy:
                insert(c, row["actor"], row["action"], row["detail"], category="Legacy audit",
                       outcome="Recorded", severity="Info", legacy_id=row["id"],
                       created=row["created"], context=False)

    m.init = init
    m.audit = enhanced_audit
    m.security_event = record

    @m.app.exception_handler(StarletteHTTPException)
    async def safe_error_reason(request, exc):
        # An allowlist explains failures without copying request bodies or secrets.
        reasons = {
            "Invalid invitation code": "Invitation rejected",
            "Complete human verification first": "Human verification missing",
            "Human verification failed or expired. Please retry.": "Human verification failed or expired",
            "Human verification unavailable. Please retry.": "Human verification provider unavailable",
            "Too many attempts. Wait 15 minutes before trying again.": "Authentication rate limit enforced",
            "Incorrect credentials or unverified account": "Credentials rejected or account unverified",
            "This email is not authorised for the workspace": "Registration email outside authorised list",
            "Verification email could not be sent. Check sender configuration and retry.": "Verification email delivery failed",
            "Incorrect code. At most five attempts are permitted.": "Email verification code rejected",
            "Code expired or unavailable. Request a new code.": "Email verification code expired or unavailable",
        }
        request.state.security_reason = reasons.get(str(exc.detail), "Request did not meet access or validation requirements")
        return await http_exception_handler(request, exc)

    @m.app.middleware("http")
    async def request_events(request, call_next):
        ctx = {"request_id": uuid.uuid4().hex,
               "client_ip": address(request.client.host) if request.client else None}
        marker = REQUEST_CONTEXT.set(ctx)
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
            response.headers["X-Request-ID"] = ctx["request_id"]
            return response
        finally:
            route = getattr(request.scope.get("route"), "path", "")
            if not route and request.url.path.startswith("/api/"):
                route = "/api/<unmatched>"
            actor = getattr(request.state, "security_actor", "anonymous")
            try:
                action = None
                category = "Application"
                if route == "/api/signup":
                    action, category = "registration_requested", "Authentication"
                elif route in {"/api/login", "/api/auth/verify"} and status >= 400:
                    action = "login_rejected" if route == "/api/login" else "email_verification_rejected"
                    category = "Authentication"
                elif route.startswith("/api/") and status >= 400:
                    action = "access_denied" if status in {401, 403} else "request_rejected"
                    category = "Access control" if status in {401, 403} else "Application"
                elif route == "/api/scans/{scan}/stop":
                    action, category = "scan_stop_requested", "Scan"
                elif route in {"/api/scans/{scan}/export", "/api/scans/{scan}/report-html",
                               "/api/incidents-export.xlsx", "/api/incidents/{incident}/case.pdf",
                               "/api/security/events/export"}:
                    action, category = "evidence_exported", "Export"
                if action:
                    if status == 429:
                        action, category = "rate_limit_enforced", "Authentication" if route in {"/api/login", "/api/signup", "/api/auth/verify"} else "Application"
                    resource = route
                    for key in ("scan", "incident"):
                        if key in request.path_params:
                            resource += " " + key + "=" + clean(request.path_params[key], 64)
                    reason = getattr(request.state, "security_reason", "") if status >= 400 else ""
                    record(actor, action, "HTTP " + str(status) + (" · " + reason if reason else ""), category=category,
                           outcome="Success" if status < 400 else "Denied" if status in {401, 403, 429} else "Failure",
                           severity="Warning" if status >= 400 else "Info", resource=resource, http_status=status)
            except sqlite3.Error:
                # Logging failure must not turn a successful operation into a retry.
                m.log.exception("Security event could not be persisted")
            finally:
                REQUEST_CONTEXT.reset(marker)

    def scope(u, alias=""):
        return ("1=1", []) if u["role"] == "Admin" else (alias + "actor=?", [u["username"]])

    def filters(u, q="", action="", outcome="", severity="", since="", until="", ip=""):
        clause, args = scope(u)
        clauses = [clause]
        if q:
            term = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
            clauses.append("(actor LIKE ? ESCAPE '\\' OR action LIKE ? ESCAPE '\\' OR resource LIKE ? ESCAPE '\\' OR request_id LIKE ? ESCAPE '\\')")
            args.extend([term] * 4)
        for name, value in (("action", action), ("outcome", outcome), ("severity", severity)):
            if value:
                clauses.append(name + "=?")
                args.append(value)
        for name, value, operator in (("since", since, ">="), ("until", until, "<=")):
            if value:
                try:
                    stamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
                    if stamp.tzinfo is None:
                        raise ValueError()
                except ValueError:
                    raise HTTPException(422, name + " must include a UTC offset")
                clauses.append("created" + operator + "?")
                args.append(stamp.astimezone(timezone.utc).isoformat())
        if ip:
            parsed = address(ip)
            if parsed is None:
                raise HTTPException(422, "Enter a valid IPv4 or IPv6 address")
            clauses.append("client_ip=?")
            args.append(parsed)
        return " AND ".join(clauses), args

    @m.app.get("/api/security/events")
    def events(q: str = Query("", max_length=120), action: str = Query("", max_length=80),
               outcome: str = Query("", max_length=20), severity: str = Query("", max_length=20),
               since: str = Query("", max_length=40), until: str = Query("", max_length=40),
               ip: str = Query("", max_length=64), before: int = Query(0, ge=0),
               limit: int = Query(50, ge=1, le=200), u=Depends(m.user)):
        where, args = filters(u, q, action, outcome, severity, since, until, ip)
        with m.connection() as c:
            totals = dict(c.execute("""SELECT COUNT(*) total,
                COALESCE(SUM(outcome IN ('Denied','Failure')),0) rejected,
                COALESCE(SUM(category='Authentication'),0) authentication,
                COALESCE(SUM(severity='Warning'),0) warnings FROM security_events WHERE """ + where, args).fetchone())
            page_where = where + (" AND id<?" if before else "")
            page_args = args + ([before] if before else [])
            rows = [dict(r) for r in c.execute("SELECT * FROM security_events WHERE " + page_where + " ORDER BY id DESC LIMIT ?", page_args + [limit + 1])]
            base, base_args = scope(u)
            actions = [r[0] for r in c.execute("SELECT DISTINCT action FROM security_events WHERE " + base + " ORDER BY action", base_args)]
        more = len(rows) > limit
        items = rows[:limit]
        return {"items": items, "totals": totals, "actions": actions,
                "next_before": items[-1]["id"] if more else None, "generated_at": m.now(),
                "scope": "All workspace events, including unauthenticated failures" if u["role"] == "Admin" else "Only events attributed to your verified account; anonymous failures are administrator-only",
                "timestamp_basis": "Application events use server UTC time. Legacy events retain their original timestamp and have unknown client IP and outcome. Request IP is the peer reported by the server; localhost normally shows 127.0.0.1. Behind a proxy it may identify the proxy."}

    @m.app.get("/api/security/events/export")
    def event_export(q: str = Query("", max_length=120), action: str = Query("", max_length=80),
                     outcome: str = Query("", max_length=20), severity: str = Query("", max_length=20),
                     since: str = Query("", max_length=40), until: str = Query("", max_length=40),
                     ip: str = Query("", max_length=64), u=Depends(m.user)):
        where, args = filters(u, q, action, outcome, severity, since, until, ip)
        with m.connection() as c:
            rows = [dict(r) for r in c.execute("SELECT * FROM security_events WHERE " + where + " ORDER BY id DESC LIMIT ?", args + [EXPORT_LIMIT])]
            total = c.execute("SELECT COUNT(*) FROM security_events WHERE " + where, args).fetchone()[0]
        body = "".join(json.dumps(row, ensure_ascii=True) + "\n" for row in rows).encode()
        return Response(body, media_type="application/x-ndjson", headers={
            "Content-Disposition": 'attachment; filename="tracevigil-security-events.ndjson"',
            "X-Export-Total": str(total), "X-Export-Rows": str(len(rows)),
            "X-Export-Truncated": str(total > len(rows)).lower(),
            "X-Content-SHA256": hashlib.sha256(body).hexdigest()})

    @m.app.post("/api/logout")
    def logout(request: Request, u=Depends(m.user)):
        token = request.headers["authorization"].split(" ", 1)[1]
        claims = m.jwt.decode(token, m.SECRET, algorithms=["HS256"])
        with m.connection() as c:
            c.execute("DELETE FROM revoked_tokens WHERE expires<?", (time.time(),))
            c.execute("INSERT OR IGNORE INTO revoked_tokens VALUES(?,?)", (hashlib.sha256(token.encode()).hexdigest(), claims["exp"]))
        record(u["username"], "logout", "Current access token revoked", category="Authentication")
        return {"message": "Signed out. Current access token revoked."}

    def ip_evidence(ip, scan_id, u):
        normalized = address(ip)
        if not normalized:
            raise HTTPException(422, "Enter a valid IPv4 or IPv6 address, without a URL, port or zone ID")
        if scan_id:
            m.authorize(scan_id, u)
        clauses = ["(f.source_ip=? OR f.destination_ip=?)"]
        args = [normalized, normalized]
        if u["role"] != "Admin":
            clauses.append("s.owner=?")
            args.append(u["username"])
        if scan_id:
            clauses.append("s.id=?")
            args.append(scan_id)
        where = " AND ".join(clauses)
        labels, risks, protocols, peers, ports, buckets = (Counter() for _ in range(6))
        sampled, scan_ids, outgoing_peers, outgoing_ports = [], set(), set(), set()
        inspected = scored = reviews = anomalies = disagreements = source_rows = dest_rows = 0
        priority_total = max_priority = 0
        first = last = None
        missing_capture = 0
        latest_ingested = None
        with m.connection() as c:
            total = c.execute("SELECT COUNT(*) FROM flows f JOIN scans s ON s.id=f.scan_id WHERE " + where, args).fetchone()[0]
            records = c.execute("SELECT f.*,s.source,s.created AS scan_created FROM flows f JOIN scans s ON s.id=f.scan_id WHERE " + where + " ORDER BY f.id DESC LIMIT ?", args + [IP_WINDOW])
            for row in records:
                inspected += 1
                scan_ids.add(row["scan_id"])
                r = json.loads(row["payload"])
                outgoing = row["source_ip"] == normalized
                incoming = row["destination_ip"] == normalized
                source_rows += int(outgoing)
                dest_rows += int(incoming)
                peer = row["destination_ip"] if outgoing else row["source_ip"]
                if peer:
                    peers[peer] += 1
                port = r.get("dst_port") if outgoing else r.get("src_port")
                if port is not None:
                    ports[str(port)] += 1
                if outgoing:
                    if peer:
                        outgoing_peers.add(peer)
                    if r.get("dst_port") is not None:
                        outgoing_ports.add(str(r["dst_port"]))
                protocols[str(r.get("protocol_name") or r.get("protocol") or "Unavailable")] += 1
                stamp = capture_time(r.get("timestamp"))
                if stamp:
                    entry = (stamp, r["timestamp"])
                    first = min(first, entry) if first else entry
                    last = max(last, entry) if last else entry
                    if len(buckets) < 256 or stamp.strftime("%Y-%m-%d %H") in buckets:
                        buckets[stamp.strftime("%Y-%m-%d %H")] += 1
                else:
                    missing_capture += 1
                if row["recorded_at"]:
                    latest_ingested = max(latest_ingested or "", row["recorded_at"])
                if r.get("status") == "scored":
                    scored += 1
                    labels[r["consensus"]] += 1
                    risks[r["risk_label"]] += 1
                    priority_total += r["risk_score"]
                    max_priority = max(max_priority, r["risk_score"])
                    reviews += bool(r.get("needs_review"))
                    anomalies += bool(r.get("anomaly"))
                    disagreements += not r.get("models_agree", True)
                if len(sampled) < 100:
                    sampled.append({"scan_id": row["scan_id"], "source": row["source"],
                                    "recorded_at": row["recorded_at"], **r})
            ic = ["(i.src_ip=? OR i.dst_ip=?)"]
            ia = [normalized, normalized]
            if u["role"] != "Admin":
                ic.append("i.owner=?")
                ia.append(u["username"])
            if scan_id:
                ic.append("i.scan_id=?")
                ia.append(scan_id)
            incident_rows = [dict(r) for r in c.execute("SELECT i.* FROM incidents i WHERE " + " AND ".join(ic) + " ORDER BY i.id DESC LIMIT 201", ia)]
            ew, ea = filters(u, ip=normalized)
            audit_rows = [dict(r) for r in c.execute("SELECT * FROM security_events WHERE " + ew + " ORDER BY id DESC LIMIT 50", ea)]
            case_where = "ip=?" + ("" if u["role"] == "Admin" else " AND owner=?")
            case_args = [normalized] + ([] if u["role"] == "Admin" else [u["username"]])
            cases = [dict(r) for r in c.execute("SELECT * FROM ip_cases WHERE " + case_where + " ORDER BY updated DESC LIMIT 100", case_args)]
        findings = []
        if disagreements:
            findings.append(f"{disagreements} scored flows have model disagreement; inspect their per-model predictions.")
        if anomalies:
            findings.append(f"{anomalies} flows have an Isolation Forest anomaly flag; corroborate with endpoint evidence.")
        if len(outgoing_ports) >= 10:
            findings.append(f"Source role reached {len(outgoing_ports)} destination ports in this evidence window. Check for authorised discovery or scanning; this count alone does not establish an attack.")
        if len(outgoing_peers) >= 5:
            findings.append(f"Source role contacted {len(outgoing_peers)} distinct destination addresses. Review expected service dependencies.")
        if not total:
            findings.append("No matching saved flows in your permitted scope. This does not establish that the IP is safe.")
        record(u["username"], "ip_investigated", "Local saved evidence inspected", category="Investigation", resource=normalized)
        return {"address": classification(normalized), "generated_at": m.now(),
                "reputation": {"status": "Not checked", "reason": "Local evidence only. No external threat-feed query, network probe, geolocation or ownership lookup was performed."},
                "coverage": {"matching_saved_flows": total, "inspected_flows": inspected,
                             "window_limit": IP_WINDOW, "truncated": total > inspected,
                             "samples_shown": len(sampled), "timeline_limit": 256,
                             "incident_list_truncated": len(incident_rows) > 200,
                             "scope": ("Selected scan " + scan_id) if scan_id else "All workspace scans" if u["role"] == "Admin" else "Only your saved scans",
                             "scan_filter": scan_id or None,
                             "basis": "Aggregates use at most the latest 50000 matching saved flows by storage ID. Repeated scans count again. IP request events are separate from captured traffic."},
                "totals": {"scored": scored, "invalid": inspected-scored, "review_flows": reviews,
                           "predicted_attacks": sum(v for k, v in labels.items() if k != "BENIGN"),
                           "source_role_flows": source_rows, "destination_role_flows": dest_rows,
                           "scans": len(scan_ids), "peers": len(peers), "anomalies": anomalies,
                           "disagreements": disagreements, "max_risk": max_priority if scored else None,
                           "mean_risk": round(priority_total/scored, 2) if scored else None,
                           "outgoing_destination_ports": len(outgoing_ports)},
                "capture_time": {"first": first[1] if first else None, "last": last[1] if last else None,
                                 "unavailable_rows": missing_capture, "latest_recorded_at_utc": latest_ingested,
                                 "basis": "Capture times come from CSV, often 2017. No timezone is assumed for naive CSV timestamps. Aware timestamps are normalized to UTC for ordering. Missing legacy ingestion timestamps stay unknown."},
                "classes": dict(labels), "risks": dict(risks), "protocols": dict(protocols),
                "peers": peers.most_common(20), "remote_ports": ports.most_common(20),
                "capture_hours": dict(sorted(buckets.items())), "flows": sampled,
                "incidents": incident_rows[:200], "application_events": audit_rows, "cases": cases,
                "findings": findings,
                "next_steps": ["Confirm the capture source, time window and asset owner.",
                               "Open related incidents and compare the three classifiers and TreeSHAP evidence.",
                               "Corroborate the flow evidence with authorised firewall, DNS or endpoint logs.",
                               "Record a disposition and evidence-based note. This application does not block IPs."]}

    @m.app.get("/api/security/ip")
    def investigate(ip: str = Query(..., max_length=64), scan_id: str = Query("", max_length=64), u=Depends(m.user)):
        return ip_evidence(ip, scan_id, u)

    @m.app.get("/api/security/ip/export")
    def ip_export(ip: str = Query(..., max_length=64), scan_id: str = Query("", max_length=64), u=Depends(m.user)):
        data = ip_evidence(ip, scan_id, u)
        body = json.dumps(data, ensure_ascii=True, indent=2).encode()
        record(u["username"], "ip_evidence_exported", "Local evidence JSON generated",
               category="Export", resource=data["address"]["ip"])
        return Response(body, media_type="application/json", headers={
            "Content-Disposition": 'attachment; filename="tracevigil-ip-evidence.json"',
            "X-Content-SHA256": hashlib.sha256(body).hexdigest()})

    @m.app.put("/api/security/ip/case")
    def update_case(body: IPNote, u=Depends(m.user)):
        if u["role"] == "Viewer":
            raise HTTPException(403, "Viewer cannot save investigation notes")
        normalized = address(body.ip)
        if not normalized or body.status not in STATUSES:
            raise HTTPException(422, "Valid IP address and investigation status required")
        with m.connection() as c:
            c.execute("BEGIN IMMEDIATE")
            current = c.execute("SELECT version FROM ip_cases WHERE owner=? AND ip=?", (u["username"], normalized)).fetchone()
            version = current["version"] if current else 0
            if version != body.version:
                raise HTTPException(409, "This IP note changed. Refresh the investigation before saving.")
            stamp = m.now()
            c.execute("""INSERT INTO ip_cases VALUES(?,?,?,?,?,?) ON CONFLICT(owner,ip)
                DO UPDATE SET status=excluded.status,note=excluded.note,version=excluded.version,updated=excluded.updated""",
                (u["username"], normalized, body.status, body.note, version+1, stamp))
            insert(c, u["username"], "ip_case_updated", "Disposition " + body.status,
                   category="Investigation", resource=normalized)
        return {"owner": u["username"], "ip": normalized, "status": body.status,
                "note": body.note, "version": version+1, "updated": stamp}
