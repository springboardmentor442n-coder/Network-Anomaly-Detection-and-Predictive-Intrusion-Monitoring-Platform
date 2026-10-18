"""Sends captured flows to the dashboard server (/api/ingest) once per interval.   Run: python live_monitor.py"""
import json, os, sys, time, urllib.request
from dotenv import load_dotenv
from live_capture import capture_flows

load_dotenv()
URL = os.getenv("NETSHIELD_URL", "http://localhost:8000") + "/api/ingest"
KEY = os.getenv("NETSHIELD_INGEST_KEY", "dev-ingest-key")
INTERVAL = float(os.getenv("NETSHIELD_INTERVAL", "1"))
path = sys.argv[1] if len(sys.argv) > 1 else os.getenv("NETSHIELD_DATA", "dataset/UNSW_NB15_testing-set.parquet")

for flows in capture_flows(path):
    req = urllib.request.Request(URL, json.dumps({"flows": flows}).encode(),
                                 {"Content-Type": "application/json", "X-API-Key": KEY})
    try:
        urllib.request.urlopen(req).read()
    except Exception as e:
        print("send failed:", e)
    time.sleep(INTERVAL)
