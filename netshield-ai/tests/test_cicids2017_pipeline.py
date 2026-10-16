"""
NETSHIELD AI - CICIDS2017 ML Pipeline Tests
"""
import pytest
import pandas as pd
import numpy as np
from app.ml.preprocessing import validate_dataset, normalize_column_names

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
