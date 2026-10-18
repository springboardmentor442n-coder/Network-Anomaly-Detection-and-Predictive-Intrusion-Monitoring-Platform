"""Concurrency test: N dashboards connected to the live feed while flows are sent to /api/ingest.
Usage: python load_test.py --user admin --password yourpassword --clients 20 --seconds 20"""
import argparse, json, os, threading, time, urllib.parse, urllib.request

def post(url, body, headers):
    req = urllib.request.Request(url, json.dumps(body).encode(), dict({"Content-Type": "application/json"}, **headers))
    return json.load(urllib.request.urlopen(req, timeout=30))

def client(url, token, secs, res):
    t0, n = time.time(), 0
    try:
        with urllib.request.urlopen(f"{url}/api/live?token={urllib.parse.quote(token)}", timeout=secs + 15) as r:
            while time.time() - t0 < secs:
                line = r.readline()
                if not line: break
                if line.startswith(b"event: batch"): n += 1
        res.append(("ok", n))
    except Exception as e:
        res.append(("fail", str(e)[:60]))

def sender(url, key, secs, lat):
    flow = {"proto": "tcp", "service": "http", "state": "FIN", "dur": 0.5, "sbytes": 300, "dbytes": 900, "spkts": 4, "dpkts": 5}
    end = time.time() + secs
    while time.time() < end:
        t = time.perf_counter()
        try:
            post(url + "/api/ingest", {"flows": [flow] * 10}, {"X-API-Key": key}); lat.append((time.perf_counter() - t) * 1000)
        except Exception:
            lat.append(None)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--user", required=True); ap.add_argument("--password", required=True)
    ap.add_argument("--clients", type=int, default=20); ap.add_argument("--senders", type=int, default=2); ap.add_argument("--seconds", type=int, default=20)
    ap.add_argument("--url", default=os.getenv("NETSHIELD_URL", "http://localhost:8000"))
    ap.add_argument("--key", default=os.getenv("NETSHIELD_INGEST_KEY", "dev-ingest-key"))
    a = ap.parse_args()
    token = post(a.url + "/api/login", {"username": a.user, "password": a.password}, {})["token"]
    res, lat, ts = [], [], []
    ts += [threading.Thread(target=client, args=(a.url, token, a.seconds, res)) for _ in range(a.clients)]
    ts += [threading.Thread(target=sender, args=(a.url, a.key, a.seconds, lat)) for _ in range(a.senders)]
    [t.start() for t in ts]; [t.join() for t in ts]
    ok = [n for s, n in res if s == "ok"]; good = sorted(x for x in lat if x is not None)
    print(f"dashboards connected: {len(ok)}/{a.clients}   batches received per dashboard (avg): {sum(ok) / max(len(ok), 1):.1f}")
    print(f"ingest requests: {len(lat)} ({len(good)} ok) in {a.seconds}s = {len(lat) / a.seconds:.1f}/s")
    if good: print(f"ingest latency ms: avg {sum(good) / len(good):.0f}, p95 {good[min(len(good) - 1, int(len(good) * .95))]:.0f}")

if __name__ == "__main__":
    main()
