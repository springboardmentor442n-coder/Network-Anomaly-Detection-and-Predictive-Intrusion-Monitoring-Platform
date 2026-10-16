"""Convert the CIC-IDS2017 capture files into the NetShield AI dataset layout.

The official CIC-IDS2017 CSVs ship with 78 flow features and a single
``Label`` column holding the concrete capture name (``Benign``, ``DoS Hulk``,
``PortScan``, ...). NetShield AI expects the UNSW-NB15 layout with two
explicit targets:

* ``label``      -- ``0`` for normal traffic, ``1`` for an attack
* ``attack_cat`` -- the attack family (``Normal`` for benign traffic)

This script appends those two columns and writes the result to
``data/cic-ids2017/``, which the backend scans recursively. Files are read and
written in chunks so the largest capture (~200 MB, ~2.2M rows) never has to
fit in memory twice.

Usage (from the ``backend`` directory, with the virtual environment active):

    python scripts/convert_cic_ids2017.py
    python scripts/convert_cic_ids2017.py --source "D:/CIC-IDS2017" --dest "D:/out"
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

CHUNK_SIZE = 250_000

DEFAULT_SOURCE = Path(
    r"C:\Users\bhara\OneDrive\Desktop\Network-Anomaly-Detection\Datasets\CIC-IDS2017"
)
# scripts/ -> backend/ -> project root
DEFAULT_DEST = Path(__file__).resolve().parents[2] / "data" / "cic-ids2017"

NORMAL_CATEGORY = "Normal"


def attack_category(raw: object) -> str:
    """Fold one raw CIC-IDS2017 label onto a single attack family.

    Order matters: ``DDoS`` has to be tested before the generic ``DoS`` rule,
    otherwise "DDoS" would be captured by the ``startswith("dos")`` branch.
    """
    text = str(raw).strip()
    lowered = text.lower()

    if lowered in {"", "nan", "none", "benign"}:
        return NORMAL_CATEGORY
    if "ddos" in lowered:
        return "DDoS"
    if lowered.startswith("dos") or "slowloris" in lowered or "slowhttptest" in lowered:
        return "DoS"
    if "heartbleed" in lowered:
        return "Heartbleed"
    if "web attack" in lowered:
        return "Web Attack"
    if "infiltration" in lowered:
        return "Infiltration"
    if lowered.startswith("bot"):
        return "Botnet"
    if "portscan" in lowered or "port scan" in lowered:
        return "PortScan"
    if "patator" in lowered:
        return "Brute Force"
    return text or "Unknown"


def _label_column(frame: pd.DataFrame) -> pd.Series:
    """Return the raw ``Label`` column (the source files capitalise it)."""
    for column in frame.columns:
        if str(column).strip().lower() == "label":
            return frame[column]
    raise SystemExit("No 'Label' column found - is this a CIC-IDS2017 file?")


def convert_file(path: Path, target: Path) -> tuple[int, int]:
    """Write one converted CSV. Returns ``(rows, attack_rows)``."""
    rows = 0
    attacks = 0
    first_chunk = True

    reader = pd.read_csv(
        path,
        chunksize=CHUNK_SIZE,
        low_memory=False,
        encoding="utf-8-sig",  # the source files carry a UTF-8 BOM
    )
    for chunk in reader:
        chunk.columns = [str(column).strip() for column in chunk.columns]
        # A trailing unnamed index column shows up in a few captures.
        chunk = chunk.loc[:, ~chunk.columns.str.startswith("Unnamed:")]

        raw_labels = _label_column(chunk)

        # "Flow Byts/s" and "Flow Pkts/s" contain Infinity in this dataset;
        # infinities break scaling, so they become missing values.
        chunk = chunk.replace([float("inf"), float("-inf")], pd.NA)

        chunk["attack_cat"] = raw_labels.map(attack_category)
        chunk["label"] = (chunk["attack_cat"] != NORMAL_CATEGORY).astype("int64")

        chunk.to_csv(
            target,
            mode="w" if first_chunk else "a",
            header=first_chunk,
            index=False,
        )
        first_chunk = False

        rows += len(chunk)
        attacks += int(chunk["label"].sum())

    return rows, attacks


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--dest", type=Path, default=DEFAULT_DEST)
    args = parser.parse_args()

    source: Path = args.source
    dest: Path = args.dest

    if not source.exists():
        raise SystemExit(f"Source directory not found: {source}")

    files = sorted(source.glob("*.csv"))
    if not files:
        raise SystemExit(f"No CSV files found in {source}")

    dest.mkdir(parents=True, exist_ok=True)

    print(f"Source : {source}")
    print(f"Dest   : {dest}")
    print(f"Files  : {len(files)}\n")

    total_rows = 0
    total_attacks = 0
    for path in files:
        target = dest / f"CICIDS2017_{path.name}"
        rows, attacks = convert_file(path, target)
        total_rows += rows
        total_attacks += attacks
        share = (attacks / rows * 100) if rows else 0.0
        print(f"  {path.name} -> {target.name}")
        print(f"    {rows:,} rows, {attacks:,} attacks ({share:.1f}%)")

    print(f"\nDone. {total_rows:,} rows written, {total_attacks:,} attacks.")
    print(f"Open the Dataset Analysis page and press refresh to load them.")


if __name__ == "__main__":
    main()
