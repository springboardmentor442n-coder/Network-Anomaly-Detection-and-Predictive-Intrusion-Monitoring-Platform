"""Test metadata detection, column stripping, and non-feature isolation."""
import pandas as pd
import pytest
from app.streaming.scanner import detect_metadata_columns, _format_protocol
from app.ml.preprocessing import COLUMNS_TO_DROP

def test_detect_metadata_columns_with_cicids2017_spaces():
    df = pd.DataFrame({
        " Flow ID": ["192.168.10.14-192.168.10.50-49459-80-6"],
        " Source IP": ["192.168.10.14"],
        " Source Port": [49459],
        " Destination IP": ["192.168.10.50"],
        " Destination Port": [80],
        " Protocol": [6],
        " Timestamp": ["07/07/2017 8:59:00"],
        " Flow Duration": [1000],
        " Label": ["BENIGN"]
    })

    col_map, diagnostics = detect_metadata_columns(df)
    assert col_map["source_ip"] == " Source IP"
    assert col_map["dest_ip"] == " Destination IP"
    assert col_map["dest_port"] == " Destination Port"
    assert col_map["protocol"] == " Protocol"
    assert col_map["timestamp"] == " Timestamp"
    assert diagnostics["has_full_metadata"] is True
    assert len(diagnostics["missing_fields"]) == 0

def test_detect_metadata_columns_missing_fields():
    # Dataset without IP/protocol columns (like pure flow feature files)
    df = pd.DataFrame({
        "Flow Duration": [1000],
        "Total Fwd Packets": [2],
        "Label": ["BENIGN"]
    })

    col_map, diagnostics = detect_metadata_columns(df)
    assert col_map["source_ip"] is None
    assert col_map["dest_ip"] is None
    assert col_map["protocol"] is None
    assert diagnostics["has_full_metadata"] is False
    assert "Source IP" in diagnostics["missing_fields"]
    assert "Destination IP" in diagnostics["missing_fields"]
    assert "Protocol" in diagnostics["missing_fields"]
    assert "not found in CSV header" in diagnostics["diagnostic_message"]

def test_protocol_formatting():
    assert _format_protocol(6) == "TCP"
    assert _format_protocol("6") == "TCP"
    assert _format_protocol(17) == "UDP"
    assert _format_protocol("17") == "UDP"
    assert _format_protocol(1) == "ICMP"
    assert _format_protocol("tcp") == "TCP"
    assert _format_protocol(None) is None

def test_metadata_columns_dropped_from_ml_features():
    for col in ["Flow ID", "Source IP", "Destination IP", "Protocol", "Timestamp", " Source IP", " Destination IP", " Protocol"]:
        assert col in COLUMNS_TO_DROP
