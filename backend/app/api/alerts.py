from fastapi import APIRouter, HTTPException

from app.schemas.alert import AlertCreate
from app.services.alert_service import (
    create_alert,
    get_alerts,
    get_alert_by_id,
    update_alert_status
)


router = APIRouter(
    prefix="/api/alerts",
    tags=["Alerts"]
)


@router.post("/")
def generate_alert(alert: AlertCreate):

    result = create_alert(
        alert.model_dump()
    )

    if result is None:
        return {
            "success": True,
            "alert_created": False,
            "message": "No alert generated for benign low-risk traffic"
        }

    return {
        "success": True,
        "alert_created": True,
        "alert": result
    }


@router.get("/")
def list_alerts():

    return {
        "success": True,
        "count": len(get_alerts()),
        "alerts": get_alerts()
    }


@router.get("/{alert_id}")
def get_single_alert(alert_id: int):

    alert = get_alert_by_id(alert_id)

    if alert is None:
        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )

    return {
        "success": True,
        "alert": alert
    }


@router.put("/{alert_id}/status")
def change_alert_status(
    alert_id: int,
    status: str
):

    allowed_statuses = [
        "OPEN",
        "INVESTIGATING",
        "RESOLVED"
    ]

    status = status.upper()

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Use one of: {allowed_statuses}"
        )

    alert = update_alert_status(
        alert_id,
        status
    )

    if alert is None:
        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )

    return {
        "success": True,
        "message": "Alert status updated",
        "alert": alert
    }