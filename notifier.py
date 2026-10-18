"""Sends a webhook (Slack / Discord / Teams style) and/or an email when High or Critical alerts are raised.
Configure in .env: NETSHIELD_WEBHOOK_URL, or NETSHIELD_SMTP_HOST / _PORT / _USER / _PASSWORD / NETSHIELD_MAIL_TO.
NETSHIELD_NOTIFY_LEVEL (High or Critical) and NETSHIELD_NOTIFY_COOLDOWN (seconds) limit how often it sends."""
import json, os, smtplib, threading, time, urllib.parse, urllib.request
from email.message import EmailMessage
from db import sql
import siem, timeutil

RANK = {"High": 1, "Critical": 2}
_state = {"last": 0.0, "pending": []}

def alerts(rows):
    """rows: (ts, prediction, confidence, risk_score, risk_label, source, source_name, src_ip) tuples."""
    try:  # SIEM (syslog / CEF) gets every High and Critical alert
        keys = ("ts", "prediction", "confidence", "risk_score", "risk_label", "source", "source_name", "src_ip")
        siem.send_syslog([dict(zip(keys, r)) for r in rows])
    except Exception as e:
        print("siem send failed:", e)
    if not (os.getenv("NETSHIELD_WEBHOOK_URL") or os.getenv("NETSHIELD_SMTP_HOST")):
        return
    need = RANK.get(os.getenv("NETSHIELD_NOTIFY_LEVEL", "Critical"), 2)
    _state["pending"] += [r for r in rows if RANK.get(r[4], 0) >= need]
    if not _state["pending"] or time.time() - _state["last"] < float(os.getenv("NETSHIELD_NOTIFY_COOLDOWN", "60")):
        return
    batch, _state["pending"], _state["last"] = _state["pending"], [], time.time()
    threading.Thread(target=_send, args=(batch,), daemon=True).start()

def _log(channel, target, subject, status, error=None):
    try:
        sql("INSERT INTO notification_log(ts,channel,target,subject,status,error) VALUES(UTC_TIMESTAMP(),%s,%s,%s,%s,%s)",
            (channel, (target or "")[:100], subject[:150], status, (error or "")[:200] or None))
    except Exception as e:
        print("notification log failed:", e)

def _send(batch):
    top = max(batch, key=lambda r: r[3])
    subject = f"NetShield AI: {len(batch)} alert(s), highest {top[1]} (risk {top[3]})"
    lines = [f"{timeutil.to_local(r[0])}  {r[4]:<8} {r[1]:<15} risk {r[3]}  [{r[5]}]" for r in sorted(batch, key=lambda r: -r[3])[:10]]
    text = subject + "\n" + "\n".join(lines)
    hook = os.getenv("NETSHIELD_WEBHOOK_URL")
    if hook:
        where = urllib.parse.urlparse(hook).netloc   # never log the secret part of the URL
        try:
            req = urllib.request.Request(hook, json.dumps({"text": text, "content": text}).encode(), {"Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=10).read()
            _log("webhook", where, subject, "sent")
        except Exception as e:
            _log("webhook", where, subject, "failed", str(e))
    host, to = os.getenv("NETSHIELD_SMTP_HOST"), os.getenv("NETSHIELD_MAIL_TO")
    if host and to:
        try:
            msg = EmailMessage()
            msg["Subject"], msg["To"] = subject, to
            msg["From"] = os.getenv("NETSHIELD_MAIL_FROM") or os.getenv("NETSHIELD_SMTP_USER") or "netshield@localhost"
            msg.set_content(text)
            with smtplib.SMTP(host, int(os.getenv("NETSHIELD_SMTP_PORT", "587")), timeout=15) as s:
                s.starttls()
                if os.getenv("NETSHIELD_SMTP_USER"):
                    s.login(os.getenv("NETSHIELD_SMTP_USER"), os.getenv("NETSHIELD_SMTP_PASSWORD", ""))
                s.send_message(msg)
            _log("email", to, subject, "sent")
        except Exception as e:
            _log("email", to, subject, "failed", str(e))
