from typing import Dict, Any

from pydantic import BaseModel, Field


class NetworkFlowRequest(BaseModel):
    features: Dict[str, Any] = Field(
        ...,
        description="Network flow features used by the ML models"
    )