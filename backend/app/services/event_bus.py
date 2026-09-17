"""
In-process event bus for real-time dashboard updates.

Backs both the WebSocket and the Server-Sent Events endpoints. Subscribers get
an asyncio queue; publishing never blocks and never raises, so a detection is
never lost because a browser disconnected.

A bounded ring buffer of recent events lets a client that cannot use
WebSocket/SSE fall back to plain polling and still catch up.
"""

from __future__ import annotations

import asyncio
import logging
from collections import deque
from datetime import datetime, timezone
from typing import Any, Deque, Dict, List, Optional, Set

logger = logging.getLogger(__name__)


class EventBus:
    def __init__(self, history: int = 200, queue_size: int = 100):
        self._subscribers: Set[asyncio.Queue] = set()
        self._history: Deque[Dict[str, Any]] = deque(maxlen=history)
        self._queue_size = queue_size
        self._sequence = 0

    # -------------------------------------------------------------- publish --
    def publish(self, event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Publish an event. Safe to call from sync code (no running loop required).
        """
        self._sequence += 1
        event = {
            "id": self._sequence,
            "type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": payload,
        }
        self._history.append(event)

        for queue in list(self._subscribers):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                # Slow consumer: drop the oldest event for that subscriber only.
                try:
                    queue.get_nowait()
                    queue.put_nowait(event)
                except Exception:  # noqa: BLE001
                    pass
            except Exception as exc:  # noqa: BLE001
                logger.debug("Dropping subscriber after publish error: %s", exc)
                self._subscribers.discard(queue)

        return event

    # ------------------------------------------------------------ subscribe --
    def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=self._queue_size)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        self._subscribers.discard(queue)

    # --------------------------------------------------------------- access --
    def recent(self, since_id: Optional[int] = None, limit: int = 50) -> List[Dict[str, Any]]:
        events = list(self._history)
        if since_id is not None:
            events = [event for event in events if event["id"] > since_id]
        return events[-limit:]

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)

    @property
    def last_event_id(self) -> int:
        return self._sequence


event_bus = EventBus()
