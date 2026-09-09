from pathlib import Path

from backend.app.core.security import hash_password, verify_password
from backend.app.ml.data_loader import discover_dataset_files, iter_dataset_chunks
from backend.app.ml.risk import calculate_risk


def test_password_hashing_and_risk():
    encoded = hash_password("correct-password")
    assert verify_password("correct-password", encoded)
    assert not verify_password("wrong-password", encoded)
    score, severity = calculate_risk(True, 0.9, 0.9, "DoS")
    assert 0 <= score <= 100 and severity in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


def test_dataset_discovery_and_chunking():
    files = discover_dataset_files(Path("."))
    assert len(files) >= 5
    chunk = next(iter_dataset_chunks(files[:1], chunk_size=2))
    assert "Label" in chunk.columns
    assert len(chunk) == 2
