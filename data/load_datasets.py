"""
Loads CICIDS2017 or UNSW-NB15 files (CSV or Parquet) into the
traffic_records table.

Sources:
  - Official UNB CSVs:  https://www.unb.ca/cic/datasets/ids-2017.html
  - Kaggle (cleaned, Parquet): https://www.kaggle.com/datasets/dhoogla/cicids2017
  - UNSW-NB15:  https://research.unsw.edu.au/projects/unsw-nb15-dataset

Usage:
    python load_datasets.py --file path/to/DDoS-Friday-no-metadata.parquet --dataset cicids2017
    python load_datasets.py --file path/to/Monday-WorkingHours.pcap_ISCX.csv --dataset cicids2017
    python load_datasets.py --file path/to/UNSW_NB15_training-set.csv --dataset unsw-nb15
"""
import argparse
import sys
import os

import pandas as pd
from sqlalchemy.orm import Session

# Resolve the backend app's location whether we're running locally
# (data/ and backend/ side by side) or inside the Docker container
# (mounted at /data and /app respectively).
_local_backend = os.path.join(os.path.dirname(__file__), "..", "backend")
_container_backend = "/app"
if os.path.isdir(os.path.join(_container_backend, "app")):
    sys.path.insert(0, _container_backend)
else:
    sys.path.insert(0, _local_backend)

from app.database import SessionLocal, Base, engine  # noqa: E402
from app import models  # noqa: E402


# Each target field maps to a LIST of possible source column names, since
# different releases of the same dataset (raw UNB CSV vs. cleaned Kaggle
# Parquet) name things slightly differently (leading spaces, casing, etc).
CICIDS_COLUMN_CANDIDATES = {
    "src_ip": [" Source IP", "Source IP", "src_ip", "Src IP"],
    "dst_ip": [" Destination IP", "Destination IP", "dst_ip", "Dst IP"],
    "src_port": [" Source Port", "Source Port", "src_port", "Src Port"],
    "dst_port": [" Destination Port", "Destination Port", "dst_port", "Dst Port"],
    "protocol": [" Protocol", "Protocol", "protocol"],
    "duration": [" Flow Duration", "Flow Duration", "flow_duration"],
    "total_fwd_packets": [" Total Fwd Packets", "Total Fwd Packets", "Tot Fwd Pkts"],
    "total_bwd_packets": [" Total Backward Packets", "Total Backward Packets", "Tot Bwd Pkts"],
    "total_bytes": ["Total Length of Fwd Packets", "TotLen Fwd Pkts", "total_bytes"],
    "flow_bytes_per_sec": [" Flow Bytes/s", "Flow Bytes/s", "flow_byts_s"],
    "label": [" Label", "Label", "label"],
}

UNSW_COLUMN_CANDIDATES = {
    "src_ip": ["srcip", "src_ip"],
    "dst_ip": ["dstip", "dst_ip"],
    "src_port": ["sport", "src_port"],
    "dst_port": ["dsport", "dst_port"],
    "protocol": ["proto", "protocol"],
    "duration": ["dur", "duration"],
    "total_fwd_packets": ["spkts", "total_fwd_packets"],
    "total_bwd_packets": ["dpkts", "total_bwd_packets"],
    "total_bytes": ["sbytes", "total_bytes"],
    "label": ["attack_cat", "label"],
}


def resolve_columns(df_columns, candidates_map):
    """For each target field, find the first matching column name actually
    present in this file. Returns {target_field: actual_column_name}."""
    resolved = {}
    for target, options in candidates_map.items():
        for option in options:
            if option in df_columns:
                resolved[target] = option
                break
    return resolved


def read_any(filepath: str, chunksize: int):
    """Yields DataFrame chunks regardless of whether the file is CSV or
    Parquet. Parquet doesn't support chunked reads the same way pandas does
    for CSV, so we read it fully then split it into chunks ourselves."""
    ext = os.path.splitext(filepath)[1].lower()

    if ext == ".parquet":
        df = pd.read_parquet(filepath)
        for start in range(0, len(df), chunksize):
            yield df.iloc[start:start + chunksize]
    else:
        for chunk in pd.read_csv(filepath, chunksize=chunksize, low_memory=False):
            yield chunk


def load_file(filepath: str, dataset: str, chunksize: int = 5000, limit_rows: int | None = None):
    Base.metadata.create_all(bind=engine)
    candidates_map = CICIDS_COLUMN_CANDIDATES if dataset == "cicids2017" else UNSW_COLUMN_CANDIDATES

    db: Session = SessionLocal()
    total_loaded = 0
    column_map = None  # resolved on first chunk, reused after

    for chunk in read_any(filepath, chunksize):
        if column_map is None:
            column_map = resolve_columns(chunk.columns, candidates_map)
            print(f"Detected columns: {column_map}")
            if "src_ip" not in column_map or "dst_ip" not in column_map:
                print("WARNING: this file has no IP columns (common for "
                      "per-attack-type Kaggle files that strip IPs). "
                      "Will fill placeholder IPs so rows still load.")

        # rename actual source columns -> our schema field names
        rename_map = {v: k for k, v in column_map.items()}
        chunk = chunk.rename(columns=rename_map)
        keep_cols = [c for c in column_map.keys() if c in chunk.columns]
        chunk = chunk[keep_cols]

        if "label" in chunk.columns:
            # Parquet files often store this as a pandas "Categorical" dtype,
            # which blocks assigning any value not already in its predefined
            # category list (e.g. can't fillna with "BENIGN" if that exact
            # string wasn't one of the original categories). Casting to
            # plain string removes that restriction.
            chunk["label"] = chunk["label"].astype(str).str.strip()
            chunk["label"] = chunk["label"].replace({"nan": "BENIGN", "": "BENIGN"})
            benign_spellings = {"normal", "benign", "0", "nan", ""}
            chunk["label"] = chunk["label"].apply(
                lambda v: "BENIGN" if v.strip().lower() in benign_spellings else v
            )
        else:
            chunk["label"] = "BENIGN"

        records = chunk.to_dict(orient="records")
        objs = []
        for i, r in enumerate(records):
            clean = {k: v for k, v in r.items() if pd.notna(v)}
            clean.setdefault("src_ip", "0.0.0.0")
            clean.setdefault("dst_ip", "0.0.0.0")
            objs.append(models.TrafficRecord(
                is_anomalous=(clean.get("label", "BENIGN") != "BENIGN"),
                **clean,
            ))

        db.bulk_save_objects(objs)
        db.commit()
        total_loaded += len(objs)
        print(f"Loaded {total_loaded} rows...")

        if limit_rows and total_loaded >= limit_rows:
            break

    db.close()
    print(f"Done. Total rows loaded: {total_loaded}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="Path to dataset CSV or Parquet file")
    parser.add_argument("--dataset", choices=["cicids2017", "unsw-nb15"], required=True)
    parser.add_argument("--limit", type=int, default=None, help="Optional: cap rows for a quick local test")
    args = parser.parse_args()

    load_file(args.file, args.dataset, limit_rows=args.limit)