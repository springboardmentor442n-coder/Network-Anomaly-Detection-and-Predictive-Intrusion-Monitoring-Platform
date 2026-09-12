from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.prediction import router as prediction_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.auth import router as auth_router


app = FastAPI(
    title="NetShield AI",
    description="AI-Powered Network Anomaly Detection and Predictive Intrusion Monitoring Platform",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(prediction_router)
app.include_router(alerts_router)
app.include_router(auth_router)


@app.get("/")
def root():
    return {
        "message": "NetShield AI API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }