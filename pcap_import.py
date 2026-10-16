"""Import a Wireshark / tcpdump capture (.pcap) into NetShield.   Usage: python pcap_import.py capture.pcap
Needs scapy (pip install -r requirements-capture.txt). It uses the same flow builder as packet_capture.py."""
import argparse, os, threading
from packet_capture import handle, send

def main():
    try:
        from dotenv import load_dotenv; load_dotenv()
    except ImportError:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument("pcap")
    ap.add_argument("--url", default=os.getenv("NETSHIELD_URL", "http://localhost:8000"))
    ap.add_argument("--key", default=os.getenv("NETSHIELD_INGEST_KEY", "dev-ingest-key"))
    a = ap.parse_args()
    try:
        from scapy.all import PcapReader
    except ImportError:
        raise SystemExit("Install scapy first: pip install -r requirements-capture.txt")
    flows, lock, n = {}, threading.Lock(), 0
    with PcapReader(a.pcap) as reader:
        for pkt in reader:
            handle(pkt, flows, lock); n += 1
    out = [f.record(dport) for f, dport in flows.values()]
    print(f"read {n} packets -> {len(out)} flows")
    for i in range(0, len(out), 500):
        send(a.url, a.key, out[i:i + 500])

if __name__ == "__main__":
    main()
