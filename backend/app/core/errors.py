"""
Custom exceptions and error handling for NetShield AI.
"""

from typing import Optional, Any, Dict


class NetShieldError(Exception):
    """Base exception for NetShield AI."""
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(self.message)


class AuthenticationError(NetShieldError):
    """Raised when authentication fails."""
    def __init__(self, message: str = "Authentication failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "AUTH_ERROR", details)


class AuthorizationError(NetShieldError):
    """Raised when authorization fails (insufficient permissions)."""
    def __init__(self, message: str = "Insufficient permissions", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "AUTHZ_ERROR", details)


class ValidationError(NetShieldError):
    """Raised when input validation fails."""
    def __init__(self, message: str, field: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        if details is None:
            details = {}
        if field:
            details["field"] = field
        super().__init__(message, "VALIDATION_ERROR", details)


class ModelError(NetShieldError):
    """Raised when ML model operation fails."""
    def __init__(self, message: str = "Model error", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "MODEL_ERROR", details)


class DatabaseError(NetShieldError):
    """Raised when database operation fails."""
    def __init__(self, message: str = "Database error", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "DATABASE_ERROR", details)


class NotFoundError(NetShieldError):
    """Raised when a resource is not found."""
    def __init__(self, resource: str, identifier: Any, details: Optional[Dict[str, Any]] = None):
        if details is None:
            details = {}
        details["resource"] = resource
        details["identifier"] = str(identifier)
        super().__init__(f"{resource} not found: {identifier}", "NOT_FOUND", details)


class ConfigurationError(NetShieldError):
    """Raised when configuration is missing or invalid."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "CONFIG_ERROR", details)


class IntegrationError(NetShieldError):
    """Raised when external integration fails."""
    def __init__(self, service: str, message: str, recoverable: bool = False, details: Optional[Dict[str, Any]] = None):
        if details is None:
            details = {}
        details["service"] = service
        details["recoverable"] = recoverable
        super().__init__(f"{service}: {message}", "INTEGRATION_ERROR", details)
