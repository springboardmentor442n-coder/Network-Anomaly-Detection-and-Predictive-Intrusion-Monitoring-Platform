from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import auth, users, traffic

# Creates tables if they don't exist yet. Fine for dev; for production you'd
# switch to Alembic migrations (already in requirements.txt for that reason).
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_name,
    description="AI-powered network anomaly detection & threat monitoring platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(traffic.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.app_name}
