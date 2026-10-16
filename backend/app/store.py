"""Filesystem-backed persistence for datasets, models, evaluations and detections.

Design notes
------------
* Metadata is stored as JSON next to the artefact it describes, so the registry
  is always reconstructable by scanning a directory (no drift between a DB row
  and a missing file).
* ``storage_path`` is kept in the metadata for the backend's own use but is
  stripped from every API response by :func:`public_*`.
* Alerts use SQLite (see ``alerts.py``) because they need in-place updates.
"""

from __future__ import annotations

import hashlib
import json
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import (
    DATASETS_DIR,
    DETECTIONS_DIR,
    EVALUATIONS_DIR,
    MODELS_DIR,
    PROJECT_DATA_DIR,
)

_lock = threading.RLock()
_ACTIVE_MODEL_FILE = MODELS_DIR / "active.json"


# ---------------------------------------------------------------------------
# generic helpers
# ---------------------------------------------------------------------------
def new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:10]}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def stable_hash(*parts: Any) -> str:
    digest = hashlib.sha1()
    for part in parts:
        digest.update(str(part).encode("utf-8", errors="replace"))
        digest.update(b"\x1f")
    return digest.hexdigest()


def safe_filename(name: str) -> str:
    """Strip any directory component and unsafe characters from a client filename."""
    base = Path(name).name
    cleaned = "".join(ch for ch in base if ch.isalnum() or ch in "._- ")
    cleaned = cleaned.strip().replace(" ", "_")
    return cleaned or "dataset.csv"


def _read_json(path: Path, default: Any = None) -> Any:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def _write_json(path: Path, data: Any) -> None:
    # We use a retry loop for PermissionError, which can happen on Windows
    # if a file watcher (like Next.js) or OneDrive is briefly locking the
    # directory or file while we're writing.
    last_exc = None
    for attempt in range(10):
        try:
            with path.open("w", encoding="utf-8") as handle:
                json.dump(data, handle, indent=2, default=str)
            return
        except PermissionError as exc:
            last_exc = exc
            time.sleep(0.1 * (attempt + 1))
            continue
    if last_exc:
        raise last_exc


# ---------------------------------------------------------------------------
# datasets
# ---------------------------------------------------------------------------
def _dataset_public(meta: dict) -> dict:
    return {
        "id": meta.get("id"),
        "filename": meta.get("filename"),
        "source": meta.get("source", "upload"),
        "sizeBytes": meta.get("sizeBytes"),
        "rows": meta.get("rows"),
        "columns": meta.get("columns"),
        "createdAt": meta.get("createdAt"),
        "analyzedAt": meta.get("analyzedAt"),
        "binaryTarget": meta.get("binaryTarget"),
        "multiclassTarget": meta.get("multiclassTarget"),
        "hasLabel": bool(meta.get("binaryTarget")),
        "hasAttackCat": bool(meta.get("multiclassTarget")),
        "isSample": bool(meta.get("isSample", False)),
        "description": meta.get("description"),
        "projectFile": meta.get("source") == "project",
    }


def save_dataset(meta: dict) -> dict:
    with _lock:
        _write_json(DATASETS_DIR / f"{meta['id']}.json", meta)
    return meta


def get_dataset(dataset_id: str) -> dict | None:
    meta = _read_json(DATASETS_DIR / f"{dataset_id}.json")
    if not meta:
        return None
    path = Path(meta.get("storage_path", ""))
    if not path.exists():
        return None
    return meta


def get_dataset_path(dataset_id: str) -> Path | None:
    meta = get_dataset(dataset_id)
    if not meta:
        return None
    path = Path(meta["storage_path"])
    return path if path.exists() else None


def list_datasets() -> list[dict]:
    with _lock:
        items = [_read_json(p) for p in DATASETS_DIR.glob("*.json")]
    valid = [m for m in items if m and Path(m.get("storage_path", "")).exists()]
    valid.sort(key=lambda m: m.get("createdAt") or "", reverse=True)
    return [_dataset_public(m) for m in valid]


def delete_dataset(dataset_id: str) -> bool:
    meta = get_dataset(dataset_id)
    if not meta:
        return False
    try:
        Path(meta["storage_path"]).unlink(missing_ok=True)
    except OSError:
        pass
    (DATASETS_DIR / f"{dataset_id}.json").unlink(missing_ok=True)
    return True


_SYNC_LOCK = threading.Lock()
_LAST_SYNC_TIME = 0.0
_SYNC_INTERVAL = 30.0  # seconds


def sync_project_datasets() -> list[dict]:
    """Register CSV files sitting in the project ``data/`` directory.

    Files are matched by content hash so re-scanning does not create duplicates.
    Sample files are flagged so the UI can label them clearly.
    """
    global _LAST_SYNC_TIME
    registered: list[dict] = []
    if not PROJECT_DATA_DIR.exists():
        return registered

    # Avoid slamming the disk on every single GET /datasets request.
    now = time.time()
    if now - _LAST_SYNC_TIME < _SYNC_INTERVAL:
        return [m["id"] for m in list_datasets() if m.get("projectFile")]

    # We use a separate lock for the sync process itself.
    if not _SYNC_LOCK.acquire(blocking=False):
        return registered

    try:
        for path in sorted(PROJECT_DATA_DIR.rglob("*.csv")):
            digest = stable_hash(path.name, path.stat().st_size)[:10]
            dataset_id = f"prj{digest}"

            if get_dataset(dataset_id):
                registered.append(dataset_id)
                continue

            is_sample = "sample" in path.name.lower() or "sample" in str(path.parent).lower()
            description = None
            if is_sample:
                description = (
                    "SYNTHETIC SAMPLE DATA - generated for demonstration and automated tests. "
                    "It is NOT the UNSW-NB15 dataset and must not be used for performance claims."
                )

            try:
                save_dataset(
                    {
                        "id": dataset_id,
                        "filename": path.name,
                        "storage_path": str(path),
                        "source": "project",
                        "sizeBytes": path.stat().st_size,
                        "rows": None,
                        "columns": None,
                        "createdAt": now_iso(),
                        "analyzedAt": None,
                        "binaryTarget": None,
                        "multiclassTarget": None,
                        "isSample": is_sample,
                        "description": description,
                    }
                )
                registered.append(dataset_id)
            except Exception:
                # If one file fails (e.g. locked by OneDrive), skip it and
                # move on so the rest of the list can be returned.
                continue

        _LAST_SYNC_TIME = time.time()
    finally:
        _SYNC_LOCK.release()

    return registered


# ---------------------------------------------------------------------------
# models
# ---------------------------------------------------------------------------
def model_artifact_path(model_id: str) -> Path:
    return MODELS_DIR / f"{model_id}.joblib"


def save_model_metadata(meta: dict) -> dict:
    with _lock:
        _write_json(MODELS_DIR / f"{meta['id']}.json", meta)
    return meta


def model_public(meta: dict) -> dict:
    if not meta:
        return {}
    return {
        "id": meta.get("id"),
        "algorithm": meta.get("algorithm"),
        "algorithmLabel": meta.get("algorithmLabel"),
        "target": meta.get("target"),
        "targetLabel": meta.get("targetLabel"),
        "datasetName": meta.get("datasetName"),
        "datasetIsSample": meta.get("datasetIsSample", False),
        "trainedAt": meta.get("trainedAt"),
        "trainingRows": meta.get("trainingRows"),
        "featureCount": len(meta.get("featureColumns", [])),
        "featureColumns": meta.get("featureColumns", []),
        "numericColumns": meta.get("numericColumns", []),
        "categoricalColumns": meta.get("categoricalColumns", []),
        "classes": meta.get("classes", []),
        "classDistribution": meta.get("classDistribution", []),
        "trainFitMetrics": meta.get("trainFitMetrics"),
        "hyperparameters": meta.get("hyperparameters"),
        "durationSeconds": meta.get("durationSeconds"),
        "targetEncoding": meta.get("targetEncoding"),
    }


def get_model(model_id: str) -> dict | None:
    meta = _read_json(MODELS_DIR / f"{model_id}.json")
    if not meta:
        return None
    if not model_artifact_path(model_id).exists():
        return None
    return meta


def list_models() -> list[dict]:
    with _lock:
        items = [_read_json(p) for p in MODELS_DIR.glob("*.json") if p.name != "active.json"]
    valid = [m for m in items if m and model_artifact_path(m["id"]).exists()]
    valid.sort(key=lambda m: m.get("trainedAt") or "", reverse=True)
    return [model_public(m) for m in valid]


def delete_model(model_id: str) -> bool:
    meta = get_model(model_id)
    if not meta:
        return False
    model_artifact_path(model_id).unlink(missing_ok=True)
    (MODELS_DIR / f"{model_id}.json").unlink(missing_ok=True)
    if get_active_model_id() == model_id:
        set_active_model(None)
    return True


def set_active_model(model_id: str | None) -> None:
    with _lock:
        _write_json(_ACTIVE_MODEL_FILE, {"modelId": model_id, "updatedAt": now_iso()})


def get_active_model_id() -> str | None:
    data = _read_json(_ACTIVE_MODEL_FILE, {})
    return (data or {}).get("modelId")


def get_active_model() -> dict | None:
    model_id = get_active_model_id()
    if not model_id:
        return None
    return get_model(model_id)


# ---------------------------------------------------------------------------
# evaluations
# ---------------------------------------------------------------------------
def save_evaluation(meta: dict) -> dict:
    with _lock:
        _write_json(EVALUATIONS_DIR / f"{meta['id']}.json", meta)
    return meta


def get_evaluation(evaluation_id: str) -> dict | None:
    return _read_json(EVALUATIONS_DIR / f"{evaluation_id}.json")


def list_evaluations() -> list[dict]:
    with _lock:
        items = [_read_json(p) for p in EVALUATIONS_DIR.glob("*.json")]
    valid = [m for m in items if m]
    valid.sort(key=lambda m: m.get("evaluatedAt") or "", reverse=True)
    return valid


def latest_evaluation() -> dict | None:
    items = list_evaluations()
    return items[0] if items else None


# ---------------------------------------------------------------------------
# detections
# ---------------------------------------------------------------------------
def detection_rows_path(detection_id: str) -> Path:
    """Full-fidelity detection rows (JSON Lines). CSV export is generated on demand."""
    return DETECTIONS_DIR / f"{detection_id}.jsonl"


def detection_input_path(detection_id: str) -> Path:
    """The exact traffic file that was scored, kept so record details stay auditable."""
    return DETECTIONS_DIR / f"{detection_id}_input.csv"


def write_jsonl(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, default=str) + "\n")


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows: list[dict] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return rows


def save_detection(meta: dict) -> dict:
    with _lock:
        _write_json(DETECTIONS_DIR / f"{meta['id']}.json", meta)
    return meta


def get_detection(detection_id: str) -> dict | None:
    return _read_json(DETECTIONS_DIR / f"{detection_id}.json")


def list_detections() -> list[dict]:
    with _lock:
        items = [_read_json(p) for p in DETECTIONS_DIR.glob("*.json")]
    valid = [m for m in items if m]
    valid.sort(key=lambda m: m.get("createdAt") or "", reverse=True)
    return valid


def latest_detection() -> dict | None:
    items = list_detections()
    return items[0] if items else None


def storage_stats() -> dict:
    def _dir_size(path: Path) -> int:
        if not path.exists():
            return 0
        return sum(p.stat().st_size for p in path.rglob("*") if p.is_file())

    return {
        "datasets": len(list_datasets()),
        "models": len(list_models()),
        "evaluations": len(list_evaluations()),
        "detections": len(list_detections()),
        "storageBytes": _dir_size(DATASETS_DIR)
        + _dir_size(MODELS_DIR)
        + _dir_size(EVALUATIONS_DIR)
        + _dir_size(DETECTIONS_DIR),
        "serverTime": now_iso(),
        "uptimeSeconds": round(time.time() - _PROCESS_START, 1),
    }


_PROCESS_START = time.time()
