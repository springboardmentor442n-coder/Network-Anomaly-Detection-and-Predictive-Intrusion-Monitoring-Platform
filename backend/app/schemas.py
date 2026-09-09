from pydantic import BaseModel, Field


class Credentials(BaseModel):
    email: str
    password: str = Field(min_length=8)


class PredictionRequest(BaseModel):
    features: dict[str, object]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
