"""
Health Check Routes.
"""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "NetShield AI"}


@router.get("/ready")
def readiness():
    """Readiness check endpoint."""
    return {"status": "ready"}
