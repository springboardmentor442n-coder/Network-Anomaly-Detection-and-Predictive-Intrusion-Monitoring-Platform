"""
Data source registry.

Holds one instance of each source and reports availability so the API can tell
the dashboard exactly which monitoring modes are usable on this machine.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional

from .base import NetworkDataSource, SourceStatus
from .capture import PacketCaptureDataSource
from .cicids import CICIDS2017DataSource, CSVReplayDataSource
from .zeek import ZeekDataSource
from ..core.config import settings

logger = logging.getLogger(__name__)


def _model_feature_names() -> List[str]:
    """Feature names the active model expects, minus identity columns."""
    try:
        from ..services.ml_service import DetectionService

        metadata = DetectionService(settings.model_root).metadata()
        features = metadata.get("features") or []
        identity = {
            "id",
            "Flow ID",
            "Timestamp",
            "Src IP",
            "Dst IP",
            "Source IP",
            "Destination IP",
        }
        return [name for name in features if name not in identity]
    except Exception as exc:  # noqa: BLE001
        logger.debug("Could not read model features: %s", exc)
        return []


class DataSourceRegistry:
    def __init__(self) -> None:
        model_features = _model_feature_names()
        self._sources: Dict[str, NetworkDataSource] = {
            CICIDS2017DataSource.name: CICIDS2017DataSource(settings.data_root),
            CSVReplayDataSource.name: CSVReplayDataSource(settings.data_root),
            PacketCaptureDataSource.name: PacketCaptureDataSource(
                enabled=settings.capture_enabled,
                interface=settings.capture_interface,
                bpf_filter=settings.capture_bpf_filter,
                model_features=model_features,
            ),
            ZeekDataSource.name: ZeekDataSource(
                log_dir=settings.zeek_log_dir,
                model_features=model_features,
            ),
        }

    # ----------------------------------------------------------------- access --
    def get(self, name: str) -> Optional[NetworkDataSource]:
        return self._sources.get(name)

    def names(self) -> List[str]:
        return list(self._sources)

    def statuses(self) -> List[SourceStatus]:
        results: List[SourceStatus] = []
        for source in self._sources.values():
            try:
                results.append(source.status())
            except Exception as exc:  # noqa: BLE001
                results.append(
                    SourceStatus(
                        name=source.name,
                        available=False,
                        kind=source.kind,
                        reason=f"Status check failed: {exc}",
                    )
                )
        return results

    def default_source(self) -> Optional[NetworkDataSource]:
        """Prefer replay (scoreable) over live capture (partial features)."""
        for name in (CSVReplayDataSource.name, CICIDS2017DataSource.name):
            source = self._sources.get(name)
            if source and source.available:
                return source
        for source in self._sources.values():
            if source.available:
                return source
        return None


registry = DataSourceRegistry()
