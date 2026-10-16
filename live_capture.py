"""Flow source for the live monitor. Replays the dataset in random order as if it were live traffic.
For real traffic, replace capture_flows() with a generator that yields lists of flow dicts from a flow
extractor (Argus / Zeek / CICFlowMeter) using the same columns as the training data."""
import json
import pandas as pd

def capture_flows(path="dataset/UNSW_NB15_testing-set.parquet", batch=5, seed=0):
    df = pd.read_parquet(path) if path.endswith(".parquet") else pd.read_csv(path, skipinitialspace=True, encoding="latin-1")
    df = df.rename(columns=lambda c: str(c).strip()).sample(frac=1, random_state=seed)
    for i in range(0, len(df), batch):
        yield json.loads(df.iloc[i:i + batch].to_json(orient="records"))
