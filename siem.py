"""SIEM integration: send alerts as CEF over syslog (UDP) and export them as CEF or JSON lines.
Set NETSHIELD_SYSLOG_HOST (and NETSHIELD_SYSLOG_PORT, default 514) to forward every High / Critical alert."""
import calendar, json, os, socket, time

SEV = {"Low": 3, "Medium": 5, "High": 8, "Critical": 10}

def _esc(v):
    return str(v).replace("\\", "\\\\").replace("=", "\\=").replace("|", "\\|").replace("\n", " ")

def _epoch_ms(ts):
    try:
        return int(calendar.timegm(time.strptime(str(ts)[:19].replace("T", " "), "%Y-%m-%d %H:%M:%S")) * 1000)
    except ValueError:
        return int(time.time() * 1000)

def to_cef(a):
    """a: dict with ts, prediction, risk_score, risk_label, source and optionally src_ip."""
    ext = f"rt={_epoch_ms(a.get('ts'))} cn1={a['risk_score']} cn1Label=riskScore cs1={_esc(a.get('source') or '')} cs1Label=source"
    if a.get("src_ip"):
        ext += f" src={_esc(a['src_ip'])}"
    name = _esc(a["prediction"])
    return f"CEF:0|NetShieldAI|IDS|1.0|{name}|{name} detected|{SEV.get(a['risk_label'], 5)}|{ext}"

def send_syslog(alerts):
    """Send each alert (dict) to the syslog host. Returns how many were sent."""
    host = os.getenv("NETSHIELD_SYSLOG_HOST")
    if not host or not alerts:
        return 0
    port, sock, n = int(os.getenv("NETSHIELD_SYSLOG_PORT", "514")), socket.socket(socket.AF_INET, socket.SOCK_DGRAM), 0
    try:
        for a in alerts:
            pri = 16 * 8 + (2 if a["risk_label"] == "Critical" else 4)      # local0 + critical / warning
            msg = f"<{pri}>{time.strftime('%b %d %H:%M:%S')} netshield NetShieldAI: {to_cef(a)}"
            sock.sendto(msg.encode("utf-8", "replace")[:1024], (host, port)); n += 1
    finally:
        sock.close()
    return n

def export(rows, fmt="cef"):
    rows = [dict(r, ts=str(r.get("ts"))) for r in rows]
    if fmt == "json":
        return "\n".join(json.dumps(r, default=str) for r in rows)
    return "\n".join(to_cef(r) for r in rows)
