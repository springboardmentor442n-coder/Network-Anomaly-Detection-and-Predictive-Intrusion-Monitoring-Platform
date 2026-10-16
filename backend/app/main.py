"""NetShield AI backend - FastAPI application entry point.

Run locally with:
    uvicorn app.main:app --reload --port 8000
from the ``backend/`` directory (after activating the virtual environment).
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .alerts import init_db as _init_alerts_db
from .config import APP_NAME, APP_VERSION, CORS_ORIGINS
from .ml.schema_utils import DataValidationError
from .routers import alerts as alerts_router
from .routers import datasets as datasets_router
from .routers import detection as detection_router
from .routers import models as models_router
from .routers import system as system_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("netshield")

app = FastAPI(
    title=f"{APP_NAME} API",
    version=APP_VERSION,
    description=(
        "Machine-learning backend for the NetShield AI network anomaly detection "
        "and intrusion monitoring system (UNSW-NB15)."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    _init_alerts_db()
    logger.info("%s backend %s ready", APP_NAME, APP_VERSION)


@app.exception_handler(DataValidationError)
async def _validation_error(_: Request, exc: DataValidationError) -> JSONResponse:
    # Mirrored under "detail" so the error envelope matches FastAPI's own
    # HTTPException responses - the frontend only ever has to read one shape.
    return JSONResponse(status_code=400, content={"detail": jsonable_encoder(exc.as_dict())})


@app.exception_handler(RequestValidationError)
async def _request_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=jsonable_encoder(
            {
                "detail": {
                    "error": "invalid_request",
                    "message": "The request payload failed validation.",
                    "details": exc.errors(),
                }
            }
        ),
    )


@app.exception_handler(FileNotFoundError)
async def _not_found(_: Request, exc: FileNotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={"error": "not_found", "message": str(exc) or "Resource not found."},
    )


@app.exception_handler(ValueError)
async def _value_error(_: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"error": "bad_request", "message": str(exc)})


app.include_router(system_router.router, prefix="/api")
app.include_router(datasets_router.router, prefix="/api")
app.include_router(models_router.router, prefix="/api")
app.include_router(detection_router.router, prefix="/api")
app.include_router(alerts_router.router, prefix="/api")


@app.get("/")
def root() -> dict:
    return {
        "app": APP_NAME,
        "version": APP_VERSION,
        "docs": "/docs",
        "api": "/api/health",
        "note": "This is the ML backend. The UI is served by the Next.js frontend.",
    }
