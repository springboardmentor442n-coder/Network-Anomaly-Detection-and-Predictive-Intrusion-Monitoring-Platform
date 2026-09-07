from fastapi import APIRouter, HTTPException

from app.schemas.prediction import NetworkFlowRequest
from app.services.ml_prediction_service import predict_flow
from app.services.alert_service import create_alert


router = APIRouter(
    prefix="/api/prediction",
    tags=["Prediction"]
)


@router.post("/predict")
def predict_network_traffic(flow: NetworkFlowRequest):

    try:
        # Run ML prediction
        result = predict_flow(flow.features)

        # Prepare alert information
        alert_data = {
            **result,
            "source": flow.features.get("Source IP"),
            "destination": flow.features.get("Destination IP")
        }

        # Create alert when required
        alert = create_alert(alert_data)

        return {
            "success": True,
            "result": result,
            "alert_created": alert is not None,
            "alert": alert
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )