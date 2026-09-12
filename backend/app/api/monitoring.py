from fastapi import APIRouter

from network_monitoring.traffic_analysis.traffic_analyzer import (
    TrafficAnalyzer,
)


router = APIRouter(
    prefix="/monitoring",
    tags=["Monitoring"],
)


analyzer = TrafficAnalyzer()


@router.get("/live")
def get_live_monitoring():
    """
    Capture live network traffic and return
    traffic analytics for the dashboard.
    """

    report = analyzer.capture_and_analyze(
        duration=5
    )

    return {
        "status": "success",
        "monitoring": report,
    }