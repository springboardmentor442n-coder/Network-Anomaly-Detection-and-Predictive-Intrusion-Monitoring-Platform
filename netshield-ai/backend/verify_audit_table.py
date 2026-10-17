import sys
import os
sys.path.insert(0, os.path.abspath("."))
import urllib.request
import json
from app.database.session import SessionLocal
from app.database.models import User
from app.core.security import create_access_token

def verify_audit_logs():
    db = SessionLocal()
    user = db.query(User).filter(User.is_active == True).first()
    token = create_access_token({"sub": user.id if user else "1", "role": user.role if user else "ADMIN"})
    headers = {"Authorization": f"Bearer {token}"}
    db.close()

    print("=== 1. FETCHING AUDIT LOGS FROM RUNNING BACKEND ===")
    req = urllib.request.Request("http://127.0.0.1:8000/api/audit-logs/", headers=headers)
    resp = urllib.request.urlopen(req)
    assert resp.status == 200
    data = json.loads(resp.read().decode())

    total = data.get("total", 0)
    items = data.get("items", [])
    print(f"Total audit logs retrieved: {total}, items returned: {len(items)}")
    assert len(items) > 0, "No audit logs returned"

    print("\n=== 2. INSPECTING FIRST 5 AUDIT LOG ITEMS ===")
    for item in items[:5]:
        print(f"Timestamp : {item.get('timestamp')}")
        print(f"User/Actor: {item.get('user')}")
        print(f"Action    : {item.get('action')}")
        print(f"Resource  : {item.get('resource')}")
        print(f"IP Address: {item.get('ip')}")
        print(f"Status    : {item.get('status')}")
        print("-" * 50)

        # Assert mandatory keys
        assert "timestamp" in item, "Missing timestamp key"
        assert "user" in item, "Missing user key"
        assert "action" in item, "Missing action key"
        assert "resource" in item, "Missing resource key"
        assert "ip" in item, "Missing ip key"
        assert "status" in item, "Missing status key"

    print("\n=== 3. CHECKING FILTERING BY ACTION ===")
    req_filter = urllib.request.Request("http://127.0.0.1:8000/api/audit-logs/?action=LOGIN", headers=headers)
    resp_filter = urllib.request.urlopen(req_filter)
    filtered = json.loads(resp_filter.read().decode())
    print(f"Found {len(filtered['items'])} LOGIN events")
    for item in filtered['items'][:3]:
        assert item['action'] == 'LOGIN'
        assert item['user'] is not None

    print("\nAudit logs verification PASSED successfully!")

if __name__ == "__main__":
    verify_audit_logs()
