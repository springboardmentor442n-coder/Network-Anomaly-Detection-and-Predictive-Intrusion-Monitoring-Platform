"""In-memory performance counters (latency, throughput, response time) shown on the Performance page."""
import threading, time
from collections import deque

_lock, _series, START = threading.Lock(), {}, time.time()

def record(name, value, n=1):
    with _lock:
        _series.setdefault(name, deque(maxlen=5000)).append((time.time(), float(value), n))

def _stats(pts):
    vals = sorted(v for _, v, _ in pts)
    if not vals:
        return {"count": 0, "avg": None, "p95": None, "max": None}
    return {"count": len(vals), "avg": round(sum(vals) / len(vals), 1),
            "p95": round(vals[min(len(vals) - 1, int(len(vals) * .95))], 1), "max": round(vals[-1], 1)}

def snapshot(window=600):
    cut, out = time.time() - window, {}
    with _lock:
        for k, d in _series.items():
            out[k] = _stats([p for p in d if p[0] >= cut])
        batch = [p for p in _series.get("batch_ms", ()) if p[0] >= cut]
    ms, rows = sum(v for _, v, _ in batch), sum(n for _, _, n in batch)
    out["flows_per_sec"] = round(rows / (ms / 1000), 1) if ms else None   # speed while processing
    out["uptime_s"] = int(time.time() - START)
    return out
