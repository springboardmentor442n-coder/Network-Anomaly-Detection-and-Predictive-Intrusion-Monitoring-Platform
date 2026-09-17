"""API routes for NetShield AI."""

from fastapi import APIRouter

from . import (
    admin,
    alerts,
    analytics,
    auth,
    health,
    incidents,
    legacy,
    monitoring,
    predictions,
    reports,
    stream,
    threat_intel,
)

router = APIRouter()

router.include_router(health.router)
router.include_router(auth.router)
router.include_router(predictions.router)
router.include_router(monitoring.router)
router.include_router(alerts.router)
router.include_router(incidents.router)
router.include_router(analytics.router)
router.include_router(threat_intel.router)
router.include_router(reports.router)
router.include_router(stream.router)
router.include_router(admin.router)

# Backwards-compatible aliases for the pre-2.0 endpoint paths.
router.include_router(legacy.router)

__all__ = ["router"]
