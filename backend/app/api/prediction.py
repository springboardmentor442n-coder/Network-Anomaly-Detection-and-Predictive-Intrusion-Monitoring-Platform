from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.auth import get_current_user
from backend.app.core.database import get_db
from backend.app.models.prediction import Prediction
from backend.app.schemas.prediction import NetworkFlowRequest
from ml.prediction_service import predict_network_flow


router = APIRouter(
    prefix="/prediction",
    tags=["Prediction"],
)


@router.post("")
def create_prediction(
    request: NetworkFlowRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Run the ML prediction pipeline and store the prediction
    in the database.
    """

    result = predict_network_flow(
        request.features
    )

    prediction = Prediction(
        prediction=result["prediction"],
        attack_probability=float(
            result["attack_probability"]
        ),
        attack_type=result["attack_type"],
        attack_type_confidence=(
            float(result["attack_type_confidence"])
            if result["attack_type_confidence"] is not None
            else None
        ),
        anomaly=result["anomaly"],
        risk_score=float(result["risk_score"]),
        risk_level=result["risk_level"],
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return {
        "prediction_id": prediction.prediction_id,
        "prediction": prediction.prediction,
        "attack_probability": prediction.attack_probability,
        "attack_type": prediction.attack_type,
        "attack_type_confidence": prediction.attack_type_confidence,
        "anomaly": prediction.anomaly,
        "risk_score": prediction.risk_score,
        "risk_level": prediction.risk_level,
        "message": "Prediction created and stored successfully",
    }