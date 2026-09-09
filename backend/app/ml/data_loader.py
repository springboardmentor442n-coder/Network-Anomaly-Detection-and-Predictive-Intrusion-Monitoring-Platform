from pathlib import Path
from typing import Iterator

import pandas as pd


def discover_dataset_files(root: Path, dataset: str = "cicids2017") -> list[Path]:
    roots = [root / "CICIDS2017_improved"] if dataset.lower() == "cicids2017" else [root / "UNSW-NB15", root / "UNSW_NB15"]
    files: list[Path] = []
    for candidate in roots:
        if candidate.exists():
            files.extend(sorted(candidate.glob("*.csv")))
    return files


def iter_dataset_chunks(files: list[Path], chunk_size: int = 50_000) -> Iterator[pd.DataFrame]:
    for file_path in files:
        for chunk in pd.read_csv(file_path, chunksize=chunk_size, low_memory=False):
            chunk.columns = [str(column).strip() for column in chunk.columns]
            yield chunk


def find_label_column(columns: list[str]) -> str:
    for column in columns:
        if column.casefold() in {"label", "class", "attack_cat", "attack category", "target"}:
            return column
    raise ValueError("Dataset does not contain a supported label column")
