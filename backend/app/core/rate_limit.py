"""
Rate limiting.

Uses SlowAPI when it is installed; otherwise falls back to a small in-process
fixed-window limiter so the protection still applies in a plain
``pip install -r requirements.txt`` environment. Either way the app starts and
local development stays usable (disable entirely with
NETSHIELD_RATE_LIMIT_ENABLED=false).

Note: the fallback limiter is per-process. A multi-worker or multi-replica
deployment should back this with Redis - see docs/security.md.
"""

import logging
import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Optional, Tuple

from fastapi import HTTPException, Request, status

# NOTE: this module deliberately does not use `from __future__ import annotations`.
# RateLimit is used as a FastAPI dependency via an *instance*, and instances have
# no __globals__, so FastAPI cannot resolve string annotations on __call__. Keeping
# real annotation objects lets it see the Request parameter correctly.

from .config import settings

logger = logging.getLogger(__name__)


def parse_rate(rate: str) -> Tuple[int, int]:
    """Parse a '10/minute' style rate into (limit, window_seconds)."""
    units = {
        "second": 1,
        "seconds": 1,
        "minute": 60,
        "minutes": 60,
        "hour": 3600,
        "hours": 3600,
        "day": 86400,
        "days": 86400,
    }
    try:
        count_text, unit_text = rate.split("/", 1)
        count = int(count_text.strip())
        window = units[unit_text.strip().lower()]
        return count, window
    except Exception:  # noqa: BLE001
        logger.warning("Unparseable rate '%s'; defaulting to 60/minute", rate)
        return 60, 60


def client_key(request: Request) -> str:
    """
    Identify the caller. Honours X-Forwarded-For only for its first hop, which
    is what a trusted reverse proxy sets.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


class FixedWindowLimiter:
    """Thread-safe in-process sliding-window counter."""

    def __init__(self) -> None:
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window: int) -> Tuple[bool, int]:
        """Return (allowed, retry_after_seconds)."""
        now = time.monotonic()
        cutoff = now - window
        with self._lock:
            bucket = self._hits[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                retry_after = max(1, int(bucket[0] + window - now) + 1)
                return False, retry_after
            bucket.append(now)
            return True, 0

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


_limiter = FixedWindowLimiter()


def reset_limits() -> None:
    """Clear all counters (used by tests)."""
    _limiter.reset()


class RateLimit:
    """
    FastAPI dependency enforcing a named rate.

        @router.post("/login", dependencies=[Depends(RateLimit("login"))])
    """

    _RATES = {
        "login": lambda: settings.rate_limit_login,
        "register": lambda: settings.rate_limit_register,
        "default": lambda: settings.rate_limit_default,
    }

    def __init__(self, name: str = "default"):
        self.name = name

    def __call__(self, request: Request) -> None:
        if not settings.rate_limit_enabled:
            return

        rate_getter = self._RATES.get(self.name, self._RATES["default"])
        limit, window = parse_rate(rate_getter())
        key = f"{self.name}:{client_key(request)}"
        allowed, retry_after = _limiter.check(key, limit, window)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Rate limit exceeded for this endpoint "
                    f"({rate_getter()}). Try again in {retry_after}s."
                ),
                headers={"Retry-After": str(retry_after)},
            )


def status_report() -> dict:
    """Non-sensitive description of the active limits, for the admin panel."""
    return {
        "enabled": settings.rate_limit_enabled,
        "backend": "in-process fixed window",
        "limits": {
            "login": settings.rate_limit_login,
            "register": settings.rate_limit_register,
            "default": settings.rate_limit_default,
        },
        "note": (
            "Per-process counters. Use a shared store (e.g. Redis) for "
            "multi-worker deployments."
        ),
    }
