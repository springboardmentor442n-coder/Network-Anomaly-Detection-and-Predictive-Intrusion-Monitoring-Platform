"""Central configuration and filesystem layout for the NetShield AI backend.

All artefacts written by the backend live under ``backend/storage`` which is
git-ignored. The project-level ``data/`` directory (the sibling of ``backend``)
is treated as a read-only location where the user may drop the official
UNSW-NB15 CSV files.
"""

from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "NetShield AI"
APP_VERSION = "1.0.0"

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent


def _resolve(env_var: str, default: Path) -> Path:
    """Allow the storage/data locations to be relocated (tests, deployment)."""
    raw = os.environ.get(env_var)
    return Path(raw).expanduser().resolve() if raw else default


STORAGE_DIR = _resolve("NETSHIELD_STORAGE_DIR", BACKEND_DIR / "storage")
DATASETS_DIR = STORAGE_DIR / "datasets"
MODELS_DIR = STORAGE_DIR / "models"
EVALUATIONS_DIR = STORAGE_DIR / "evaluations"
DETECTIONS_DIR = STORAGE_DIR / "detections"
ALERTS_DB_PATH = STORAGE_DIR / "alerts.db"

# Read-only location for the official dataset files (UNSW-NB15_training-set.csv etc.)
PROJECT_DATA_DIR = _resolve("NETSHIELD_DATA_DIR", PROJECT_ROOT / "data")

for _directory in (STORAGE_DIR, DATASETS_DIR, MODELS_DIR, EVALUATIONS_DIR, DETECTIONS_DIR):
    _directory.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Upload / parsing limits
# ---------------------------------------------------------------------------
MAX_UPLOAD_BYTES = 200 * 1024 * 1024  # 200 MB hard limit for a single upload
ALLOWED_EXTENSIONS = {".csv"}
MAX_ALERT_ROWS = 5000  # safety cap when materialising alerts from a detection run
MAX_DETECTION_EXPORT_ROWS = 200_000

# ---------------------------------------------------------------------------
# Feature-handling constants
# ---------------------------------------------------------------------------
BINARY_TARGET_CANDIDATES = ("label",)
MULTICLASS_TARGET_CANDIDATES = ("attack_cat", "attack_category")

# Columns that must never be used as model input features.
IDENTIFIER_COLUMNS = ("id",)
NON_FEATURE_COLUMNS = set(BINARY_TARGET_CANDIDATES) | set(MULTICLASS_TARGET_CANDIDATES) | set(
    IDENTIFIER_COLUMNS
)

RANDOM_STATE = 42

ALGORITHMS = ("random_forest", "decision_tree", "logistic_regression")

ALGORITHM_LABELS = {
    "random_forest": "Random Forest",
    "decision_tree": "Decision Tree",
    "logistic_regression": "Logistic Regression",
}

TARGET_LABELS = {
    "label": "Binary (label)",
    "attack_cat": "Multiclass (attack_cat)",
}

# CORS origins allowed to talk to the API (local Next.js dev + prod build).
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
