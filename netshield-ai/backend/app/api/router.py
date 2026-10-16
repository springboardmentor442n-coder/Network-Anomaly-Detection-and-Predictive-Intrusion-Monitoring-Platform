"""API Router aggregating all route modules."""
from fastapi import APIRouter
from app.api.routes import (
    auth, users, teams, traffic, datasets, scans,
    ml_routes, detections, risk, alerts, incidents,
    analytics, threat_intelligence, reports, models_routes,
    audit_logs, dashboard
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(teams.router, prefix="/teams", tags=["Teams"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(traffic.router, prefix="/traffic", tags=["Traffic"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["Datasets"])
api_router.include_router(scans.router, prefix="/scans", tags=["Scans"])
api_router.include_router(ml_routes.router, prefix="/ml", tags=["ML"])
api_router.include_router(detections.router, prefix="/detections", tags=["Detections"])
api_router.include_router(risk.router, prefix="/risk", tags=["Risk"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(threat_intelligence.router, prefix="/threat-intelligence", tags=["Threat Intelligence"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(models_routes.router, prefix="/models", tags=["Models"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["Audit Logs"])
