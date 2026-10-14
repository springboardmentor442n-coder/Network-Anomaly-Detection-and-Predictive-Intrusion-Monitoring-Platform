"""Bounded data preparation using every CICIDS CSV; deterministic feature-hash holdout."""

import argparse, hashlib, json, time
from pathlib import Path
from collections import Counter
import numpy as np, pandas as pd

ROOT = Path(__file__).resolve().parent
FEATURES = [
    "RST Flag Count",
    "Bwd Packet Length Std",
    "Packet Length Std",
    "Flow Duration",
    "Flow IAT Max",
    "Bwd Packet Length Mean",
    "Packet Length Variance",
    "Fwd Packets/s",
    "Packet Length Max",
    "Fwd Segment Size Avg",
    "Subflow Fwd Bytes",
    "Bwd Segment Size Avg",
    "Average Packet Size",
    "Flow Packets/s",
    "Packet Length Mean",
]
META = [
    "Src IP",
    "Dst IP",
    "Src Port",
    "Dst Port",
    "Protocol",
    "Timestamp",
    "Label",
    "Attempted Category",
]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--data-dir", default=str(ROOT / "data/cicids"))
    p.add_argument("--train-benign", type=int, default=40000)
    p.add_argument("--train-attack", type=int, default=10000)
    p.add_argument("--test-benign", type=int, default=30000)
    p.add_argument("--test-attack", type=int, default=5000)
    a = p.parse_args()
    files = sorted(Path(a.data_dir).glob("*.csv"))
    if not files:
        raise SystemExit("No CSVs found")
    stores = {"train": {}, "test": {}}
    stats = {
        "raw_rows": 0,
        "invalid_feature_rows": 0,
        "relabeled_attempts": 0,
        "valid_labels": Counter(),
        "files": [],
    }
    t = time.perf_counter()
    for file in files:
        raw = valid = 0
        h = hashlib.sha256()
        with file.open("rb") as f:
            while b := f.read(4 * 1024 * 1024):
                h.update(b)
        for chunk in pd.read_csv(file, chunksize=50000, usecols=FEATURES + META):
            raw += len(chunk)
            stats["raw_rows"] += len(chunk)
            chunk["Label"] = chunk["Label"].astype(str).str.strip()
            attempt = chunk["Attempted Category"] != -1
            stats["relabeled_attempts"] += int(attempt.sum())
            chunk.loc[attempt, "Label"] = "BENIGN"
            X = (
                chunk[FEATURES]
                .apply(pd.to_numeric, errors="coerce")
                .replace([np.inf, -np.inf], np.nan)
            )
            ok = ~X.isna().any(axis=1)
            stats["invalid_feature_rows"] += int((~ok).sum())
            chunk = chunk.loc[ok].copy()
            chunk[FEATURES] = X.loc[ok].astype("float64")
            valid += len(chunk)
            stats["valid_labels"].update(chunk.Label.value_counts().to_dict())
            # Identical numeric inputs always go to the same partition, even across files/labels.
            chunk["feature_hash"] = pd.util.hash_pandas_object(
                chunk[FEATURES], index=False
            ).astype("uint64")
            chunk["source_file"] = file.name
            train_mask = (chunk.feature_hash % 100) < 80
            for split, frame in [
                ("train", chunk.loc[train_mask]),
                ("test", chunk.loc[~train_mask]),
            ]:
                for label, group in frame.groupby("Label", sort=False):
                    limit = (
                        (a.train_benign if label == "BENIGN" else a.train_attack)
                        if split == "train"
                        else (a.test_benign if label == "BENIGN" else a.test_attack)
                    )
                    if label in stores[split]:
                        group = pd.concat(
                            [stores[split][label], group], ignore_index=True
                        )
                    # Unique input/label pairs; keep a deterministic bounded min-hash reservoir.
                    group = group.drop_duplicates(["feature_hash", "Label"])
                    stores[split][label] = group.nsmallest(limit, "feature_hash")
        stats["files"].append(
            {
                "name": file.name,
                "raw_rows": raw,
                "valid_rows": valid,
                "sha256": h.hexdigest(),
                "bytes": file.stat().st_size,
            }
        )
        print(file.name, "raw", raw, "valid", valid, flush=True)
    out = ROOT / "data/prepared"
    out.mkdir(parents=True, exist_ok=True)
    for split in stores:
        frame = pd.concat(stores[split].values(), ignore_index=True).sort_values(
            "feature_hash"
        )
        frame.to_csv(out / f"{split}.csv", index=False)
        stats[split + "_sample_rows"] = len(frame)
        stats[split + "_sample_labels"] = frame.Label.value_counts().to_dict()
        if split == "train":
            train_hash = set(frame.feature_hash)
        else:
            assert not train_hash.intersection(
                set(frame.feature_hash)
            ), "Feature-identical leakage detected"
            # Demonstration rows come from holdout and retain real IP metadata.
            demo = frame.groupby("Label", group_keys=False).head(20)
            demo.to_csv(ROOT / "data/cicids_demo_real_ips.csv", index=False)
    stats["valid_labels"] = dict(stats["valid_labels"])
    stats["preparation_seconds"] = round(time.perf_counter() - t, 2)
    stats["split"] = (
        "Feature-vector hash modulo 100: <80 train, >=80 holdout; capped unique samples per class"
    )
    stats["limitations"] = [
        "Not a chronological or host/session-disjoint split",
        "Fixed 15 features inherited from earlier project; retrospective benchmark",
        "Per-class caps change prevalence; sample-weighted metrics are not full-population metrics",
        "No UNSW-NB15 included",
    ]
    stats["features"] = FEATURES
    (ROOT / "models/data_manifest.json").write_text(json.dumps(stats, indent=2))
    print(json.dumps(stats, indent=2), flush=True)


if __name__ == "__main__":
    main()
