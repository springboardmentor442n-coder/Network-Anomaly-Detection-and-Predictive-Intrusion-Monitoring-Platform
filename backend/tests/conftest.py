"""Shared pytest fixtures for the NetShield AI backend test-suite.

Every test runs against a throw-away storage directory and a throw-away
``data/`` directory, so tests never touch real user artefacts and never
depend on the official UNSW-NB15 files being present.

The CSVs created here are deliberately tiny, synthetic and safe. They are
*not* UNSW-NB15 and must never be used to claim real-world performance.
"""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# ---------------------------------------------------------------------------
# Redirect all backend writes into temporary directories *before* importing
# any application module (config reads these at import time).
# ---------------------------------------------------------------------------
_TMP_ROOT = Path(tempfile.mkdtemp(prefix="netshield-tests-"))
os.environ["NETSHIELD_STORAGE_DIR"] = str(_TMP_ROOT / "storage")
os.environ["NETSHIELD_DATA_DIR"] = str(_TMP_ROOT / "data")

from app.alerts import init_db, reset_database  # noqa: E402
from app.config import DETECTIONS_DIR, PROJECT_DATA_DIR  # noqa: E402

PROJECT_DATA_DIR.mkdir(parents=True, exist_ok=True)
DETECTIONS_DIR.mkdir(parents=True, exist_ok=True)

CATEGORIES = ["Normal", "Generic", "Exploits", "DoS", "Fuzzers", "Reconnaissance"]
PROTOCOLS = ["tcp", "udp", "arp"]
SERVICES = ["http", "dns", "ftp", "smtp", "-"]
STATES = ["FIN", "CON", "INT", "REQ"]

NUMERIC_FEATURES = [
    "dur",
    "spkts",
    "dpkts",
    "sbytes",
    "dbytes",
    "rate",
    "sttl",
    "dttl",
    "sload",
    "dload",
    "sinpkt",
    "dinpkt",
    "ct_srv_src",
    "ct_dst_ltm",
    "ct_src_dport_ltm",
    "ct_dst_sport_ltm",
    "ct_dst_src_ltm",
]

CATEGORICAL_FEATURES = ["proto", "service", "state"]


def _make_frame(rows: int, seed: int, with_labels: bool = True, with_id: bool = True) -> pd.DataFrame:
    """Build a small, deterministic, synthetic traffic frame."""
    rng = np.random.default_rng(seed)
    data: dict[str, object] = {}
    if with_id:
        data["id"] = np.arange(1, rows + 1)

    data["dur"] = rng.gamma(2.0, 0.4, rows).round(6)
    data["spkts"] = rng.integers(1, 40, rows)
    data["dpkts"] = rng.integers(0, 40, rows)
    data["sbytes"] = rng.integers(40, 9000, rows)
    data["dbytes"] = rng.integers(0, 12000, rows)
    data["rate"] = rng.gamma(2.0, 200.0, rows).round(4)
    data["sttl"] = rng.choice([0, 31, 62, 254], rows)
    data["dttl"] = rng.choice([0, 29, 60, 252], rows)
    data["sload"] = rng.gamma(2.0, 5000.0, rows).round(3)
    data["dload"] = rng.gamma(2.0, 5000.0, rows).round(3)
    data["sinpkt"] = rng.gamma(2.0, 20.0, rows).round(6)
    data["dinpkt"] = rng.gamma(2.0, 20.0, rows).round(6)
    data["ct_srv_src"] = rng.integers(1, 30, rows)
    data["ct_dst_ltm"] = rng.integers(1, 30, rows)
    data["ct_src_dport_ltm"] = rng.integers(1, 15, rows)
    data["ct_dst_sport_ltm"] = rng.integers(1, 15, rows)
    data["ct_dst_src_ltm"] = rng.integers(1, 30, rows)

    data["proto"] = rng.choice(PROTOCOLS, rows)
    data["service"] = rng.choice(SERVICES, rows)
    data["state"] = rng.choice(STATES, rows)

    if with_labels:
        categories = rng.choice(CATEGORIES, rows, p=[0.5, 0.12, 0.12, 0.12, 0.08, 0.06])
        data["attack_cat"] = categories
        data["label"] = np.where(pd.Series(categories) == "Normal", 0, 1)

    frame = pd.DataFrame(data)
    # Introduce a small amount of missing data so imputation is exercised.
    if rows > 20:
        frame.loc[frame.index[:3], "sload"] = np.nan
        frame.loc[frame.index[3:5], "service"] = np.nan
    # A couple of duplicated rows so duplicate detection can be tested.
    if rows > 40:
        frame = pd.concat([frame, frame.iloc[:2]], ignore_index=True)
    return frame


def write_csv(frame: pd.DataFrame, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(path, index=False)
    return path


@pytest.fixture(scope="session")
def frames() -> dict[str, pd.DataFrame]:
    return {
        "training": _make_frame(160, seed=11),
        "testing": _make_frame(80, seed=22),
        "traffic": _make_frame(30, seed=33, with_labels=False),
        "unlabelled": _make_frame(40, seed=44, with_labels=False, with_id=False),
    }


@pytest.fixture()
def data_paths(frames) -> dict[str, Path]:
    """CSV files written into the temporary ``data/`` directory."""
    paths = {
        "training": write_csv(frames["training"], PROJECT_DATA_DIR / "_test_training-set.csv"),
        "testing": write_csv(frames["testing"], PROJECT_DATA_DIR / "_test_testing-set.csv"),
        "traffic": write_csv(frames["traffic"], PROJECT_DATA_DIR / "_test_traffic.csv"),
    }
    return paths


@pytest.fixture()
def tiny_csv(tmp_path, frames) -> Path:
    return write_csv(frames["training"].head(40), tmp_path / "tiny.csv")


@pytest.fixture(autouse=True)
def _clean_state():
    """Guarantee every test starts with an empty alert database."""
    init_db()
    reset_database()
    yield


@pytest.fixture()
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
