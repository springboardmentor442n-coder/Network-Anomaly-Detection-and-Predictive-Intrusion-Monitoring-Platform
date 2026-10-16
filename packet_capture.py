"""Capture live packets with Scapy, group them into flows and score them with NetShield.
Only monitor networks you own or are allowed to monitor.

Used in two ways:
  1. From the dashboard: Live page -> Source "Real network" -> Start live  (the server captures on the chosen adapter)
  2. From a terminal:    python packet_capture.py --iface "Wi-Fi" --window 3    (sends flows to a running NetShield server)

Setup: pip install scapy.  Windows: install Npcap (https://npcap.com) and run the terminal / VS Code as Administrator.
       Linux / macOS: run with sudo (or give python the net_raw capability).
On Wi-Fi you see the traffic of THIS device plus broadcast traffic. Other devices' traffic needs a mirror port or monitor mode.
It fills the flow fields it can measure; the rest are left empty and the server uses the training medians, so predictions
from captured packets are APPROXIMATE (the models were trained on UNSW-NB15)."""
import argparse, json, os, threading, time, urllib.request
from collections import deque

SERVICES = {80: "http", 443: "ssl", 53: "dns", 21: "ftp", 22: "ssh", 25: "smtp", 110: "pop3", 6667: "irc"}

class Flow:
    def __init__(self, ts, src, dst, proto, ttl, win, size, flags, seq=None):
        self.first = self.last = ts
        self.src, self.dst, self.proto, self.sttl, self.dttl, self.swin, self.dwin = src, dst, proto, ttl, None, win, None
        self.spk, self.dpk, self.flags = [size], [], set(flags)
        self.times = {"s": [ts], "d": []}
        self.sseq, self.dseq = seq, None
        self.t_syn = ts if "S" in flags and "A" not in flags else None      # handshake timing
        self.t_synack = self.t_ack = None

    def add(self, ts, from_src, ttl, win, size, flags, seq=None):
        self.last = ts
        (self.spk if from_src else self.dpk).append(size)
        self.times["s" if from_src else "d"].append(ts)
        if not from_src and self.dttl is None:
            self.dttl, self.dwin, self.dseq = ttl, win, seq
        if not from_src and "S" in flags and "A" in flags and self.t_synack is None:
            self.t_synack = ts
        if from_src and "A" in flags and "S" not in flags and self.t_synack is not None and self.t_ack is None:
            self.t_ack = ts
        self.flags |= set(flags)

    def record(self, dport):
        dur = max(self.last - self.first, 1e-6)
        sp, dp, sb, db = len(self.spk), len(self.dpk), sum(self.spk), sum(self.dpk)
        gap = lambda t: sum(b - a for a, b in zip(t, t[1:])) / (len(t) - 1) * 1000 if len(t) > 1 else 0
        jit = lambda t: sum(abs((c - b) - (b - a)) for a, b, c in zip(t, t[1:], t[2:])) / (len(t) - 2) * 1000 if len(t) > 2 else 0
        sa = self.t_synack - self.t_syn if self.t_syn is not None and self.t_synack is not None else 0
        ad = self.t_ack - self.t_synack if self.t_synack is not None and self.t_ack is not None else 0
        state = "RST" if "R" in self.flags else "FIN" if "F" in self.flags else "CON" if dp else "INT"
        return {"srcip": self.src[0], "dstip": self.dst[0], "dur": dur, "proto": self.proto, "service": SERVICES.get(dport, "-"), "state": state,
                "spkts": sp, "dpkts": dp, "sbytes": sb, "dbytes": db, "rate": (sp + dp - 1) / dur, "sttl": self.sttl, "dttl": self.dttl or 0,
                "sload": sb * 8 / dur, "dload": db * 8 / dur, "sinpkt": gap(self.times["s"]), "dinpkt": gap(self.times["d"]),
                "sjit": jit(self.times["s"]), "djit": jit(self.times["d"]), "swin": self.swin or 0, "dwin": self.dwin or 0,
                "stcpb": self.sseq or 0, "dtcpb": self.dseq or 0, "synack": sa, "ackdat": ad, "tcprtt": sa + ad,
                "smean": sb // max(sp, 1), "dmean": db // max(dp, 1), "is_sm_ips_ports": int(self.src == self.dst)}

def add_packet(flows, lock, ts, proto, a, b, ttl, win, size, flags, seq=None):
    """Add one packet (a = (src ip, src port), b = (dst ip, dst port)) to its flow."""
    key = (proto,) + tuple(sorted([a, b]))
    with lock:
        if key not in flows:
            flows[key] = (Flow(ts, a, b, proto, ttl, win, size, flags, seq), b[1])
        else:
            f = flows[key][0]
            f.add(ts, a == f.src, ttl, win, size, flags, seq)

def handle(pkt, flows, lock):
    from scapy.layers.inet import IP, TCP, UDP
    if IP not in pkt:
        return
    ip = pkt[IP]
    proto = {6: "tcp", 17: "udp", 1: "icmp"}.get(ip.proto, str(ip.proto))
    sport = dport = win = 0
    flags, seq = "", None
    if TCP in pkt:
        t = pkt[TCP]
        sport, dport, flags, win, seq = t.sport, t.dport, str(t.flags), t.window, t.seq
    elif UDP in pkt:
        sport, dport = pkt[UDP].sport, pkt[UDP].dport
    add_packet(flows, lock, float(pkt.time), proto, (ip.src, sport), (ip.dst, dport), ip.ttl, win, len(pkt), flags, seq)

class Capturer:
    """Sniffs one network adapter and hands back finished flows as records the model can score."""
    def __init__(self, iface=None, idle=3.0, max_age=30.0):
        self.iface, self.idle, self.max_age = iface, idle, max_age
        self.flows, self.lock, self.recent, self.sniffer, self.packets = {}, threading.Lock(), deque(maxlen=100), None, 0

    def start(self):
        from scapy.all import AsyncSniffer           # ImportError when scapy is not installed
        self.sniffer = AsyncSniffer(iface=self.iface or None, prn=self._on_packet, store=False)
        self.sniffer.start()
        time.sleep(1.0)                               # give it a moment to fail (no Npcap, no permission, wrong adapter)
        if not getattr(self.sniffer, "running", True):
            raise RuntimeError(str(getattr(self.sniffer, "exception", None) or "the capture did not start"))

    def _on_packet(self, pkt):
        self.packets += 1
        handle(pkt, self.flows, self.lock)

    def pop_ready(self, now=None):
        """Flows that have been quiet for `idle` seconds, or have been open longer than `max_age`."""
        now = time.time() if now is None else now
        with self.lock:
            due = [k for k, (f, _) in self.flows.items() if f.last < now - self.idle or f.first < now - self.max_age]
            done = [self.flows.pop(k) for k in due]
        return [self._record(f, dport) for f, dport in done]

    def _record(self, f, dport):
        r, rec = f.record(dport), list(self.recent)
        sip, dip, sport, svc = f.src[0], f.dst[0], f.src[1], r["service"]
        n = lambda ok: 1 + sum(1 for x in rec if ok(x))        # same idea as the UNSW-NB15 ct_* counters (last 100 connections)
        r.update(ct_srv_src=n(lambda x: x["service"] == svc and x["srcip"] == sip), ct_srv_dst=n(lambda x: x["service"] == svc and x["dstip"] == dip),
                 ct_dst_ltm=n(lambda x: x["dstip"] == dip), ct_src_ltm=n(lambda x: x["srcip"] == sip),
                 ct_src_dport_ltm=n(lambda x: x["srcip"] == sip and x["dport"] == dport), ct_dst_sport_ltm=n(lambda x: x["dstip"] == dip and x["sport"] == sport),
                 ct_dst_src_ltm=n(lambda x: x["srcip"] == sip and x["dstip"] == dip))
        self.recent.append({"srcip": sip, "dstip": dip, "sport": sport, "dport": dport, "service": svc})
        return r

    def stop(self):
        try:
            if self.sniffer is not None:
                self.sniffer.stop()
        except Exception:
            pass

def list_interfaces():
    """Network adapters Scapy can capture on that have an IPv4 address (your Wi-Fi adapter normally does)."""
    from scapy.all import conf
    current = getattr(conf.iface, "name", str(conf.iface))
    out = []
    for i in conf.ifaces.values():
        ip = getattr(i, "ip", None)
        if ip and not str(ip).startswith(("0.", "127.", "169.254.")):
            out.append({"name": i.name, "description": getattr(i, "description", "") or "", "ip": str(ip), "default": i.name == current})
    return sorted(out, key=lambda x: not x["default"])

def capture_help(msg):
    return (f"Could not start packet capture ({msg}). Windows: install Npcap from npcap.com and run VS Code or the terminal as "
            "Administrator. Linux / macOS: run with sudo. Also check that scapy is installed (pip install scapy) and that the "
            "right Wi-Fi adapter is selected. To use simulated traffic instead, choose Source: Demo replay.")

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
    ap.add_argument("--iface", help="network adapter name, for example Wi-Fi")
    ap.add_argument("--window", type=float, default=3, help="seconds of silence before a flow is sent")
    ap.add_argument("--url", default=os.getenv("NETSHIELD_URL", "http://localhost:8000"))
    ap.add_argument("--key", default=os.getenv("NETSHIELD_INGEST_KEY", "dev-ingest-key"))
    a = ap.parse_args()
    cap = Capturer(a.iface, idle=a.window)
    try:
        cap.start()
    except Exception as e:
        raise SystemExit(capture_help(str(e)))
    print("Capturing packets... press Ctrl+C to stop")
    try:
        while True:
            time.sleep(1)
            recs = cap.pop_ready()
            for i in range(0, len(recs), 500):
                send(a.url, a.key, recs[i:i + 500])
    except KeyboardInterrupt:
        cap.stop()
        recs = cap.pop_ready(now=float("inf"))
        for i in range(0, len(recs), 500):
            send(a.url, a.key, recs[i:i + 500])

if __name__ == "__main__":
    main()
