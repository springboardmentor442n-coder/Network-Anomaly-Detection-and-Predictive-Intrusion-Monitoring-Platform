"""System / health / aggregated-state endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from .. import alerts as alerts_store
from ..config import (
    ALGORITHM_LABELS,
    APP_NAME,
    APP_VERSION,
    MAX_UPLOAD_BYTES,
    PROJECT_DATA_DIR,
    TARGET_LABELS,
)
from ..ml.detection import DEFAULT_SEVERITY_RULES, SEVERITY_DOCUMENTATION
from ..store import (
    get_active_model,
    latest_detection,
    latest_evaluation,
    list_datasets,
    model_public,
    now_iso,
    storage_stats,
    sync_project_datasets,
)

router = APIRouter(tags=["system"])


@router.get("/health")
def health() -> dict:
    try:
        import sklearn

        sklearn_version = sklearn.__version__
    except Exception:  # pragma: no cover
        sklearn_version = None

    return {
        "status": "ok" if sklearn_version else "degraded",
        "app": APP_NAME,
        "version": APP_VERSION,
        "scikitLearn": sklearn_version,
        "time": now_iso(),
    }


@router.get("/meta")
def meta() -> dict:
    return {
        "algorithms": [
            {"id": key, "label": ALGORITHM_LABELS[key]}
            for key in ("random_forest", "decision_tree", "logistic_regression")
        ],
        "targets": [{"id": key, "label": value} for key, value in TARGET_LABELS.items()],
        "severityRules": DEFAULT_SEVERITY_RULES,
        "severityDocumentation": SEVERITY_DOCUMENTATION,
        "limits": {"maxUploadBytes": MAX_UPLOAD_BYTES, "pageSizes": [10, 25, 50, 100]},
        "projectDataDir": PROJECT_DATA_DIR.name,
        "projectDataDirExists": PROJECT_DATA_DIR.exists(),
    }


@router.get("/state")
def state() -> dict:
    """Single aggregated snapshot the UI can poll to stay consistent."""
    sync_project_datasets()

    model = get_active_model()
    datasets = list_datasets()
    evaluation = latest_evaluation()
    detection = latest_detection()

    return {
        "server": {"version": APP_VERSION, "time": now_iso()},
        "datasets": datasets,
        "datasetCount": len(datasets),
        "sampleDatasetCount": sum(1 for d in datasets if d.get("isSample")),
        "model": model_public(model) if model else None,
        "evaluation": evaluation,
        "detection": detection,
        "alerts": alerts_store.stats(),
        "storage": storage_stats(),
    }
