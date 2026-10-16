"""Model training, job polling, evaluation and evaluation reports."""

from __future__ import annotations

import threading
import traceback

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from ..jobs import JOBS
from ..ml.evaluation import evaluate_model, evaluation_report_csv, evaluation_summary
from ..ml.schema_utils import DataValidationError
from ..ml.training import train_model
from ..schemas import EvaluateRequest, TrainRequest
from ..store import (
    delete_model,
    get_active_model,
    get_evaluation,
    get_model,
    latest_evaluation,
    list_evaluations,
    list_models,
    model_public,
    set_active_model,
)

router = APIRouter(tags=["models"])


def _csv_response(text: str, filename: str) -> Response:
    return Response(
        content=text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _fail(job_id: str, error: Exception) -> None:
    message = error.message if isinstance(error, DataValidationError) else str(error)
    JOBS.update(
        job_id,
        status="failed",
        error=message,
        message="Failed",
        progress=0,
        result={"details": error.details} if isinstance(error, DataValidationError) else None,
    )


@router.get("/models")
def index() -> dict:
    active = get_active_model()
    return {
        "items": list_models(),
        "activeModelId": model_public(active)["id"] if active else None,
    }


@router.get("/models/active")
def active() -> dict:
    model = get_active_model()
    if not model:
        return {"model": None, "message": "No model has been trained yet. Use the Model Training page."}
    return {"model": model_public(model)}


@router.post("/models/train")
def train(request: TrainRequest) -> dict:
    job = JOBS.create("train")

    def run() -> None:
        JOBS.update(job.id, status="running", progress=1, message="Starting")
        try:
            metadata = train_model(
                request.dataset_id,
                request.target,
                request.algorithm,
                progress=lambda percent, message: JOBS.update(
                    job.id, progress=percent, message=message
                ),
                sample_limit=request.sample_limit,
            )
            JOBS.update(
                job.id,
                status="succeeded",
                progress=100,
                message="Training complete",
                result={"modelId": metadata["id"], "model": model_public(metadata)},
            )
        except Exception as error:  # noqa: BLE001 - surfaced to the UI verbatim
            traceback.print_exc()
            _fail(job.id, error)

    threading.Thread(target=run, name=f"train-{job.id}", daemon=True).start()
    return {"jobId": job.id}


@router.post("/models/{model_id}/activate")
def activate(model_id: str) -> dict:
    model = get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail={"error": "model_not_found", "message": "Model not found."})
    set_active_model(model_id)
    return {"model": model_public(model)}


@router.delete("/models/{model_id}")
def remove(model_id: str) -> dict:
    if not delete_model(model_id):
        raise HTTPException(status_code=404, detail={"error": "model_not_found", "message": "Model not found."})
    return {"deleted": model_id}


@router.get("/jobs/{job_id}")
def job_status(job_id: str) -> dict:
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail={"error": "job_not_found", "message": "Unknown job."})
    return job.as_dict()


@router.get("/jobs")
def jobs() -> dict:
    return {"items": [item.as_dict() for item in JOBS.list_recent()]}


@router.post("/evaluate")
def evaluate(request: EvaluateRequest) -> dict:
    job = JOBS.create("evaluate")

    def run() -> None:
        JOBS.update(job.id, status="running", progress=2, message="Starting")
        try:
            record = evaluate_model(
                request.model_id,
                request.test_dataset_id,
                progress=lambda percent, message: JOBS.update(
                    job.id, progress=percent, message=message
                ),
            )
            JOBS.update(
                job.id,
                status="succeeded",
                progress=100,
                message="Evaluation complete",
                result={"evaluationId": record["id"], "evaluation": record},
            )
        except Exception as error:  # noqa: BLE001
            traceback.print_exc()
            _fail(job.id, error)

    threading.Thread(target=run, name=f"evaluate-{job.id}", daemon=True).start()
    return {"jobId": job.id}


@router.get("/evaluations")
def evaluations() -> dict:
    items = list_evaluations()
    return {
        "items": [evaluation_summary(item) for item in items],
        "comparison": [
            {
                "modelId": item.get("modelId"),
                "algorithmLabel": item.get("algorithmLabel"),
                "targetLabel": item.get("targetLabel"),
                "evaluationDatasetName": item.get("evaluationDatasetName"),
                "evaluatedAt": item.get("evaluatedAt"),
                "accuracy": item.get("accuracy"),
                "macroPrecision": item.get("macroPrecision"),
                "macroRecall": item.get("macroRecall"),
                "macroF1": item.get("macroF1"),
                "macroFalsePositiveRate": item.get("macroFalsePositiveRate"),
                "macroFalseNegativeRate": item.get("macroFalseNegativeRate"),
                "rowsEvaluated": item.get("rowsEvaluated"),
            }
            for item in items
        ],
    }


@router.get("/evaluations/latest")
def latest() -> dict:
    record = latest_evaluation()
    if not record:
        return {
            "evaluation": None,
            "message": "No evaluation has been run yet. Train a model, then evaluate it against the testing dataset.",
        }
    return {"evaluation": record}


@router.get("/evaluations/{evaluation_id}")
def show(evaluation_id: str) -> dict:
    record = get_evaluation(evaluation_id)
    if not record:
        raise HTTPException(status_code=404, detail={"error": "evaluation_not_found", "message": "Evaluation not found."})
    return {"evaluation": record}


@router.get("/evaluations/{evaluation_id}/report")
def report(evaluation_id: str) -> Response:
    record = get_evaluation(evaluation_id)
    if not record:
        raise HTTPException(status_code=404, detail={"error": "evaluation_not_found", "message": "Evaluation not found."})
    return _csv_response(
        evaluation_report_csv(record),
        f"netshield_model_evaluation_{evaluation_id}.csv",
    )
