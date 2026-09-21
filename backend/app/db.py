import os
import sqlite3
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "netshield.db")

def hash_password(password: str) -> str:
    """Hashes a password using SHA-256 with a salt."""
    salt = "netshield_salt_"
    return hashlib.sha256((salt + password).encode('utf-8')).hexdigest()

def get_db_connection():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes tables for users and attack history, pre-seeding default accounts."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        hashed_password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # Attack History Table for PCAP and CSV uploads
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attack_history (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        source_type TEXT NOT NULL,
        filename TEXT NOT NULL,
        uploaded_by TEXT,
        src_ip TEXT NOT NULL,
        dst_ip TEXT NOT NULL,
        protocol TEXT NOT NULL,
        threat_type TEXT NOT NULL,
        risk_score REAL NOT NULL,
        threat_level TEXT NOT NULL,
        driver_summary TEXT,
        actioned INTEGER DEFAULT 0
    )
    """)

    # Pre-seed default users if table is empty
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    if count == 0:
        default_users = [
            ("admin@netshield.ai", hash_password("admin123"), "Dr. Sarah Vance", "Admin", datetime.utcnow().isoformat()),
            ("analyst@netshield.ai", hash_password("analyst123"), "Marcus Holloway", "Security Analyst", datetime.utcnow().isoformat()),
            ("operator@netshield.ai", hash_password("operator123"), "Alex Chen", "SOC Operator", datetime.utcnow().isoformat())
        ]
        cursor.executemany(
            "INSERT INTO users (email, hashed_password, full_name, role, created_at) VALUES (?, ?, ?, ?, ?)",
            default_users
        )
    
    conn.commit()
    conn.close()

# ----------------- USER HELPERS -----------------

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT email, hashed_password, full_name, role, created_at FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def create_user(email: str, hashed_password: str, full_name: str, role: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (email, hashed_password, full_name, role, created_at) VALUES (?, ?, ?, ?, ?)",
            (email.strip().lower(), hashed_password, full_name.strip(), role.strip(), datetime.utcnow().isoformat())
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def get_all_users() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT email, full_name, role, created_at FROM users ORDER BY created_at ASC")
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for idx, row in enumerate(rows, start=1):
        role = row["role"]
        privileges = "Traffic, AI Inference & IP Blocking"
        if role == "Admin":
            privileges = "Full System & RBAC Control (All Tabs & Features)"
        elif role == "SOC Operator":
            privileges = "Read-Only Traffic & Threat Monitoring"

        result.append({
            "id": str(idx),
            "email": row["email"],
            "full_name": row["full_name"],
            "role": role,
            "privileges": privileges,
            "status": "ACTIVE",
            "created_at": row["created_at"]
        })
    return result

def delete_user(email: str) -> bool:
    # Protect original master admin account from accidental deletion
    if email.lower() == "admin@netshield.ai":
        return False
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

# ----------------- ATTACK HISTORY HELPERS -----------------

def record_attacks_batch(attacks: List[Dict[str, Any]]) -> int:
    """Inserts a batch of detected attack records into attack_history."""
    if not attacks:
        return 0
    conn = get_db_connection()
    cursor = conn.cursor()
    inserted = 0
    for att in attacks:
        try:
            cursor.execute("""
            INSERT OR REPLACE INTO attack_history (
                id, timestamp, source_type, filename, uploaded_by,
                src_ip, dst_ip, protocol, threat_type, risk_score,
                threat_level, driver_summary, actioned
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                att["id"],
                att.get("timestamp", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")),
                att.get("source_type", "PCAP"),
                att.get("filename", "unknown"),
                att.get("uploaded_by", "SOC Analyst"),
                att.get("src_ip", "0.0.0.0"),
                att.get("dst_ip", "0.0.0.0"),
                att.get("protocol", "TCP"),
                att.get("threat_type", "Anomaly Detected"),
                float(att.get("risk_score", 50.0)),
                att.get("threat_level", "HIGH"),
                att.get("driver_summary", "Velocity surge / heuristic anomaly"),
                int(att.get("actioned", 0))
            ))
            inserted += 1
        except Exception:
            pass
    conn.commit()
    conn.close()
    return inserted

def get_attack_history(source_type: Optional[str] = None, limit: int = 500, search: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM attack_history"
    params = []
    conditions = []

    if source_type and source_type.upper() in ["PCAP", "CSV"]:
        conditions.append("source_type = ?")
        params.append(source_type.upper())

    if search:
        search_like = f"%{search.strip()}%"
        conditions.append("(src_ip LIKE ? OR dst_ip LIKE ? OR threat_type LIKE ? OR filename LIKE ?)")
        params.extend([search_like, search_like, search_like, search_like])

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [dict(r) for r in rows]

def mark_attack_actioned(attack_id: str, actioned: bool = True) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE attack_history SET actioned = ? WHERE id = ?", (1 if actioned else 0, attack_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def clear_attack_history(source_type: Optional[str] = None) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    if source_type and source_type.upper() in ["PCAP", "CSV"]:
        cursor.execute("DELETE FROM attack_history WHERE source_type = ?", (source_type.upper(),))
    else:
        cursor.execute("DELETE FROM attack_history")
    count = cursor.rowcount
    conn.commit()
    conn.close()
    return count

# Initialize tables upon module import
init_db()
