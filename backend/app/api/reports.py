"""
Reporting API Routes.

Reports are generated from database rows only. Export formats: json, csv and
pdf (pdf requires reportlab; the endpoint reports 503 with an install hint when
it is absent rather than returning a broken file).
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..core.config import settings
from ..database import get_db
from ..models import AuditLog, User
from ..schemas import ReportResponse
from ..services import MLService, ReportingService, pdf_available
from .dependencies import current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])

_reporting_service = ReportingService(MLService(settings.model_root))


class ReportCreateRequest(BaseModel):
    title: Optional[str] = None
    report_type: str = Field(default="SECURITY")
    days: int = Field(default=7, ge=1, le=365)


@router.get("/formats")
def formats(user: User = Depends(current_user)):
    """Which export formats are available in this deployment."""
    return {
        "json": {"available": True},
        "csv": {"available": True},
        "pdf": {
            "available": pdf_available(),
            "reason": None
            if pdf_available()
            else "Install reportlab to enable PDF export (pip install reportlab)",
        },
    }


@router.post("", response_model=ReportResponse, status_code=201)
def create_report(
    request: ReportCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Generate and store a report over the last N days."""
    period_end = datetime.now(timezone.utc)
    period_start = period_end - timedelta(days=request.days)
    title = request.title or f"{request.report_type.title()} report - last {request.days} day(s)"

    report, _ = _reporting_service.generate_and_store(
        db,
        title=title,
        generated_by=user.email,
        period_start=period_start,
        period_end=period_end,
        report_type=request.report_type.upper(),
    )

    try:
        db.add(
            AuditLog(
                user_email=user.email,
                action="report_generated",
                details=json.dumps({"report_id": report.id, "days": request.days}),
            )
        )
        db.commit()
    except Exception:  # noqa: BLE001
        db.rollback()

    return ReportResponse.model_validate(report)


@router.get("")
def list_reports(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List previously generated reports."""
    total, rows = ReportingService.list_reports(db, limit=limit, offset=offset)
    return {
        "total": total,
        "reports": [ReportResponse.model_validate(row) for row in rows],
    }


@router.get("/preview")
def preview_report(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    days: int = Query(7, ge=1, le=365),
):
    """Build a report payload without persisting it."""
    period_end = datetime.now(timezone.utc)
    period_start = period_end - timedelta(days=days)
    return _reporting_service.build_report_data(db, period_start, period_end)


@router.get("/{report_id}")
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    format: str = Query("json", pattern="^(json|csv|pdf)$"),
):
    """Fetch a stored report in json, csv or pdf form."""
    report = ReportingService.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report not found: {report_id}")

    try:
        data = json.loads(report.data_json) if report.data_json else {}
    except json.JSONDecodeError:
        data = {}

    if format == "json":
        return {
            "report": ReportResponse.model_validate(report),
            "data": data,
        }

    if format == "csv":
        if not data:
            raise HTTPException(status_code=409, detail="Report has no stored data payload")
        csv_text = ReportingService.to_csv(data)
        return Response(
            content=csv_text,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="netshield-report-{report_id}.csv"'
            },
        )

    # format == "pdf"
    if not pdf_available():
        raise HTTPException(
            status_code=503,
            detail="PDF export is unavailable. Install reportlab (pip install reportlab).",
        )
    if not data:
        raise HTTPException(status_code=409, detail="Report has no stored data payload")
    pdf_bytes = ReportingService.to_pdf(report.title, data)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="netshield-report-{report_id}.pdf"'
        },
    )
