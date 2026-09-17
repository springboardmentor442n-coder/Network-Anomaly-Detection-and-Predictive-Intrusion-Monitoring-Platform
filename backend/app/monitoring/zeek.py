"""
Zeek conn.log data source (optional integration).

Reads Zeek's tab-separated ``conn.log`` from ``NETSHIELD_ZEEK_LOG_DIR``. As with
live capture, Zeek fields cover only a subset of the CICIDS2017 feature set, so
events are marked with their missing features rather than being padded with
fabricated values.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

from .base import FlowEvent, NetworkDataSource, SourceStatus

logger = logging.getLogger(__name__)


class ZeekDataSource(NetworkDataSource):
    name = "zeek"
    kind = "sensor"

    def __init__(
        self,
        log_dir: Optional[str] = None,
        model_features: Optional[List[str]] = None,
    ):
        self.log_dir = Path(log_dir) if log_dir else None
        self.model_features = model_features or []

    @property
    def conn_log(self) -> Optional[Path]:
        if not self.log_dir:
            return None
        candidate = self.log_dir / "conn.log"
        return candidate if candidate.exists() else None

    def status(self) -> SourceStatus:
        if not self.log_dir:
            return SourceStatus(
                name=self.name,
                available=False,
                kind=self.kind,
                reason="Zeek is not configured. Set NETSHIELD_ZEEK_LOG_DIR to a directory containing conn.log.",
            )
        if not self.log_dir.exists():
            return SourceStatus(
                name=self.name,
                available=False,
                kind=self.kind,
                reason=f"Zeek log directory does not exist: {self.log_dir}",
                details={"log_dir": str(self.log_dir)},
            )
        if not self.conn_log:
            return SourceStatus(
                name=self.name,
                available=False,
                kind=self.kind,
                reason=f"conn.log not found in {self.log_dir}",
                details={"log_dir": str(self.log_dir)},
            )
        return SourceStatus(
            name=self.name,
            available=True,
            kind=self.kind,
            details={"log_dir": str(self.log_dir), "conn_log": str(self.conn_log)},
        )

    def iter_flows(self, limit: int = 50) -> Iterator[FlowEvent]:
        log_path = self.conn_log
        if not log_path:
            return

        fields: List[str] = []
        emitted = 0
        try:
            with log_path.open("r", encoding="utf-8", errors="replace") as handle:
                for line in handle:
                    line = line.rstrip("\n")
                    if line.startswith("#fields"):
                        fields = line.split("\t")[1:]
                        continue
                    if line.startswith("#") or not line.strip():
                        continue
                    if not fields:
                        continue

                    values = line.split("\t")
                    row = dict(zip(fields, values))
                    event = self._row_to_event(row)
                    if event is None:
                        continue
                    yield event
                    emitted += 1
                    if emitted >= limit:
                        return
        except OSError as exc:
            logger.warning("Failed to read Zeek conn.log: %s", exc)

    # -------------------------------------------------------------- internal --
    def _row_to_event(self, row: Dict[str, str]) -> Optional[FlowEvent]:
        def number(key: str) -> Optional[float]:
            raw = row.get(key)
            if raw in (None, "", "-"):
                return None
            try:
                return float(raw)
            except ValueError:
                return None

        try:
            start = float(row.get("ts", "0") or 0)
        except ValueError:
            start = 0.0

        duration = number("duration") or 0.0
        orig_pkts = number("orig_pkts") or 0
        resp_pkts = number("resp_pkts") or 0
        orig_bytes = number("orig_ip_bytes") or number("orig_bytes") or 0
        resp_bytes = number("resp_ip_bytes") or number("resp_bytes") or 0

        observed: Dict[str, Any] = {
            "Protocol": (row.get("proto") or "").upper() or None,
            "Src Port": int(number("id.orig_p") or 0),
            "Dst Port": int(number("id.resp_p") or 0),
            "Flow Duration": duration * 1_000_000,
            "Total Fwd Packet": int(orig_pkts),
            "Total Bwd packets": int(resp_pkts),
            "Total Length of Fwd Packet": int(orig_bytes),
            "Total Length of Bwd Packet": int(resp_bytes),
        }

        if self.model_features:
            features = {
                name: value for name, value in observed.items() if name in self.model_features
            }
            missing = [name for name in self.model_features if name not in features]
        else:
            features = observed
            missing = []

        return FlowEvent(
            source=self.name,
            timestamp=datetime.fromtimestamp(start or 0, timezone.utc).isoformat(),
            protocol=observed["Protocol"],
            source_ip=row.get("id.orig_h"),
            destination_ip=row.get("id.resp_h"),
            source_port=observed["Src Port"],
            destination_port=observed["Dst Port"],
            packet_count=int(orig_pkts + resp_pkts),
            byte_count=int(orig_bytes + resp_bytes),
            flow_duration=observed["Flow Duration"],
            tcp_flags=row.get("history"),
            label=None,
            features=features,
            missing_features=missing,
        )
