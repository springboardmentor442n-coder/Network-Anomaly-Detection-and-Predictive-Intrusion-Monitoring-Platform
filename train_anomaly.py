"""Train the unsupervised anomaly detector (Isolation Forest) on NORMAL traffic only.
Run from the project folder:   python train_anomaly.py dataset/UNSW_NB15_training-set.parquet
It saves model/anomaly_model.pkl. The app then adds up to 30 risk points to flows that look unlike normal
traffic, which helps catch attacks the classifier was never trained on."""
import sys
import joblib, numpy as np, pandas as pd
from sklearn.ensemble import IsolationForest
import live_processor as lp

path = sys.argv[1] if len(sys.argv) > 1 else "dataset/UNSW_NB15_training-set.parquet"
df = pd.read_parquet(path) if path.endswith(".parquet") else pd.read_csv(path)
label = df["attack_cat"].astype(str).str.strip()
normal, attacks = df[label == "Normal"], df[label != "Normal"]
X = lp.preprocess(normal)
print(f"Training on {len(X):,} normal flows ...")
iso = IsolationForest(n_estimators=200, random_state=42, n_jobs=-1).fit(X)
s = iso.score_samples(X)                                    # higher = more normal
hi, lo = float(np.percentile(s, 50)), float(np.percentile(s, 1))   # median flow -> 0 points, rarest 1 percent -> 100 points
joblib.dump({"model": iso, "hi": hi, "lo": lo}, f"{lp.MODEL_DIR}/anomaly_model.pkl")
for name, d in (("normal flows", normal), ("attack flows", attacks)):
    if len(d):
        sc = iso.score_samples(lp.preprocess(d.sample(min(5000, len(d)), random_state=1)))
        print(f"average anomaly score on {name}: {(100 * np.clip((hi - sc) / (hi - lo + 1e-9), 0, 1)).mean():.1f}")
print(f"Saved {lp.MODEL_DIR}/anomaly_model.pkl")
