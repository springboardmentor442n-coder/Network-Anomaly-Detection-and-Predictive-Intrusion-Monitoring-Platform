"""Dataset upload, listing, analysis, pagination and export."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import Response

from ..cache import invalidate, load_frame
from ..config import DATASETS_DIR, MAX_UPLOAD_BYTES, PROJECT_DATA_DIR
from ..ml.dataset import (
    dataset_report_csv,
    filter_frame,
    paginate_frame,
    profile_dataset,
    to_records,
    validate_dataset_file,
    validate_extension,
)
from ..ml.schema_utils import DataValidationError, find_target_columns
from ..store import (
    delete_dataset,
    get_dataset,
    get_dataset_path,
    list_datasets,
    new_id,
    now_iso,
    safe_filename,
    save_dataset,
    sync_project_datasets,
)

router = APIRouter(prefix="/datasets", tags=["datasets"])

_CHUNK = 1024 * 1024


def _csv_response(text: str, filename: str) -> Response:
    return Response(
        content=text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def _persist_upload(upload: UploadFile) -> tuple[Path, str, int]:
    original = safe_filename(upload.filename or "dataset.csv")
    validate_extension(original)

    dataset_id = new_id("ds")
    destination = DATASETS_DIR / f"{dataset_id}.csv"
    size = 0
    try:
        with destination.open("wb") as handle:
            while chunk := await upload.read(_CHUNK):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    handle.close()
                    destination.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB upload limit."
                        ),
                    )
                handle.write(chunk)
    finally:
        await upload.close()

    if size == 0:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    return destination, original, size


def _register(destination: Path, original: str, size: int, source: str = "upload") -> dict:
    """Validate an uploaded CSV and persist its metadata + initial profile."""
    try:
        frame = validate_dataset_file(destination)
    except DataValidationError as error:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=error.as_dict()) from error

    binary, multiclass = find_target_columns(frame.columns)
    is_sample = "sample" in original.lower()
    meta = {
        "id": destination.stem,
        "filename": original,
        "storage_path": str(destination),
        "source": source,
        "sizeBytes": size,
        "rows": int(frame.shape[0]),
        "columns": int(frame.shape[1]),
        "createdAt": now_iso(),
        "analyzedAt": now_iso(),
        "binaryTarget": binary,
        "multiclassTarget": multiclass,
        "isSample": is_sample,
        "description": (
            "SYNTHETIC SAMPLE DATA - for demonstration and tests only. "
            "It is NOT the UNSW-NB15 dataset and must not be used for performance claims."
            if is_sample
            else None
        ),
        "profile": profile_dataset(frame),
    }
    save_dataset(meta)
    return _public(meta)


def _public(meta: dict) -> dict:
    return {
        "id": meta["id"],
        "filename": meta["filename"],
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
    }


@router.get("")
def list_all() -> dict:
    sync_project_datasets()
    return {"items": list_datasets()}


@router.get("/project-files")
def project_files() -> dict:
    """CSV files the user has placed in the project ``data/`` directory."""
    if not PROJECT_DATA_DIR.exists():
        return {
            "directory": PROJECT_DATA_DIR.name,
            "exists": False,
            "files": [],
            "hint": (
                f"Create '{PROJECT_DATA_DIR.name}/' at the project root and place "
                "UNSW_NB15_training-set.csv / UNSW_NB15_testing-set.csv inside it."
            ),
        }
    files = []
    for path in sorted(PROJECT_DATA_DIR.rglob("*.csv")):
        files.append({"name": path.name, "relativePath": str(path.relative_to(PROJECT_DATA_DIR)), "sizeBytes": path.stat().st_size})
    return {"directory": PROJECT_DATA_DIR.name, "exists": True, "files": files, "hint": None}


@router.post("/upload")
async def upload(file: UploadFile = File(...)) -> dict:
    destination, original, size = await _persist_upload(file)
    return _register(destination, original, size, source="upload")


@router.post("/{dataset_id}/reanalyze")
def reanalyze(dataset_id: str) -> dict:
    meta = get_dataset(dataset_id)
    path = get_dataset_path(dataset_id)
    if not meta or not path:
        raise HTTPException(status_code=404, detail={"error": "dataset_not_found", "message": "Dataset not available."})
    invalidate(path)
    frame = validate_dataset_file(path)
    binary, multiclass = find_target_columns(frame.columns)
    meta.update(
        {
            "rows": int(frame.shape[0]),
            "columns": int(frame.shape[1]),
            "analyzedAt": now_iso(),
            "binaryTarget": binary,
            "multiclassTarget": multiclass,
            "profile": profile_dataset(frame),
        }
    )
    save_dataset(meta)
    return _public(meta)


@router.get("/{dataset_id}/summary")
def summary(dataset_id: str) -> dict:
    meta = get_dataset(dataset_id)
    path = get_dataset_path(dataset_id)
    if not meta or not path:
        raise HTTPException(status_code=404, detail={"error": "dataset_not_found", "message": "Dataset not available."})

    if not meta.get("profile"):
        frame = validate_dataset_file(path)
        binary, multiclass = find_target_columns(frame.columns)
        meta["binaryTarget"] = binary
        meta["multiclassTarget"] = multiclass
        meta["rows"] = int(frame.shape[0])
        meta["columns"] = int(frame.shape[1])
        meta["analyzedAt"] = now_iso()
        meta["profile"] = profile_dataset(frame)
        save_dataset(meta)

    return {"dataset": _public(meta), "profile": meta["profile"]}


@router.get("/{dataset_id}/rows")
def rows(
    dataset_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    search: str | None = None,
    attack_cat: str | None = None,
    proto: str | None = None,
    service: str | None = None,
    label: str | None = None,
) -> dict:
    frame = _load(dataset_id)
    filtered = filter_frame(
        frame, search=search, attack_cat=attack_cat, proto=proto, service=service, label=label
    )
    return paginate_frame(filtered, page, page_size)


@router.get("/{dataset_id}/filter-options")
def filter_options(dataset_id: str) -> dict:
    frame = _load(dataset_id)
    _, multiclass = find_target_columns(frame.columns)

    def unique(column: str, limit: int = 50) -> list[str]:
        if column not in frame.columns:
            return []
        values = frame[column].astype("string").dropna().unique().tolist()
        return sorted(str(v).strip() for v in values)[:limit]

    return {
        "attackCategories": unique(multiclass) if multiclass else [],
        "protocols": unique("proto"),
        "services": unique("service"),
        "labels": unique("label", 5),
    }


@router.get("/{dataset_id}/export")
def export(
    dataset_id: str,
    search: str | None = None,
    attack_cat: str | None = None,
    proto: str | None = None,
    service: str | None = None,
    label: str | None = None,
) -> Response:
    frame = _load(dataset_id)
    filtered = filter_frame(
        frame, search=search, attack_cat=attack_cat, proto=proto, service=service, label=label
    )
    meta = get_dataset(dataset_id) or {}
    stem = Path(meta.get("filename", "dataset")).stem
    rows_list = to_records(filtered)
    if not rows_list:
        body = ""
    else:
        columns = list(rows_list[0].keys())
        lines = [",".join(_quote(c) for c in columns)]
        for record in rows_list:
            lines.append(",".join(_quote(record.get(column)) for column in columns))
        body = "\n".join(lines) + "\n"
    return _csv_response(body, f"{stem}_filtered.csv")


@router.get("/{dataset_id}/report")
def report(dataset_id: str) -> Response:
    meta = get_dataset(dataset_id)
    path = get_dataset_path(dataset_id)
    if not meta or not path:
        raise HTTPException(status_code=404, detail={"error": "dataset_not_found", "message": "Dataset not available."})
    if not meta.get("profile"):
        frame = validate_dataset_file(path)
        meta["profile"] = profile_dataset(frame)
        save_dataset(meta)
    stem = Path(meta.get("filename", "dataset")).stem
    return _csv_response(dataset_report_csv(meta, meta["profile"]), f"netshield_dataset_summary_{stem}.csv")


@router.delete("/{dataset_id}")
def remove(dataset_id: str) -> dict:
    if not delete_dataset(dataset_id):
        raise HTTPException(status_code=404, detail={"error": "dataset_not_found", "message": "Dataset not available."})
    return {"deleted": dataset_id}


def _load(dataset_id: str):
    path = get_dataset_path(dataset_id)
    if not path:
        raise HTTPException(status_code=404, detail={"error": "dataset_not_found", "message": "Dataset not available. Upload it again."})
    return load_frame(path)


def _quote(value) -> str:
    text = "" if value is None else str(value)
    if any(ch in text for ch in [",", '"', "\n"]):
        return '"' + text.replace('"', '""') + '"'
    return text
