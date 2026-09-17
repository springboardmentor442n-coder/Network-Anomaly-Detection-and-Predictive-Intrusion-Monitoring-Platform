"""
Live packet capture data source (Scapy-backed, optional).

Design constraints honoured here:

* Importing this module never requires Scapy, Npcap or root - the dependency is
  probed lazily and reported through ``status()``.
* Starting the dashboard never requires administrator privileges.
* Captured packets are aggregated into *flows* and only the features that can
  genuinely be derived from a sniffed packet are populated. Every feature the
  trained CICIDS2017 model expects but which cannot be observed is listed in
  ``missing_features`` - no value is ever fabricated to fill the vector.

Because of that last point a live flow is normally **not** ``model_ready``. The
API therefore refuses to score live flows against the CICIDS2017 classifier and
directs callers to the CSV replay source instead, which carries the real feature
set. This is the "safe fallback/replay mode" required by the specification.
"""

from __future__ import annotations

import logging
import platform
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Iterator, List, Optional

from .base import FlowEvent, NetworkDataSource, SourceStatus

logger = logging.getLogger(__name__)

# Features that a sniffed packet genuinely provides.
_OBSERVABLE = {
    "Protocol",
    "Src Port",
    "Dst Port",
    "Flow Duration",
    "Total Fwd Packet",
    "Total Bwd packets",
    "Total Length of Fwd Packet",
    "Total Length of Bwd Packet",
    "Flow Bytes/s",
    "Flow Packets/s",
    "FIN Flag Count",
    "SYN Flag Count",
    "RST Flag Count",
    "PSH Flag Count",
    "ACK Flag Count",
    "URG Flag Count",
}


def scapy_available() -> tuple[bool, Optional[str]]:
    """Probe for Scapy plus a usable capture backend."""
    try:
        import scapy.all  # noqa: F401
    except ImportError:
        return False, (
            "Scapy is not installed. Install with 'pip install scapy'. "
            "On Windows, Npcap (https://npcap.com) is also required."
        )
    except Exception as exc:  # noqa: BLE001
        return False, f"Scapy import failed: {exc}"

    if platform.system() == "Windows":
        try:
            from scapy.arch.windows import get_windows_if_list

            if not get_windows_if_list():
                return False, (
                    "No capture interfaces found. Install Npcap "
                    "(https://npcap.com) and run with sufficient privileges."
                )
        except Exception as exc:  # noqa: BLE001
            return False, (
                f"Windows capture backend unavailable ({exc}). "
                "Npcap (https://npcap.com) is required for live capture on Windows."
            )
    return True, None


@dataclass
class _FlowAccumulator:
    """Aggregates packets belonging to one 5-tuple into flow-level counters."""

    protocol: str
    source_ip: str
    destination_ip: str
    source_port: int
    destination_port: int
    first_seen: float
    last_seen: float
    fwd_packets: int = 0
    bwd_packets: int = 0
    fwd_bytes: int = 0
    bwd_bytes: int = 0
    flags: Dict[str, int] = field(default_factory=lambda: defaultdict(int))

    @property
    def duration_us(self) -> float:
        return max((self.last_seen - self.first_seen) * 1_000_000, 0.0)

    def to_event(self, source_name: str, model_features: List[str]) -> FlowEvent:
        duration_seconds = max(self.last_seen - self.first_seen, 1e-6)
        total_packets = self.fwd_packets + self.bwd_packets
        total_bytes = self.fwd_bytes + self.bwd_bytes

        observed: Dict[str, Any] = {
            "Protocol": self.protocol,
            "Src Port": self.source_port,
            "Dst Port": self.destination_port,
            "Flow Duration": self.duration_us,
            "Total Fwd Packet": self.fwd_packets,
            "Total Bwd packets": self.bwd_packets,
            "Total Length of Fwd Packet": self.fwd_bytes,
            "Total Length of Bwd Packet": self.bwd_bytes,
            "Flow Bytes/s": total_bytes / duration_seconds,
            "Flow Packets/s": total_packets / duration_seconds,
            "FIN Flag Count": self.flags.get("F", 0),
            "SYN Flag Count": self.flags.get("S", 0),
            "RST Flag Count": self.flags.get("R", 0),
            "PSH Flag Count": self.flags.get("P", 0),
            "ACK Flag Count": self.flags.get("A", 0),
            "URG Flag Count": self.flags.get("U", 0),
        }

        # Only expose features the model actually expects, and record the gap.
        if model_features:
            features = {
                name: value for name, value in observed.items() if name in model_features
            }
            missing = [name for name in model_features if name not in features]
        else:
            features = observed
            missing = []

        flag_text = "".join(
            flag for flag in ("F", "S", "R", "P", "A", "U") if self.flags.get(flag)
        )

        return FlowEvent(
            source=source_name,
            timestamp=datetime.fromtimestamp(self.last_seen, timezone.utc).isoformat(),
            protocol=self.protocol,
            source_ip=self.source_ip,
            destination_ip=self.destination_ip,
            source_port=self.source_port,
            destination_port=self.destination_port,
            packet_count=total_packets,
            byte_count=total_bytes,
            flow_duration=self.duration_us,
            tcp_flags=flag_text or None,
            label=None,
            features=features,
            missing_features=missing,
        )


class PacketCaptureDataSource(NetworkDataSource):
    """Live capture source. Inert until explicitly enabled and dependencies exist."""

    name = "packet_capture"
    kind = "live"

    def __init__(
        self,
        enabled: bool = False,
        interface: Optional[str] = None,
        bpf_filter: Optional[str] = None,
        model_features: Optional[List[str]] = None,
    ):
        self.enabled = enabled
        self.interface = interface
        self.bpf_filter = bpf_filter
        self.model_features = model_features or []

    def status(self) -> SourceStatus:
        if not self.enabled:
            return SourceStatus(
                name=self.name,
                available=False,
                kind=self.kind,
                reason=(
                    "Live packet capture is disabled. Set NETSHIELD_CAPTURE_ENABLED=true "
                    "to enable it."
                ),
                details={"enabled": False, "platform": platform.system()},
            )

        ok, reason = scapy_available()
        if not ok:
            return SourceStatus(
                name=self.name,
                available=False,
                kind=self.kind,
                reason=reason,
                details={"enabled": True, "platform": platform.system()},
            )

        return SourceStatus(
            name=self.name,
            available=True,
            kind=self.kind,
            details={
                "enabled": True,
                "platform": platform.system(),
                "interface": self.interface or "default",
                "bpf_filter": self.bpf_filter,
                "model_ready_events": False,
                "note": (
                    "Live flows expose only observable features; they are not scored "
                    "against the CICIDS2017 model. Use the csv_replay source for scoring."
                ),
            },
        )

    def iter_flows(self, limit: int = 20, timeout: int = 5) -> Iterator[FlowEvent]:
        status = self.status()
        if not status.available:
            return

        from scapy.all import sniff  # imported lazily on purpose
        from scapy.layers.inet import IP, TCP, UDP

        flows: Dict[tuple, _FlowAccumulator] = {}

        def handle(packet) -> None:  # pragma: no cover - requires live NIC
            if IP not in packet:
                return
            ip_layer = packet[IP]
            protocol = "TCP" if TCP in packet else "UDP" if UDP in packet else str(ip_layer.proto)
            sport = int(packet[TCP].sport) if TCP in packet else (
                int(packet[UDP].sport) if UDP in packet else 0
            )
            dport = int(packet[TCP].dport) if TCP in packet else (
                int(packet[UDP].dport) if UDP in packet else 0
            )

            forward_key = (protocol, ip_layer.src, ip_layer.dst, sport, dport)
            reverse_key = (protocol, ip_layer.dst, ip_layer.src, dport, sport)
            now = time.time()
            size = len(packet)

            if reverse_key in flows:
                accumulator = flows[reverse_key]
                accumulator.bwd_packets += 1
                accumulator.bwd_bytes += size
                accumulator.last_seen = now
            else:
                accumulator = flows.get(forward_key)
                if accumulator is None:
                    accumulator = _FlowAccumulator(
                        protocol=protocol,
                        source_ip=ip_layer.src,
                        destination_ip=ip_layer.dst,
                        source_port=sport,
                        destination_port=dport,
                        first_seen=now,
                        last_seen=now,
                    )
                    flows[forward_key] = accumulator
                accumulator.fwd_packets += 1
                accumulator.fwd_bytes += size
                accumulator.last_seen = now

            if TCP in packet:
                for flag in str(packet[TCP].flags):
                    accumulator.flags[flag] += 1

        try:
            sniff(
                iface=self.interface,
                filter=self.bpf_filter,
                prn=handle,
                timeout=timeout,
                store=False,
                count=limit * 20,
            )
        except PermissionError:
            logger.warning("Packet capture requires elevated privileges; yielding nothing")
            return
        except Exception as exc:  # noqa: BLE001 - capture failure must degrade, not crash
            logger.warning("Packet capture failed: %s", exc)
            return

        for accumulator in list(flows.values())[:limit]:
            yield accumulator.to_event(self.name, self.model_features)
