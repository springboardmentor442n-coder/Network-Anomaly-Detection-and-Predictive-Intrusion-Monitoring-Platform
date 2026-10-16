"""Train XGBoost (multi-class) + Isolation Forest.  Usage: python train.py [--csv path] [--max-rows 300000]"""
import argparse, os, joblib, numpy as np, pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier

ap = argparse.ArgumentParser()
ap.add_argument("--csv", default="data/cicids2017_cleaned.csv" if os.path.exists("data/cicids2017_cleaned.csv") else "data/sample_traffic.csv")
ap.add_argument("--max-rows", type=int, default=300000)
a = ap.parse_args()

print("Loading", a.csv)
df = pd.read_csv(a.csv); df.columns = df.columns.str.strip()
if len(df) > a.max_rows: df = df.sample(a.max_rows, random_state=42)
target = "Attack Type" if "Attack Type" in df.columns else "Label"
drop = [target, "Label", "Attack Type", "Flow ID", "Source IP", "Destination IP", "Timestamp"]
feats = [c for c in df.columns if c not in drop and pd.api.types.is_numeric_dtype(df[c])]
X = df[feats].replace([np.inf, -np.inf], np.nan).fillna(0).values
le = LabelEncoder(); y = le.fit_transform(df[target].astype(str))
print("Classes:", list(le.classes_), "| features:", len(feats))

Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
sc = StandardScaler().fit(Xtr); Xtr, Xte = sc.transform(Xtr), sc.transform(Xte)
model = RandomForestClassifier(n_estimators=100, max_depth=12, n_jobs=-1, random_state=42).fit(Xtr, ytr)
pred = model.predict(Xte)
print(f"Accuracy: {accuracy_score(yte, pred)*100:.2f}%")
print(classification_report(yte, pred, target_names=le.classes_, zero_division=0))

normal = [i for i, c in enumerate(le.classes_) if c.lower() in ("normal traffic", "benign", "normal")]
Xn = Xtr[np.isin(ytr, normal)] if normal else Xtr
iso = IsolationForest(n_estimators=100, contamination="auto", random_state=42, n_jobs=-1).fit(Xn[:100000])

os.makedirs("models", exist_ok=True)
for name, obj in [("xgboost_model", model), ("scaler", sc), ("features", feats), ("classes", list(le.classes_)), ("isolation_forest", iso)]:
    joblib.dump(obj, f"models/{name}.joblib")
print("Saved artifacts to models/")
