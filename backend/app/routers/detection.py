"""Threat detection runs, detection result browsing/export and alert generation."""

from __future__ import annotations

import threading
import traceback
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response

from ..config import DETECTIONS_DIR, MAX_UPLOAD_BYTES
from ..jobs import JOBS
from ..ml.detection import (
    DEFAULT_SEVERITY_RULES,
    detection_results_csv,
    fire_alerts,
    read_results,
    run_detection,
)
from ..ml.schema_utils import DataValidationError
from ..store import (
    DETECTIONS_DIR,
    get_detection,
    list_detections,
    new_id,
    now_iso,
    save_detection,
    safe_filename,
)

router = APIRouter(tags=["detection"])

_CHUNK = 1024 * 1024

SUMMARY_FIELDS = (
    "id",
    "mode",
    "modeLabel",
    "modelId",
    "algorithmLabel",
    "targetLabel",
    "modelDatasetName",
    "sourceFilename",
    "createdAt",
    "rowsScanned",
    "predictedAttackCount",
    "predictedNormalCount",
    "attackRate",
    "severityCounts",
    "categoryCounts",
    "confidenceSupported",
    "alertsCreated",
    "durationSeconds",
    "warnings",
)


def _summary(record: dict) -> dict:
    return {key: record.get(key) for key in SUMMARY_FIELDS}


def _csv_response(text: str, filename: str) -> Response:
    return Response(
        content=text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/detections")
def index() -> dict:
    items = list_detections()
    return {"items": [_summary(item) for item in items]}


@router.get("/detections/latest")
def latest() -> dict:
    items = list_detections()
    if not items:
        return {
            "detection": None,
            "message": "No detection run yet. Upload a traffic CSV after training a model.",
        }
    return {"detection": items[0], "resultsAvailable": True}


@router.post("/detect")
async def detect(
    file: UploadFile = File(...),
    model_id: str | None = Form(default=None),
    mode: str = Form(default="model"),
    critical: float = Form(default=DEFAULT_SEVERITY_RULES["critical"]),
    high: float = Form(default=DEFAULT_SEVERITY_RULES["high"]),
    medium: float = Form(default=DEFAULT_SEVERITY_RULES["medium"]),
    create_alerts: bool = Form(default=True),
) -> dict:
    if mode not in {"model", "heuristic"}:
        raise HTTPException(status_code=400, detail={"error": "bad_mode", "message": "mode must be 'model' or 'heuristic'."})

    original = safe_filename(file.filename or "traffic.csv")
    if Path(original).suffix.lower() != ".csv":
        raise HTTPException(status_code=400, detail={"error": "bad_extension", "message": "Only .csv files are accepted."})

    detection_id = new_id("det")
    destination = DETECTIONS_DIR / f"{detection_id}_upload.csv"
    size = 0
    try:
        with destination.open("wb") as handle:
            while chunk := await file.read(_CHUNK):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    handle.close()
                    destination.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail={"error": "too_large", "message": f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit."},
                    )
                handle.write(chunk)
    finally:
        await file.close()

    if size == 0:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail={"error": "empty_file", "message": "The uploaded file is empty."})

    job = JOBS.create("detection")
    rules = {"critical": critical, "high": high, "medium": medium}

    def run() -> None:
        JOBS.update(job.id, status="running", progress=2, message="Starting")
        try:
            record = run_detection(
                source_path=destination,
                source_filename=original,
                model_id=model_id,
                mode=mode,
                severity_rules=rules,
                detection_id=detection_id,
                progress=lambda percent, message: JOBS.update(job.id, progress=percent, message=message),
            )
            if create_alerts:
                JOBS.update(job.id, progress=96, message="Raising security alerts")
                outcome = fire_alerts(record)
                record["alertsCreated"] = outcome.get("created", 0)
                record["alertDuplicates"] = outcome.get("duplicates", 0)
                record["alertMessage"] = outcome.get("message")
                save_detection(record)
            JOBS.update(
                job.id,
                status="succeeded",
                progress=100,
                message="Detection complete",
                result={"detectionId": record["id"], "detection": _summary(record)},
            )
        except Exception as error:  # noqa: BLE001
            traceback.print_exc()
            message = error.message if isinstance(error, DataValidationError) else str(error)
            details = error.details if isinstance(error, DataValidationError) else None
            JOBS.update(job.id, status="failed", error=message, message="Failed", progress=0, result={"details": details})

    threading.Thread(target=run, name=f"detect-{job.id}", daemon=True).start()
    return {"jobId": job.id, "detectionId": detection_id}


@router.get("/detections/{detection_id}")
def show(detection_id: str) -> dict:
    record = get_detection(detection_id)
    if not record:
        raise HTTPException(status_code=404, detail={"error": "detection_not_found", "message": "Detection run not found."})
    return {"detection": record}


@router.get("/detections/{detection_id}/rows")
def rows(
    detection_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    severity: str | None = None,
    predicted_class: str | None = None,
    category: str | None = None,
    min_confidence: float | None = Query(default=None, ge=0.0, le=1.0),
    search: str | None = None,
    only_threats: bool = False,
) -> dict:
    record = get_detection(detection_id)
    if not record:
        raise HTTPException(status_code=404, detail={"error": "detection_not_found", "message": "Detection run not found."})

    items = read_results(detection_id)
    filtered = _filter(items, severity, predicted_class, category, min_confidence, search, only_threats)

    page = max(1, page)
    page_size = max(1, min(page_size, 200))
    start = (page - 1) * page_size
    total = len(filtered)
    return {
        "page": page,
        "pageSize": page_size,
        "total": total,
        "totalPages": max(1, (total + page_size - 1) // page_size) if total else 1,
        "rows": filtered[start : start + page_size],
        "detection": _summary(record),
    }


@router.get("/detections/{detection_id}/report")
def report(detection_id: str) -> Response:
    record = get_detection(detection_id)
    if not record:
        raise HTTPException(status_code=404, detail={"error": "detection_not_found", "message": "Detection run not found."})
    items = read_results(detection_id)
    return _csv_response(detection_results_csv(items), f"netshield_detection_results_{detection_id}.csv")


@router.post("/detections/{detection_id}/alerts")
def raise_alerts(detection_id: str) -> dict:
    record = get_detection(detection_id)
    if not record:
        raise HTTPException(status_code=404, detail={"error": "detection_not_found", "message": "Detection run not found."})
    outcome = fire_alerts(record)
    record["alertsCreated"] = int(record.get("alertsCreated") or 0) + int(outcome.get("created", 0))
    record["alertDuplicates"] = outcome.get("duplicates", 0)
    record["alertMessage"] = outcome.get("message")
    record["alertsGeneratedAt"] = now_iso()
    save_detection(record)
    return outcome


@router.delete("/detections/{detection_id}")
def remove(detection_id: str) -> dict:
    from ..store import detection_input_path, detection_rows_path

    if not get_detection(detection_id):
        raise HTTPException(status_code=404, detail={"error": "detection_not_found", "message": "Detection run not found."})
    (DETECTIONS_DIR / f"{detection_id}.json").unlink(missing_ok=True)
    detection_rows_path(detection_id).unlink(missing_ok=True)
    detection_input_path(detection_id).unlink(missing_ok=True)
    (DETECTIONS_DIR / f"{detection_id}_upload.csv").unlink(missing_ok=True)
    return {"deleted": detection_id}


def _filter(
    items: list[dict],
    severity: str | None,
    predicted_class: str | None,
    category: str | None,
    min_confidence: float | None,
    search: str | None,
    only_threats: bool,
) -> list[dict]:
    result = items
    if only_threats:
        result = [row for row in result if _truthy(row.get("isThreat"))]
    if severity:
        wanted = {s.strip().lower() for s in severity.split(",") if s.strip()}
        result = [row for row in result if str(row.get("severity", "")).lower() in wanted]
    if predicted_class:
        wanted = {s.strip().lower() for s in predicted_class.split(",") if s.strip()}
        result = [row for row in result if str(row.get("predictedLabel", "")).lower() in wanted]
    if category:
        wanted = {s.strip().lower() for s in category.split(",") if s.strip()}
        result = [row for row in result if str(row.get("attackCategory") or "").lower() in wanted]
    if min_confidence is not None:
        def _conf(row: dict) -> float:
            try:
                return float(row.get("confidence"))
            except (TypeError, ValueError):
                return -1.0

        result = [row for row in result if _conf(row) >= min_confidence]
    if search:
        needle = search.strip().lower()
        if needle:
            result = [
                row
                for row in result
                if needle in str(row.get("recordReference", "")).lower()
                or needle in str(row.get("detectionReason", "")).lower()
                or needle in str(row.get("predictedLabel", "")).lower()
                or needle in str(row.get("attackCategory", "")).lower()
            ]
    return result


def _truthy(value) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"true", "1", "yes"}
