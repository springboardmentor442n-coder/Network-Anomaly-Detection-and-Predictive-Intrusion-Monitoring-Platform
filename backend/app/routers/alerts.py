"""Security alert listing, status transitions, bulk operations and Report D export."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from .. import alerts as alerts_store
from ..schemas import AlertStatusRequest, BulkAlertStatusRequest, DeleteAlertsRequest

router = APIRouter(prefix="/alerts", tags=["alerts"])

_ALLOWED_SORTS = {"createdAt", "severity", "status", "confidence", "predictedClass", "category"}


@router.get("")
def index(
    severity: str | None = None,
    status: str | None = None,
    q: str | None = None,
    detection_id: str | None = Query(default=None, alias="detectionId"),
    sort: str = "createdAt",
    order: str = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200, alias="pageSize"),
) -> dict:
    if sort not in _ALLOWED_SORTS:
        raise HTTPException(status_code=400, detail={"error": "bad_sort", "message": f"sort must be one of {sorted(_ALLOWED_SORTS)}"})
    return alerts_store.list_alerts(
        severity=severity,
        status=status,
        search=q,
        detection_id=detection_id,
        sort=sort,
        order=order,
        page=page,
        page_size=page_size,
    )


@router.get("/stats")
def stats() -> dict:
    return alerts_store.stats()


@router.get("/report")
def report(
    severity: str | None = None,
    status: str | None = None,
    q: str | None = None,
) -> Response:
    payload = alerts_store.list_alerts(
        severity=severity, status=status, search=q, page=1, page_size=200
    )
    rows = list(payload["items"])
    page = 1
    while page * 200 < payload["total"]:
        page += 1
        rows.extend(
            alerts_store.list_alerts(
                severity=severity, status=status, search=q, page=page, page_size=200
            )["items"]
        )
    return Response(
        content=alerts_store.alerts_report_csv(rows),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="netshield_security_alerts.csv"'},
    )


@router.post("/bulk-status")
def bulk_status(request: BulkAlertStatusRequest) -> dict:
    updated = alerts_store.bulk_update_status(request.ids, request.status)
    return {"updated": updated, "status": request.status, "stats": alerts_store.stats()}


@router.post("/delete")
def delete(request: DeleteAlertsRequest) -> dict:
    if not request.confirm:
        raise HTTPException(
            status_code=400,
            detail={"error": "confirmation_required", "message": "Set confirm=true to delete alerts."},
        )
    deleted = alerts_store.delete_alerts(request.ids)
    return {"deleted": deleted, "stats": alerts_store.stats()}


@router.get("/{alert_id}")
def show(alert_id: str) -> dict:
    alert = alerts_store.get_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail={"error": "alert_not_found", "message": "Alert not found."})
    return {"alert": alert}


@router.patch("/{alert_id}")
def update(alert_id: str, request: AlertStatusRequest) -> dict:
    alert = alerts_store.update_status(alert_id, request.status)
    if not alert:
        raise HTTPException(status_code=404, detail={"error": "alert_not_found", "message": "Alert not found."})
    return {"alert": alert, "stats": alerts_store.stats()}
