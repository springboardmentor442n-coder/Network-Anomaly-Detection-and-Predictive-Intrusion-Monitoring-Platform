import sys
import os
sys.path.insert(0, os.path.abspath("."))
import urllib.request
import json
import pandas as pd
from app.database.session import SessionLocal
from app.database.models import TrafficRecord, Alert, User
from app.core.security import create_access_token

def test_endpoints_and_db():
    db = SessionLocal()
    user = db.query(User).filter(User.is_active == True).first()
    token = create_access_token({"sub": user.id if user else "1"})
    headers = {"Authorization": f"Bearer {token}"}
    
    print("=== 1. CHECKING DASHBOARD STATS ===")
    req = urllib.request.Request("http://127.0.0.1:8000/api/dashboard/stats", headers=headers)
    resp = urllib.request.urlopen(req)
    stats = json.loads(resp.read().decode())
    diag = stats.get("metadata_diagnostics")
    print("Metadata diagnostics:", json.dumps(diag, indent=2))
    assert diag is not None, "Missing metadata_diagnostics in stats"
    assert diag.get("status") == "ACTIVE", f"Expected ACTIVE status, got {diag.get('status')}"

    print("\n=== 2. CHECKING LIVE THREATS ENDPOINT ===")
    req2 = urllib.request.Request("http://127.0.0.1:8000/api/dashboard/live-threats?limit=10", headers=headers)
    resp2 = urllib.request.urlopen(req2)
    threats = json.loads(resp2.read().decode())
    assert len(threats) > 0, "No threats returned"
    na_count = 0
    for t in threats:
        print(f"Record: ID={t['id']} | Src={t['source_ip']} | Dst={t['destination_ip']} | Proto={t['protocol']} | Class={t.get('predicted_attack')}")
        if t['source_ip'] == "N/A" or t['destination_ip'] == "N/A" or t['protocol'] == "N/A":
            na_count += 1
    print(f"Total threats inspected: {len(threats)}, Threats with N/A: {na_count}")
    assert na_count == 0, f"Expected 0 N/A records in latest threats, found {na_count}"

    print("\n=== 3. CHECKING TOP SOURCE IPS ENDPOINT ===")
    req3 = urllib.request.Request("http://127.0.0.1:8000/api/dashboard/top-source-ips", headers=headers)
    resp3 = urllib.request.urlopen(req3)
    top_ips = json.loads(resp3.read().decode())
    print("Top Source IPs:", top_ips)
    for ip_entry in top_ips:
        assert ip_entry["source_ip"] not in ["N/A", "nan", "None", ""], f"Invalid IP in top-source-ips: {ip_entry}"

    print("\n=== 4. CHECKING DATABASE RECORDS VS ORIGINAL CSV ===")
    db = SessionLocal()
    recent_records = db.query(TrafficRecord).order_by(TrafficRecord.created_at.desc()).limit(10).all()
    print("Most recent 5 DB records:")
    for r in recent_records[:5]:
        print(f"DB Record: ID={r.id} | Src={r.source_ip} | Dst={r.destination_ip} | Proto={r.protocol} | Class={r.predicted_class}")
        assert r.source_ip is not None and r.source_ip != "N/A", "DB record has invalid source_ip"
        assert r.destination_ip is not None and r.destination_ip != "N/A", "DB record has invalid destination_ip"
        assert r.protocol is not None and r.protocol != "N/A", "DB record has invalid protocol"
    db.close()

    print("\n=== 5. CHECKING ORIGINAL CSV ===")
    df = pd.read_csv("d:/InfosysSpringBoard/project/netshield-ai/data/CICIDS2017_sample.csv", nrows=10)
    print("CSV columns detected:")
    from app.streaming.scanner import detect_metadata_columns
    col_map, diagnostics = detect_metadata_columns(df)
    print("Detected columns mapping:", col_map)
    print("Detected diagnostics:", diagnostics)
    assert col_map["source_ip"] == " Source IP"
    assert col_map["dest_ip"] == " Destination IP"
    assert col_map["protocol"] == " Protocol"

    print("\nVerification Passed Successfully!")

if __name__ == "__main__":
    test_endpoints_and_db()
