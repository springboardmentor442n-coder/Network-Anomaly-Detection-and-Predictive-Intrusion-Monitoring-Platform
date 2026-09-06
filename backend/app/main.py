from fastapi import FastAPI

from app.api.prediction import router as prediction_router


app = FastAPI(
    title="NetShield AI",
    description="AI-Powered Network Anomaly Detection and Predictive Intrusion Monitoring Platform",
    version="1.0.0"
)


app.include_router(
    prediction_router
)


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