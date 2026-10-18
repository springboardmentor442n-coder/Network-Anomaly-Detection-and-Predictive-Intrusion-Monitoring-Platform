"""Send Zeek conn.log records (TSV or JSON) to NetShield.
Usage:  python zeek_ingest.py path/to/conn.log            (send what is in the file)
        python zeek_ingest.py path/to/conn.log --follow   (keep sending new lines, like tail -f)"""
import argparse, json, os, time, urllib.request

STATE = {"SF": "FIN", "S0": "INT", "REJ": "REQ", "RSTO": "RST", "RSTR": "RST", "RSTOS0": "RST", "RSTRH": "RST",
         "S1": "CON", "S2": "CON", "S3": "CON", "OTH": "CON", "SH": "INT", "SHR": "INT"}

def _num(v):
    try: return float(v)
    except (TypeError, ValueError): return 0.0       # Zeek writes "-" for an unset field

def record(z):
    """Map one Zeek conn record (a dict with Zeek field names) to NetShield flow fields."""
    dur = max(_num(z.get("duration")), 1e-6)
    sp, dp = int(_num(z.get("orig_pkts"))), int(_num(z.get("resp_pkts")))
    sb = int(_num(z.get("orig_ip_bytes") or z.get("orig_bytes"))); db = int(_num(z.get("resp_ip_bytes") or z.get("resp_bytes")))
    svc = z.get("service")
    return {"srcip": z.get("id.orig_h"), "dstip": z.get("id.resp_h"), "dur": dur, "proto": z.get("proto") or "-",
            "service": svc if svc not in (None, "", "-") else "-", "state": STATE.get(z.get("conn_state"), "-"),
            "spkts": sp, "dpkts": dp, "sbytes": sb, "dbytes": db, "rate": (sp + dp - 1) / dur if sp + dp else 0,
            "sload": sb * 8 / dur, "dload": db * 8 / dur, "smean": sb // max(sp, 1), "dmean": db // max(dp, 1)}

class Parser:
    def __init__(self):
        self.fields = None
    def line(self, line):
        line = line.rstrip("\n")
        if not line:
            return None
        if line.startswith("#fields"):
            self.fields = line.split("\t")[1:]; return None
        if line.startswith("#"):
            return None
        if line.startswith("{"):
            try: return record(json.loads(line))
            except ValueError: return None
        return record(dict(zip(self.fields, line.split("\t")))) if self.fields else None

def parse(lines):
    p = Parser()
    return [r for r in (p.line(x) for x in lines) if r]

def send(url, key, batch):
    req = urllib.request.Request(url + "/api/ingest", json.dumps({"flows": batch}).encode(),
                                 {"Content-Type": "application/json", "X-API-Key": key})
    try:
        print("sent", len(batch), "flows ->", urllib.request.urlopen(req, timeout=30).read().decode())
    except Exception as e:
        print("send failed:", e)

def main():
    try:
        from dotenv import load_dotenv; load_dotenv()
    except ImportError:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument("path"); ap.add_argument("--follow", action="store_true"); ap.add_argument("--batch", type=int, default=200)
    ap.add_argument("--url", default=os.getenv("NETSHIELD_URL", "http://localhost:8000"))
    ap.add_argument("--key", default=os.getenv("NETSHIELD_INGEST_KEY", "dev-ingest-key"))
    a = ap.parse_args()
    p, buf = Parser(), []
    with open(a.path, encoding="utf-8") as f:
        while True:
            line = f.readline()
            if line:
                r = p.line(line)
                if r: buf.append(r)
                if len(buf) >= a.batch:
                    send(a.url, a.key, buf); buf = []
            else:
                if buf:
                    send(a.url, a.key, buf); buf = []
                if not a.follow:
                    break
                time.sleep(1)

if __name__ == "__main__":
    main()
