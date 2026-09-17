"""
Real-time streaming routes (WebSocket + Server-Sent Events + polling fallback).

Three transports for the same event bus, in decreasing order of preference:

  * ``GET /api/stream/ws``     WebSocket. Token passed as a query parameter
                               because browsers cannot set headers on WS.
  * ``GET /api/stream/sse``    Server-Sent Events.
  * ``GET /api/stream/events`` Plain polling over the bus's ring buffer, for
                               environments where neither of the above works.

A transport failure never takes down the API - the client simply falls back to
polling.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..core.security import decode_access_token
from ..database import SessionLocal, get_db
from ..models import User
from ..services import event_bus
from .dependencies import current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stream", tags=["stream"])

HEARTBEAT_SECONDS = 20


def _authenticate_token(token: Optional[str]) -> Optional[User]:
    """Resolve a token to an active user. Used by transports that cannot send headers."""
    if not token:
        return None
    db: Session = SessionLocal()
    try:
        payload = decode_access_token(token)
        return (
            db.query(User)
            .filter(User.email == payload["sub"], User.is_active.is_(True))
            .first()
        )
    except (jwt.PyJWTError, KeyError):
        return None
    finally:
        db.close()


@router.get("/status")
def stream_status(user: User = Depends(current_user)):
    """Transport availability and bus state, so the UI can pick a transport."""
    return {
        "websocket": {"available": True, "path": "/api/stream/ws"},
        "sse": {"available": True, "path": "/api/stream/sse"},
        "polling": {"available": True, "path": "/api/stream/events"},
        "subscribers": event_bus.subscriber_count,
        "last_event_id": event_bus.last_event_id,
    }


@router.get("/events")
def poll_events(
    user: User = Depends(current_user),
    since_id: Optional[int] = Query(None, description="Return events with id greater than this"),
    limit: int = Query(50, ge=1, le=200),
):
    """Polling fallback: recent events from the in-memory ring buffer."""
    events = event_bus.recent(since_id=since_id, limit=limit)
    return {
        "events": events,
        "last_event_id": event_bus.last_event_id,
        "count": len(events),
    }


@router.get("/sse")
async def sse(request: Request, token: str = Query(...)):
    """Server-Sent Events stream. Authenticated via ``token`` query parameter."""
    user = _authenticate_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    queue = event_bus.subscribe()

    async def generator():
        try:
            yield f": connected as {user.email}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=HEARTBEAT_SECONDS)
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
                    continue
                yield f"id: {event['id']}\nevent: {event['type']}\ndata: {json.dumps(event, default=str)}\n\n"
        except asyncio.CancelledError:  # pragma: no cover - client disconnect
            raise
        except Exception as exc:  # noqa: BLE001
            logger.debug("SSE stream ended: %s", exc)
        finally:
            event_bus.unsubscribe(queue)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(default="")):
    """WebSocket stream. Authenticated via ``token`` query parameter."""
    user = _authenticate_token(token)
    if user is None:
        await websocket.close(code=4401)
        return

    await websocket.accept()
    queue = event_bus.subscribe()
    try:
        await websocket.send_json(
            {"type": "connected", "data": {"user": user.email, "role": user.role}}
        )
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=HEARTBEAT_SECONDS)
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "heartbeat", "data": {}})
                continue
            await websocket.send_json(event)
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001 - a transport error must not bubble up
        logger.debug("WebSocket stream ended: %s", exc)
    finally:
        event_bus.unsubscribe(queue)
