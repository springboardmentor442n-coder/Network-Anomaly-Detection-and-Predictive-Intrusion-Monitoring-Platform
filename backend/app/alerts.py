"""Security alert management backed by SQLite.

Persistence notes
-----------------
Alerts must survive page refreshes and server restarts, and they need in-place
status updates, so they live in a small SQLite database
(``backend/storage/alerts.db``) rather than in browser storage.

Duplicate prevention uses a *stable fingerprint* computed from the detection
content (predicted class, category, severity and the record's input feature
values). Re-running the same traffic file therefore does not create a second
alert for the same record.
"""

from __future__ import annotations

import sqlite3
import threading
from typing import Iterable

from .config import ALERTS_DB_PATH
from .store import new_id, now_iso

VALID_STATUSES = ("open", "acknowledged", "resolved")
VALID_SEVERITIES = ("critical", "high", "medium", "low")

SEVERITY_RANK = "CASE severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END"
STATUS_RANK = "CASE status WHEN 'open' THEN 1 WHEN 'acknowledged' THEN 2 ELSE 3 END"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS alerts (
    id                 TEXT PRIMARY KEY,
    fingerprint        TEXT NOT NULL UNIQUE,
    detection_id       TEXT,
    detection_source   TEXT,
    model_algorithm    TEXT,
    source_record      TEXT,
    predicted_class    TEXT,
    attack_category    TEXT,
    severity           TEXT NOT NULL,
    confidence         REAL,
    reason             TEXT,
    recommended_action TEXT,
    status             TEXT NOT NULL DEFAULT 'open',
    created_at         TEXT NOT NULL,
    updated_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
"""

_lock = threading.RLock()
_initialised = False


def _connect() -> sqlite3.Connection:
    global _initialised
    connection = sqlite3.connect(ALERTS_DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    if not _initialised:
        with _lock:
            connection.executescript(_SCHEMA)
            connection.commit()
            _initialised = True
    return connection


def init_db() -> None:
    """Create the database and schema if they do not exist yet."""
    _connect().close()


def _row_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "fingerprint": row["fingerprint"],
        "detectionId": row["detection_id"],
        "detectionSource": row["detection_source"],
        "modelAlgorithm": row["model_algorithm"],
        "sourceRecord": row["source_record"],
        "predictedClass": row["predicted_class"],
        "attackCategory": row["attack_category"],
        "severity": row["severity"],
        "confidence": row["confidence"],
        "reason": row["reason"],
        "recommendedAction": row["recommended_action"],
        "status": row["status"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def create_alerts(detection: dict, threats: list[dict], total_threats: int | None = None) -> dict:
    """Insert alerts for threat rows, skipping rows whose fingerprint already exists."""
    if not threats:
        return {
            "created": 0,
            "duplicates": 0,
            "totalThreats": int(total_threats or 0),
            "message": "The detection run produced no threat records, so no alerts were raised.",
        }

    created = 0
    duplicates = 0
    timestamp = now_iso()
    with _lock, _connect() as connection:
        for row in threats:
            fingerprint = row.get("fingerprint") or ""
            if not fingerprint:
                continue
            cursor = connection.execute(
                """
                INSERT OR IGNORE INTO alerts (
                    id, fingerprint, detection_id, detection_source, model_algorithm,
                    source_record, predicted_class, attack_category, severity, confidence,
                    reason, recommended_action, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
                """,
                (
                    new_id("alt"),
                    fingerprint,
                    detection.get("id"),
                    detection.get("sourceFilename"),
                    detection.get("algorithmLabel"),
                    row.get("recordReference"),
                    row.get("predictedLabel"),
                    row.get("attackCategory"),
                    row.get("severity") or "medium",
                    row.get("confidence"),
                    row.get("detectionReason"),
                    row.get("recommendedAction"),
                    detection.get("createdAt") or timestamp,
                    timestamp,
                ),
            )
            if cursor.rowcount:
                created += 1
            else:
                duplicates += 1
        connection.commit()

    return {
        "created": created,
        "duplicates": duplicates,
        "totalThreats": int(total_threats if total_threats is not None else len(threats)),
    }


def _where(
    severity: str | None,
    status: str | None,
    search: str | None,
    detection_id: str | None,
) -> tuple[str, list]:
    clauses: list[str] = []
    params: list = []
    if severity and severity in VALID_SEVERITIES:
        clauses.append("severity = ?")
        params.append(severity)
    if status and status in VALID_STATUSES:
        clauses.append("status = ?")
        params.append(status)
    if detection_id:
        clauses.append("detection_id = ?")
        params.append(detection_id)
    if search:
        needle = f"%{search.strip().lower()}%"
        clauses.append(
            "(LOWER(id) LIKE ? OR LOWER(COALESCE(source_record,'')) LIKE ? "
            "OR LOWER(COALESCE(predicted_class,'')) LIKE ? "
            "OR LOWER(COALESCE(attack_category,'')) LIKE ? "
            "OR LOWER(COALESCE(reason,'')) LIKE ?)"
        )
        params.extend([needle] * 5)
    if not clauses:
        return "", params
    return " WHERE " + " AND ".join(clauses), params


def _order(sort: str | None, order: str | None) -> str:
    direction = "DESC" if (order or "desc").lower() == "desc" else "ASC"
    column = {
        "severity": SEVERITY_RANK,
        "status": STATUS_RANK,
        "confidence": "COALESCE(confidence, -1)",
        "createdat": "created_at",
        "created_at": "created_at",
        "predictedclass": "predicted_class",
        "category": "attack_category",
    }.get((sort or "createdat").lower(), "created_at")
    return f" ORDER BY {column} {direction}, created_at DESC"


def list_alerts(
    *,
    severity: str | None = None,
    status: str | None = None,
    search: str | None = None,
    detection_id: str | None = None,
    sort: str | None = "createdAt",
    order: str | None = "desc",
    page: int = 1,
    page_size: int = 25,
) -> dict:
    where, params = _where(severity, status, search, detection_id)
    page = max(1, int(page))
    page_size = max(1, min(int(page_size), 200))
    offset = (page - 1) * page_size

    with _lock, _connect() as connection:
        total = connection.execute(f"SELECT COUNT(*) AS c FROM alerts{where}", params).fetchone()["c"]
        rows = connection.execute(
            f"SELECT * FROM alerts{where}{_order(sort, order)} LIMIT ? OFFSET ?",
            [*params, page_size, offset],
        ).fetchall()

    return {
        "page": page,
        "pageSize": page_size,
        "total": int(total),
        "totalPages": max(1, (int(total) + page_size - 1) // page_size) if total else 1,
        "items": [_row_to_dict(row) for row in rows],
    }


def get_alert(alert_id: str) -> dict | None:
    with _lock, _connect() as connection:
        row = connection.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
    return _row_to_dict(row) if row else None


def update_status(alert_id: str, status: str) -> dict | None:
    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid status '{status}'. Expected one of {VALID_STATUSES}.")
    with _lock, _connect() as connection:
        cursor = connection.execute(
            "UPDATE alerts SET status = ?, updated_at = ? WHERE id = ?",
            (status, now_iso(), alert_id),
        )
        connection.commit()
        if not cursor.rowcount:
            return None
        row = connection.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
    return _row_to_dict(row) if row else None


def bulk_update_status(alert_ids: Iterable[str], status: str) -> int:
    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid status '{status}'. Expected one of {VALID_STATUSES}.")
    ids = list(alert_ids)
    if not ids:
        return 0
    placeholders = ",".join("?" for _ in ids)
    with _lock, _connect() as connection:
        cursor = connection.execute(
            f"UPDATE alerts SET status = ?, updated_at = ? WHERE id IN ({placeholders})",
            [status, now_iso(), *ids],
        )
        connection.commit()
        return int(cursor.rowcount)


def delete_alerts(alert_ids: Iterable[str] | None = None) -> int:
    with _lock, _connect() as connection:
        if alert_ids:
            ids = list(alert_ids)
            if not ids:
                return 0
            placeholders = ",".join("?" for _ in ids)
            cursor = connection.execute(f"DELETE FROM alerts WHERE id IN ({placeholders})", ids)
        else:
            cursor = connection.execute("DELETE FROM alerts")
        connection.commit()
        return int(cursor.rowcount)


def reset_database() -> None:
    """Used by the test-suite to guarantee isolation."""
    global _initialised
    with _lock, _connect() as connection:
        connection.execute("DELETE FROM alerts")
        connection.commit()
    _initialised = True


def stats() -> dict:
    with _lock, _connect() as connection:
        total = connection.execute("SELECT COUNT(*) AS c FROM alerts").fetchone()["c"]
        by_status = {
            row["status"]: row["c"]
            for row in connection.execute(
                "SELECT status, COUNT(*) AS c FROM alerts GROUP BY status"
            ).fetchall()
        }
        by_severity = {
            row["severity"]: row["c"]
            for row in connection.execute(
                "SELECT severity, COUNT(*) AS c FROM alerts GROUP BY severity"
            ).fetchall()
        }
    return {
        "total": int(total),
        "byStatus": {key: int(by_status.get(key, 0)) for key in VALID_STATUSES},
        "bySeverity": {key: int(by_severity.get(key, 0)) for key in VALID_SEVERITIES},
    }


def alerts_report_csv(rows: list[dict]) -> str:
    """Report D - Security Alerts (CSV)."""
    header = "alert_id,timestamp,category,severity,status,description,recommended_action"
    lines = [header]
    for row in rows:
        values = [
            row.get("id"),
            row.get("createdAt"),
            row.get("attackCategory") or row.get("predictedClass"),
            row.get("severity"),
            row.get("status"),
            row.get("reason"),
            row.get("recommendedAction"),
        ]
        cleaned = []
        for value in values:
            text = "" if value is None else str(value)
            if any(ch in text for ch in [",", '"', "\n"]):
                text = '"' + text.replace('"', '""') + '"'
            cleaned.append(text)
        lines.append(",".join(cleaned))
    return "\n".join(lines) + "\n"
