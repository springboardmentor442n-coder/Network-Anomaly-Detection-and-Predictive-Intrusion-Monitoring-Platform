"""Time helpers. The database stores UTC; every page converts to the viewer's own time zone in the browser.
Server-side text (emails, webhooks) uses NETSHIELD_TZ (for example Asia/Kolkata) or the computer's own time zone."""
import os
from datetime import datetime, timedelta, timezone

def server_tz():
    name = os.getenv("NETSHIELD_TZ")
    if name:
        try:
            from zoneinfo import ZoneInfo
            return ZoneInfo(name)
        except Exception:
            pass
    return datetime.now().astimezone().tzinfo           # the computer's own time zone

def offset_label(minutes):
    m = abs(int(minutes))
    return f"UTC{'+' if minutes >= 0 else '-'}{m // 60:02d}:{m % 60:02d}"

def _parse(ts):
    return datetime.strptime(str(ts)[:19].replace("T", " "), "%Y-%m-%d %H:%M:%S")

def to_local(ts, tz=None):
    """'2026-10-06 09:00:00' (UTC) -> '2026-10-06 14:30:00 UTC+05:30' in the server's time zone."""
    try:
        d = _parse(ts).replace(tzinfo=timezone.utc).astimezone(tz or server_tz())
        return d.strftime("%Y-%m-%d %H:%M:%S ") + offset_label(d.utcoffset().total_seconds() // 60)
    except Exception:
        return str(ts)

def shift(ts, minutes):
    """UTC time string moved by a browser offset (minutes east of UTC), used by the printable report."""
    try:
        return (_parse(ts) + timedelta(minutes=minutes)).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(ts)
