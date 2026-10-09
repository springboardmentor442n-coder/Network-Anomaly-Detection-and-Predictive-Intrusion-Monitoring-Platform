from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.alerts import router as alerts_router
from backend.app.api.auth import router as auth_router
from backend.app.api.monitoring import router as monitoring_router
from backend.app.api.prediction import router as prediction_router
from backend.app.api.users import router as users_router
from backend.app.api.risk_analysis import router as risk_analysis_router
from backend.app.api.incidents import router as incidents_router
from backend.app.api.threat_intelligence import (
    router as threat_intelligence_router,
)
from backend.app.api.reports import router as reports_router
from backend.app.api.audit_logs import router as audit_logs_router

from backend.app.services.realtime_monitor import monitor_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 70)
    print("NetShield AI - Starting Application")
    print("=" * 70)

    monitor_service.start()

    print("Real-time monitoring service started.")

    try:
        yield

    finally:
        print("Stopping real-time monitoring service...")

        monitor_service.stop()

        print("Real-time monitoring service stopped.")


app = FastAPI(
    title="NetShield AI",
    description=(
        "AI-powered Network Anomaly Detection "
        "and Predictive Intrusion Monitoring Platform"
    ),
    version="1.0.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=(
        r"^https?://"
        r"(localhost|127\.0\.0\.1)"
        r"(:\d+)?$"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# API ROUTERS
# =========================================================

app.include_router(prediction_router)

app.include_router(alerts_router)

app.include_router(auth_router)

app.include_router(monitoring_router)

app.include_router(users_router)

app.include_router(risk_analysis_router)

app.include_router(incidents_router)

app.include_router(threat_intelligence_router)

app.include_router(reports_router)

app.include_router(audit_logs_router)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "NetShield AI API is running"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


# =========================================================
# MONITORING STATUS
# =========================================================

@app.get(
    "/monitoring/status",
    tags=["Monitoring"],
)
def monitoring_status():
    return monitor_service.status()