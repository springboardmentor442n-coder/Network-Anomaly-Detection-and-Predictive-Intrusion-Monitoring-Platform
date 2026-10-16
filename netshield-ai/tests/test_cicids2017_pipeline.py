"""
NETSHIELD AI - CICIDS2017 ML Pipeline Tests
"""
import pytest
import pandas as pd
import numpy as np
from app.ml.preprocessing import validate_dataset, normalize_column_names
from app.ml.loader import ensure_active_model_loaded
from app.ml.predictor import get_active_predictor

def test_cicids2017_dataset_validation():
    # Create sample raw DataFrame simulating CICIDS2017 CSV columns
    raw_data = pd.DataFrame({
        " Destination Port": [80, 443, 22, 8080, 53, 21],
        " Flow Duration": [1000, 2000, 500, 15000, 300, 1200],
        " Total Fwd Packets": [10, 20, 5, 100, 2, 8],
        " Total Backward Packets": [8, 18, 2, 90, 2, 6],
        "Total Length of Fwd Packets": [500, 1200, 200, 50000, 80, 400],
        " Total Length of Bwd Packets": [400, 900, 100, 45000, 120, 350],
        " Label": ["BENIGN", "BENIGN", "SSH-Patator", "DDoS", "BENIGN", "FTP-Patator"]
    })

    report = validate_dataset(raw_data)
    assert report is not None
    assert report["valid"] is True
    assert report["stats"]["num_rows"] == 6
    assert report["stats"]["label_column"] == "Label"


def test_active_model_loader_and_predictor():
    """Verify that a real trained CICIDS2017 model loads and predicts."""
    predictor = ensure_active_model_loaded()
    assert predictor is not None, "Active predictor should be loaded"
    assert get_active_predictor() is not None

    assert len(predictor.class_names) > 1
    assert "BENIGN" in predictor.class_names
    assert len(predictor.feature_names) >= 8

    # Test single flow prediction
    sample_row = {"Destination Port": 80, "Flow Duration": 5000, "Total Fwd Packets": 4}
    res = predictor.predict_row(sample_row)
    assert "predicted_class" in res
    assert "confidence" in res
    assert res["confidence"] >= 0.0
    assert "class_probabilities" in res
