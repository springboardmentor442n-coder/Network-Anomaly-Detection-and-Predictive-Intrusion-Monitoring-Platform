from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.prediction import (
    router as prediction_router,
)

from backend.app.api.alerts import (
    router as alerts_router,
)

from backend.app.api.auth import (
    router as auth_router,
)

from backend.app.api.monitoring import (
    router as monitoring_router,
)

from backend.app.services.realtime_monitor import (
    monitor_service,
)


# ---------------------------------------------------------
# APPLICATION LIFESPAN
# ---------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Start the real-time network monitoring service when
    FastAPI starts and stop it when FastAPI shuts down.
    """

    print("=" * 70)

    print(
        "NetShield AI - Starting Application"
    )

    print("=" * 70)

    monitor_service.start()

    print(
        "Real-time monitoring service started."
    )

    try:
        yield

    finally:

        print(
            "\nStopping real-time monitoring service..."
        )

        monitor_service.stop()

        print(
            "Real-time monitoring service stopped."
        )

        print(
            "NetShield AI application shutdown complete."
        )


# ---------------------------------------------------------
# FASTAPI APPLICATION
# ---------------------------------------------------------

app = FastAPI(
    title="NetShield AI",

    description=(
        "AI-Powered Network Anomaly Detection and "
        "Predictive Intrusion Monitoring Platform"
    ),

    version="1.0.0",

    lifespan=lifespan,
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],

    allow_credentials=True,

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ],
)


# ---------------------------------------------------------
# API ROUTERS
# ---------------------------------------------------------

app.include_router(
    prediction_router
)

app.include_router(
    alerts_router
)

app.include_router(
    auth_router
)

app.include_router(
    monitoring_router
)


# ---------------------------------------------------------
# ROOT
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "message": (
            "NetShield AI API is running"
        )
    }


# ---------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------

@app.get("/health")
def health_check():

    return {
        "status": "healthy"
    }


# ---------------------------------------------------------
# MONITORING SERVICE STATUS
# ---------------------------------------------------------

@app.get(
    "/monitoring/status",
    tags=["Monitoring"],
)
def monitoring_status():

    return monitor_service.status()