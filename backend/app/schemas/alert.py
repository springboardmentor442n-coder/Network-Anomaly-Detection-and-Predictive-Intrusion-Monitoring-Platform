from typing import Optional
from pydantic import BaseModel, Field


class AlertCreate(BaseModel):
    prediction: str = Field(
        ...,
        description="ML prediction such as ATTACK or BENIGN"
    )

    attack_probability: float = Field(
        ...,
        ge=0,
        le=100,
        description="Predicted attack probability percentage"
    )

    attack_type: str = Field(
        ...,
        description="Detected attack type such as DDoS, PortScan, or BENIGN"
    )

    attack_type_confidence: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
        description="Confidence of the detected attack type"
    )

    anomaly: str = Field(
        ...,
        description="Whether the flow was detected as anomalous"
    )

    risk_score: float = Field(
        ...,
        ge=0,
        le=100,
        description="Calculated risk score"
    )

    risk_level: str = Field(
        ...,
        description="LOW, MEDIUM, HIGH, or CRITICAL"
    )

    source: Optional[str] = Field(
        default=None,
        description="Source IP address"
    )

    destination: Optional[str] = Field(
        default=None,
        description="Destination IP address"
    )


class AlertResponse(AlertCreate):
    alert_id: int
    status: str
    message: str