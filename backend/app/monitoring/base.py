"""
NetworkDataSource abstraction.

Every monitoring backend (dataset replay, live capture, Zeek) yields the same
``FlowEvent`` shape, so the detection pipeline and the dashboard never need to
know where traffic came from.

Availability is explicit: a source that cannot run (missing dependency, missing
privileges, missing files) reports ``SourceStatus.unavailable`` with a human
readable reason instead of raising at import time or crashing the API.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Dict, Iterator, List, Optional


@dataclass
class SourceStatus:
    """Availability report for a data source."""

    name: str
    available: bool
    kind: str
    reason: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class FlowEvent:
    """
    One network flow observation.

    ``features`` holds the model-ready feature mapping. ``feature_coverage``
    records how complete that mapping is so the UI can distinguish a
    fully-featured dataset row from a partially-observed live flow. Missing
    features are never invented - a source that cannot supply a value leaves it
    out and lists it in ``missing_features``.
    """

    source: str
    timestamp: str
    protocol: Optional[str] = None
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    source_port: Optional[int] = None
    destination_port: Optional[int] = None
    packet_count: Optional[int] = None
    byte_count: Optional[int] = None
    flow_duration: Optional[float] = None
    tcp_flags: Optional[str] = None
    label: Optional[str] = None
    features: Dict[str, Any] = field(default_factory=dict)
    missing_features: List[str] = field(default_factory=list)

    @property
    def feature_coverage(self) -> float:
        total = len(self.features) + len(self.missing_features)
        if total == 0:
            return 0.0
        return round(len(self.features) / total, 4)

    @property
    def model_ready(self) -> bool:
        """True when the event carries every feature the trained model expects."""
        return bool(self.features) and not self.missing_features

    def to_dict(self) -> Dict[str, Any]:
        payload = asdict(self)
        payload["feature_coverage"] = self.feature_coverage
        payload["model_ready"] = self.model_ready
        return payload

    def summary(self) -> Dict[str, Any]:
        """Compact form for dashboards and streams (drops the feature vector)."""
        return {
            "source": self.source,
            "timestamp": self.timestamp,
            "protocol": self.protocol,
            "source_ip": self.source_ip,
            "destination_ip": self.destination_ip,
            "source_port": self.source_port,
            "destination_port": self.destination_port,
            "packet_count": self.packet_count,
            "byte_count": self.byte_count,
            "flow_duration": self.flow_duration,
            "tcp_flags": self.tcp_flags,
            "label": self.label,
            "model_ready": self.model_ready,
            "feature_coverage": self.feature_coverage,
        }


class NetworkDataSource:
    """Base class for all traffic sources."""

    name = "base"
    kind = "abstract"

    # ------------------------------------------------------------ lifecycle --
    def status(self) -> SourceStatus:
        """Report whether this source can currently produce events."""
        raise NotImplementedError

    def iter_flows(self, limit: int = 50) -> Iterator[FlowEvent]:
        """Yield up to ``limit`` flow events."""
        raise NotImplementedError

    # -------------------------------------------------------------- helpers --
    @property
    def available(self) -> bool:
        try:
            return self.status().available
        except Exception:  # noqa: BLE001 - availability checks must never raise
            return False
