"""Pydantic request models. Every field is validated before it reaches the ML code."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from .config import ALGORITHMS


class TrainRequest(BaseModel):
    dataset_id: str = Field(..., alias="datasetId", min_length=1)
    target: str = Field(..., min_length=1)
    algorithm: str = Field(..., min_length=1)
    sample_limit: int | None = Field(default=None, alias="sampleLimit", ge=100, le=500_000)

    model_config = {"populate_by_name": True}

    @field_validator("algorithm")
    @classmethod
    def _known_algorithm(cls, value: str) -> str:
        if value not in ALGORITHMS:
            raise ValueError(f"algorithm must be one of {', '.join(ALGORITHMS)}")
        return value


class EvaluateRequest(BaseModel):
    model_id: str = Field(..., alias="modelId", min_length=1)
    test_dataset_id: str = Field(..., alias="testDatasetId", min_length=1)

    model_config = {"populate_by_name": True}


class SeverityRules(BaseModel):
    critical: float = Field(default=0.9, ge=0.0, le=1.0)
    high: float = Field(default=0.75, ge=0.0, le=1.0)
    medium: float = Field(default=0.6, ge=0.0, le=1.0)


class AlertStatusRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def _known_status(cls, value: str) -> str:
        allowed = {"open", "acknowledged", "resolved"}
        if value not in allowed:
            raise ValueError(f"status must be one of {', '.join(sorted(allowed))}")
        return value


class BulkAlertStatusRequest(BaseModel):
    ids: list[str] = Field(default_factory=list)
    status: str

    @field_validator("status")
    @classmethod
    def _known_status(cls, value: str) -> str:
        allowed = {"open", "acknowledged", "resolved"}
        if value not in allowed:
            raise ValueError(f"status must be one of {', '.join(sorted(allowed))}")
        return value


class DeleteAlertsRequest(BaseModel):
    ids: list[str] | None = None
    confirm: bool = False
