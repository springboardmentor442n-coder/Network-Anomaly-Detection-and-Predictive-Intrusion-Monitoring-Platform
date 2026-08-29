"""
Loads CICIDS2017 or UNSW-NB15 CSV files into the traffic_records table.

Download the datasets first (they're not bundled here due to size):
  - CICIDS2017: https://www.unb.ca/cic/datasets/ids-2017.html
  - UNSW-NB15:  https://research.unsw.edu.au/projects/unsw-nb15-dataset

Usage:
    python load_datasets.py --file path/to/Monday-WorkingHours.pcap_ISCX.csv --dataset cicids2017
    python load_datasets.py --file path/to/UNSW_NB15_training-set.csv --dataset unsw-nb15
"""
import argparse
import sys
import os

import pandas as pd
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from app.database import SessionLocal, Base, engine  # noqa: E402
from app import models  # noqa: E402


# CICIDS2017 columns have leading spaces in the raw CSVs — this maps the
# ones we care about onto our TrafficRecord schema.
CICIDS_COLUMN_MAP = {
    " Source IP": "src_ip",
    " Destination IP": "dst_ip",
    " Source Port": "src_port",
    " Destination Port": "dst_port",
    " Protocol": "protocol",
    " Flow Duration": "duration",
    " Total Fwd Packets": "total_fwd_packets",
    " Total Backward Packets": "total_bwd_packets",
    "Total Length of Fwd Packets": "total_bytes",
    " Flow Bytes/s": "flow_bytes_per_sec",
    " Label": "label",
}

UNSW_COLUMN_MAP = {
    "srcip": "src_ip",
    "dstip": "dst_ip",
    "sport": "src_port",
    "dsport": "dst_port",
    "proto": "protocol",
    "dur": "duration",
    "spkts": "total_fwd_packets",
    "dpkts": "total_bwd_packets",
    "sbytes": "total_bytes",
    "attack_cat": "label",
}


def load_csv(filepath: str, dataset: str, chunksize: int = 5000, limit_rows: int | None = None):
    Base.metadata.create_all(bind=engine)
    col_map = CICIDS_COLUMN_MAP if dataset == "cicids2017" else UNSW_COLUMN_MAP

    db: Session = SessionLocal()
    total_loaded = 0

    for chunk in pd.read_csv(filepath, chunksize=chunksize, low_memory=False):
        chunk = chunk.rename(columns=col_map)
        keep_cols = [c for c in col_map.values() if c in chunk.columns]
        chunk = chunk[keep_cols]

        # Normalize label: dataset-specific "BENIGN"/"Normal" -> our default
        if "label" in chunk.columns:
            chunk["label"] = chunk["label"].fillna("BENIGN").astype(str).str.strip()
            chunk["label"] = chunk["label"].replace({"Normal": "BENIGN", "normal": "BENIGN"})

        records = chunk.to_dict(orient="records")
        objs = []
        for r in records:
            clean = {k: v for k, v in r.items() if pd.notna(v)}
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
    parser.add_argument("--file", required=True, help="Path to dataset CSV")
    parser.add_argument("--dataset", choices=["cicids2017", "unsw-nb15"], required=True)
    parser.add_argument("--limit", type=int, default=None, help="Optional: cap rows for a quick local test")
    args = parser.parse_args()

    load_csv(args.file, args.dataset, limit_rows=args.limit)
