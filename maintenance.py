"""Compact free SQLite pages after deliberate scan cleanup. Stop the server first."""

import argparse, sqlite3, os
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument("--vacuum", action="store_true", required=True)
a = p.parse_args()
root = Path(__file__).resolve().parent
db = Path(os.getenv("NETSHIELD_DATA", str(root / "data"))) / "netshield.db"
if not db.exists():
    raise SystemExit("No database to compact")
with sqlite3.connect(db, timeout=5) as connection:
    if connection.execute(
        "SELECT COUNT(*) FROM scans WHERE status='Running'"
    ).fetchone()[0]:
        raise SystemExit(
            "A scan is marked Running. Stop/restart the app and stop active scans before maintenance."
        )
    connection.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    connection.execute("VACUUM")
print("Database compacted. No scan records or source CSVs were deleted.")
