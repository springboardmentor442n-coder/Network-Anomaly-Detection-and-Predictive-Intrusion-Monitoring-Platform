"""
NetShield AI application entry point.

Wires up logging, the database schema, CORS, structured error handling and all
API routes.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api import router
from .core.config import settings
from .core.errors import (
    AuthenticationError,
    AuthorizationError,
    ConfigurationError,
    DatabaseError,
    IntegrationError,
    ModelError,
    NetShieldError,
    NotFoundError,
    ValidationError,
)
from .database import Base, engine

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    description=(
        "Network Anomaly Detection & Predictive Intrusion Monitoring Platform. "
        "Detection, risk scoring, alerting, incident management, threat "
        "intelligence and reporting over the local CICIDS2017 corpus."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------- error handling --
_STATUS_BY_ERROR = {
    AuthenticationError: status.HTTP_401_UNAUTHORIZED,
    AuthorizationError: status.HTTP_403_FORBIDDEN,
    NotFoundError: status.HTTP_404_NOT_FOUND,
    ValidationError: status.HTTP_400_BAD_REQUEST,
    ModelError: status.HTTP_503_SERVICE_UNAVAILABLE,
    ConfigurationError: status.HTTP_503_SERVICE_UNAVAILABLE,
    IntegrationError: status.HTTP_502_BAD_GATEWAY,
    DatabaseError: status.HTTP_500_INTERNAL_SERVER_ERROR,
}


@app.exception_handler(NetShieldError)
async def netshield_error_handler(request: Request, exc: NetShieldError) -> JSONResponse:
    """Return a structured body for every domain error."""
    status_code = _STATUS_BY_ERROR.get(type(exc), status.HTTP_500_INTERNAL_SERVER_ERROR)
    if status_code >= 500:
        logger.error("%s on %s: %s", exc.code, request.url.path, exc.message)
    return JSONResponse(
        status_code=status_code,
        content={"error": exc.message, "code": exc.code, "details": exc.details},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Flatten FastAPI validation errors into field/message pairs for the UI."""
    fields = []
    for error in exc.errors():
        location = [str(part) for part in error.get("loc", []) if part != "body"]
        fields.append(
            {"field": ".".join(location) or "body", "message": error.get("msg", "Invalid value")}
        )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Request validation failed",
            "code": "VALIDATION_ERROR",
            "details": {"fields": fields},
        },
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Last-resort handler.

    Logs the full exception server-side but never leaks internals to the client
    unless debug mode is explicitly enabled.
    """
    logger.exception("Unhandled error on %s", request.url.path)
    detail = {"exception": str(exc)} if settings.debug else {}
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "code": "INTERNAL_ERROR",
            "details": detail,
        },
    )


app.include_router(router)


@app.on_event("startup")
async def log_configuration() -> None:
    """Surface configuration warnings at boot rather than at first failure."""
    logger.info("Starting %s (environment=%s)", settings.app_name, settings.environment)
    if settings.jwt_secret_is_default:
        logger.warning(
            "NETSHIELD_JWT_SECRET is the built-in default. Set a unique secret "
            "before exposing this deployment."
        )
    if settings.is_production and settings.cors_origins == ["*"]:
        logger.warning(
            "Production environment with CORS open to all origins. "
            "Set NETSHIELD_CORS_ORIGINS."
        )
    if settings.is_production and settings.database_url.startswith("sqlite"):
        logger.warning(
            "Production environment using SQLite. Configure PostgreSQL via "
            "NETSHIELD_DATABASE_URL."
        )
