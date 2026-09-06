from fastapi import APIRouter, HTTPException

from app.schemas.prediction import NetworkFlowRequest
from app.services.ml_prediction_service import predict_flow


router = APIRouter(
    prefix="/api/prediction",
    tags=["Prediction"]
)


@router.post("/predict")
def predict_network_traffic(flow: NetworkFlowRequest):

    try:

        result = predict_flow(
            flow.features
        )

        return {
            "success": True,
            "result": result
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )