"""Scan routes with SSE streaming."""
import os
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import ScanJob, User
from app.api.deps import get_current_user, require_operator
from app.streaming.scanner import stream_scan, stop_scan, clear_scan_flag
from app.core.config import settings

router = APIRouter()


class StartScanRequest(BaseModel):
    filename: str
    chunk_size: int = 1000


@router.post("/start")
async def start_scan(
    body: StartScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    """Create and start a new CICIDS2017 scan job."""
    data_dir = settings.DATA_DIR
    filepath = os.path.join(data_dir, body.filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"Dataset not found: {body.filename}")

    scan_job = ScanJob(
        dataset_name=body.filename,
        dataset_path=filepath,
        status="PENDING",
        created_by=current_user.id,
    )
    db.add(scan_job)
    db.commit()
    db.refresh(scan_job)

    return {
        "scan_id": scan_job.id,
        "status": "PENDING",
        "filename": body.filename,
        "message": "Scan created. Connect to SSE stream to start.",
    }


@router.get("/{scan_id}/stream")
async def scan_stream(
    scan_id: str,
    db: Session = Depends(get_db),
):
    """SSE stream for scan results."""
    scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    if scan.status in ("COMPLETED", "FAILED"):
        raise HTTPException(status_code=400, detail=f"Scan already {scan.status}")

    async def event_generator():
        try:
            async for event in stream_scan(scan_id, scan.dataset_path):
                yield event
        except asyncio.CancelledError:
            stop_scan(scan_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/{scan_id}/stop")
async def stop_scan_endpoint(
    scan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    """Stop a running scan."""
    scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    stop_scan(scan_id)
    scan.status = "STOPPED"
    db.commit()

    return {"message": "Scan stop signal sent", "scan_id": scan_id}


@router.get("/{scan_id}")
async def get_scan(
    scan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get scan job details."""
    scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    return {
        "id": scan.id,
        "dataset_name": scan.dataset_name,
        "status": scan.status,
        "total_rows": scan.total_rows,
        "processed_rows": scan.processed_rows,
        "threats_detected": scan.threats_detected,
        "critical_alerts": scan.critical_alerts,
        "processing_rate": scan.processing_rate,
        "started_at": scan.started_at.isoformat() if scan.started_at else None,
        "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
        "error_message": scan.error_message,
        "created_at": scan.created_at.isoformat(),
    }


@router.get("/")
async def list_scans(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all scan jobs."""
    scans = db.query(ScanJob).order_by(ScanJob.created_at.desc()).offset(skip).limit(limit).all()
    total = db.query(ScanJob).count()

    return {
        "total": total,
        "items": [
            {
                "id": s.id,
                "dataset_name": s.dataset_name,
                "status": s.status,
                "processed_rows": s.processed_rows,
                "threats_detected": s.threats_detected,
                "created_at": s.created_at.isoformat(),
            }
            for s in scans
        ],
    }
