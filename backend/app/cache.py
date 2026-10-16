"""A tiny mtime-keyed DataFrame cache.

Re-reading a 175k-row UNSW-NB15 CSV on every pagination request would make the
table unusable, so the most recently used frames are kept in memory. The cache
is keyed by ``(path, mtime)`` so an edited file is never served from stale data.
"""

from __future__ import annotations

import threading
from collections import OrderedDict
from pathlib import Path

import pandas as pd

from .ml.schema_utils import read_csv

_MAX_FRAMES = 3
_lock = threading.RLock()
_cache: "OrderedDict[str, tuple[float, pd.DataFrame]]" = OrderedDict()


def _key(path: Path) -> str:
    return str(path.resolve())


def load_frame(path: Path) -> pd.DataFrame:
    key = _key(path)
    mtime = path.stat().st_mtime
    with _lock:
        cached = _cache.get(key)
        if cached and cached[0] == mtime:
            _cache.move_to_end(key)
            return cached[1]

    frame = read_csv(path)

    with _lock:
        _cache[key] = (mtime, frame)
        _cache.move_to_end(key)
        while len(_cache) > _MAX_FRAMES:
            _cache.popitem(last=False)
    return frame


def invalidate(path: Path) -> None:
    with _lock:
        _cache.pop(_key(path), None)
