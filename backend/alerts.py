import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "netshield_alerts.db"
)


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            attack_type TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            risk_score REAL NOT NULL,
            confidence REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'Open',
            timestamp TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


def create_alert(prediction, risk_level, risk_score, confidence):

    conn = get_connection()

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor = conn.execute("""
        INSERT INTO alerts
        (attack_type, risk_level, risk_score, confidence, status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        prediction,
        risk_level,
        risk_score,
        confidence,
        "Open",
        timestamp
    ))

    alert_id = cursor.lastrowid

    conn.commit()

    row = conn.execute("""
        SELECT *
        FROM alerts
        WHERE id = ?
    """, (alert_id,)).fetchone()

    conn.close()

    return dict(row)


def get_alerts():

    conn = get_connection()

    rows = conn.execute("""
        SELECT *
        FROM alerts
        ORDER BY id ASC
    """).fetchall()

    conn.close()

    return [dict(row) for row in rows]


def update_alert_status(alert_id, new_status):

    conn = get_connection()

    cursor = conn.execute("""
        UPDATE alerts
        SET status = ?
        WHERE id = ?
    """, (new_status, alert_id))

    conn.commit()

    if cursor.rowcount == 0:
        conn.close()
        return None

    row = conn.execute("""
        SELECT *
        FROM alerts
        WHERE id = ?
    """, (alert_id,)).fetchone()

    conn.close()

    return dict(row)


init_db()