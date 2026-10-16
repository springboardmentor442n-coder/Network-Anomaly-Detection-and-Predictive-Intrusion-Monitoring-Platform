"""A tiny in-process job registry so long running operations (model training,
bulk detection) can report progress to the UI via polling.

Jobs are intentionally ephemeral: they live in memory only and the most recent
``_MAX_JOBS`` entries are kept. Model artefacts themselves are persisted to
disk by the training/detection modules, so losing a job record never loses a
trained model.
"""

from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

_MAX_JOBS = 60


@dataclass
class Job:
    id: str
    kind: str
    status: str = "queued"  # queued | running | succeeded | failed
    progress: int = 0
    message: str = ""
    error: str | None = None
    result: dict[str, Any] | None = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": self.kind,
            "status": self.status,
            "progress": self.progress,
            "message": self.message,
            "error": self.error,
            "result": self.result,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }


class JobManager:
    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._order: list[str] = []
        self._lock = threading.Lock()

    def create(self, kind: str) -> Job:
        job = Job(id=uuid.uuid4().hex[:12], kind=kind)
        with self._lock:
            self._jobs[job.id] = job
            self._order.append(job.id)
            while len(self._order) > _MAX_JOBS:
                stale = self._order.pop(0)
                self._jobs.pop(stale, None)
        return job

    def update(self, job_id: str, **changes: Any) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            for key, value in changes.items():
                setattr(job, key, value)
            job.updated_at = time.time()

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            return self._jobs.get(job_id)

    def list_recent(self, limit: int = 10) -> list[Job]:
        with self._lock:
            ids = list(reversed(self._order))[:limit]
            return [self._jobs[i] for i in ids if i in self._jobs]


JOBS = JobManager()
