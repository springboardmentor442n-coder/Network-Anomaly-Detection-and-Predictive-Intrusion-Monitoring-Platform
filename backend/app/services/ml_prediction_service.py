import os
import sys


# --------------------------------------------------
# Locate project root
# --------------------------------------------------

BACKEND_APP_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(
        BACKEND_APP_DIR
    )
)

ML_DIR = os.path.join(
    PROJECT_ROOT,
    "ml"
)


# --------------------------------------------------
# Import ML prediction service
# --------------------------------------------------

if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)


from prediction_service import predict_network_flow


# --------------------------------------------------
# Prediction function
# --------------------------------------------------

def predict_flow(flow_data):

    result = predict_network_flow(
        flow_data
    )

    return result