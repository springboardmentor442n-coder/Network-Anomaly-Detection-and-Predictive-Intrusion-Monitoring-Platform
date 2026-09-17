"""
Dataset-backed data sources.

``CICIDS2017DataSource`` reads the local WTMC2021/CICIDS2017 CSVs in chunks and
emits fully-featured flow events - these are the only events that can be fed
directly to the trained model, because the feature names match training exactly.

``CSVReplayDataSource`` walks the same corpus sequentially with a cursor so the
dashboard can demonstrate real-time-like detection on a static dataset.
"""

from __future__ import annotations

import logging
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

import pandas as pd

from .base import FlowEvent, NetworkDataSource, SourceStatus
from ..ml.data_loader import (
    discover_dataset_files,
    find_label_column,
    iter_dataset_chunks,
)

logger = logging.getLogger(__name__)

# Columns excluded from the model feature vector (identity / capture-time leakage).
_IDENTITY_COLUMNS = {
    "id",
    "Flow ID",
    "Timestamp",
    "Src IP",
    "Dst IP",
    "Source IP",
    "Destination IP",
    "Source_File",
}


def _clean_value(value: Any) -> Any:
    """Make a CSV cell JSON-safe without changing its meaning."""
    if value is None:
        return None
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:  # noqa: BLE001
            return value
    return value


def _first_column(row: pd.Series, names: List[str]) -> Optional[Any]:
    for name in names:
        if name in row.index:
            value = _clean_value(row[name])
            if value is not None:
                return value
    return None


def _row_to_event(
    row: pd.Series, label_column: str, source_name: str
) -> FlowEvent:
    features: Dict[str, Any] = {}
    for column, value in row.items():
        if column == label_column or column in _IDENTITY_COLUMNS:
            continue
        features[str(column)] = _clean_value(value)

    timestamp = _first_column(row, ["Timestamp"])
    return FlowEvent(
        source=source_name,
        timestamp=str(timestamp) if timestamp else datetime.now(timezone.utc).isoformat(),
        protocol=str(_first_column(row, ["Protocol"]) or "") or None,
        source_ip=_first_column(row, ["Src IP", "Source IP"]),
        destination_ip=_first_column(row, ["Dst IP", "Destination IP"]),
        source_port=_first_column(row, ["Src Port", "Source Port"]),
        destination_port=_first_column(row, ["Dst Port", "Destination Port"]),
        packet_count=_first_column(row, ["Total Fwd Packet", "Total Fwd Packets"]),
        byte_count=_first_column(row, ["Total Length of Fwd Packet"]),
        flow_duration=_first_column(row, ["Flow Duration"]),
        tcp_flags=None,
        label=str(row[label_column]).strip() if label_column in row.index else None,
        features=features,
        missing_features=[],
    )


class CICIDS2017DataSource(NetworkDataSource):
    """Chunked reader over the local CICIDS2017 corpus."""

    name = "cicids2017"
    kind = "dataset"

    def __init__(self, data_root: Path, dataset: str = "cicids2017"):
        self.data_root = Path(data_root)
        self.dataset = dataset

    def _files(self) -> List[Path]:
        return discover_dataset_files(self.data_root, self.dataset)

    def status(self) -> SourceStatus:
        files = self._files()
        if not files:
            return SourceStatus(
                name=self.name,
                available=False,
                kind=self.kind,
                reason=(
                    f"No {self.dataset} CSV files found under {self.data_root}. "
                    "See data/README.md for placement instructions."
                ),
                details={"data_root": str(self.data_root), "file_count": 0},
            )
        return SourceStatus(
            name=self.name,
            available=True,
            kind=self.kind,
            details={
                "data_root": str(self.data_root),
                "file_count": len(files),
                "files": [path.name for path in files],
            },
        )

    def iter_flows(self, limit: int = 50) -> Iterator[FlowEvent]:
        files = self._files()
        if not files:
            return
        emitted = 0
        for chunk in iter_dataset_chunks(files, chunk_size=max(limit, 1000)):
            label_column = find_label_column(chunk.columns.tolist())
            for _, row in chunk.iterrows():
                yield _row_to_event(row, label_column, self.name)
                emitted += 1
                if emitted >= limit:
                    return


class CSVReplayDataSource(NetworkDataSource):
    """
    Sequential replay over the dataset with a persistent cursor.

    This is the demo mode that makes real-time detection demonstrable without
    live packet capture: each poll advances the cursor and returns the next
    batch of real dataset rows.
    """

    name = "csv_replay"
    kind = "replay"

    def __init__(self, data_root: Path, dataset: str = "cicids2017"):
        self.data_root = Path(data_root)
        self.dataset = dataset
        self._cursor = 0
        self._buffer: List[FlowEvent] = []
        self._buffer_start = 0

    def status(self) -> SourceStatus:
        base = CICIDS2017DataSource(self.data_root, self.dataset).status()
        return SourceStatus(
            name=self.name,
            available=base.available,
            kind=self.kind,
            reason=base.reason,
            details={**base.details, "cursor": self._cursor},
        )

    @property
    def cursor(self) -> int:
        return self._cursor

    def reset(self) -> None:
        self._cursor = 0
        self._buffer = []
        self._buffer_start = 0

    def _ensure_buffer(self, needed: int) -> None:
        """Load a window of rows covering the cursor position."""
        if (
            self._buffer
            and self._buffer_start <= self._cursor
            and self._cursor + needed <= self._buffer_start + len(self._buffer)
        ):
            return

        window = max(needed * 4, 400)
        source = CICIDS2017DataSource(self.data_root, self.dataset)
        events: List[FlowEvent] = []
        skipped = 0
        for event in source.iter_flows(limit=self._cursor + window):
            if skipped < self._cursor:
                skipped += 1
                continue
            events.append(event)
            if len(events) >= window:
                break
        self._buffer = events
        self._buffer_start = self._cursor

    def iter_flows(self, limit: int = 10) -> Iterator[FlowEvent]:
        self._ensure_buffer(limit)
        offset = self._cursor - self._buffer_start
        batch = self._buffer[offset : offset + limit]
        if not batch:
            # Reached the end of the corpus - wrap around so demos keep running.
            self.reset()
            self._ensure_buffer(limit)
            batch = self._buffer[: limit]
        for event in batch:
            event.source = self.name
            self._cursor += 1
            yield event
