import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.routers import auth, detection, traffic

app = FastAPI(
    title="NetShield AI - Network Anomaly Detection & Threat Monitoring API",
    description="AI-Powered Cybersecurity Platform utilizing CICIDS2017 and UNSW-NB15 Dual-Model Engine",
    version="1.0.0"
)

# Enable CORS for Next.js / React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router)
app.include_router(detection.router)
app.include_router(traffic.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "system": "NetShield AI Threat Monitoring System",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
