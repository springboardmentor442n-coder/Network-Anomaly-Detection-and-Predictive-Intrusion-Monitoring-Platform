"""Train the models on CICIDS2017 (the MachineLearningCSV files from the Canadian Institute for Cybersecurity).
Usage:   python train_cicids.py path/to/folder_with_csv_files [--models xgb,rf,svm] [--rows 300000]
Output:  model_cicids/ with the same kind of files as the UNSW-NB15 notebook.
To use it, set in .env:   NETSHIELD_MODEL_DIR=model_cicids    NETSHIELD_DATA=path/to/one_of_the_csv_files
Metrics are measured on a 20% validation split and written to model_cicids/validation_comparison.csv (shown on the Models page)."""
import argparse, glob, os
import joblib, numpy as np, pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.svm import LinearSVC
from sklearn.utils.class_weight import compute_sample_weight

def load(folder, rows):
    files = sorted(glob.glob(os.path.join(folder, "*.csv")))
    if not files:
        raise SystemExit(f"No .csv files found in {folder}")
    per, parts = max(1000, rows // len(files)), []
    for f in files:
        d = pd.read_csv(f, encoding="latin-1", low_memory=False)
        d.columns = d.columns.str.strip()
        parts.append(d.sample(min(per, len(d)), random_state=42))
        print("read", os.path.basename(f), f"({len(d):,} rows)")
    return pd.concat(parts, ignore_index=True)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder"); ap.add_argument("--models", default="xgb,rf,svm"); ap.add_argument("--rows", type=int, default=300000)
    ap.add_argument("--out", default="model_cicids")
    a = ap.parse_args()
    df = load(a.folder, a.rows)
    label = (df["Label"].astype(str).str.strip().str.replace(r"[^\x00-\x7F]+", "-", regex=True).replace({"BENIGN": "Normal"}))
    X = df.drop(columns=["Label"]).apply(pd.to_numeric, errors="coerce").replace([np.inf, -np.inf], np.nan)
    medians = X.median(); X = X.fillna(medians)
    enc = LabelEncoder(); y = enc.fit_transform(label)
    print("classes:", list(enc.classes_))
    strat = y if np.bincount(y).min() >= 2 else None
    Xtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.2, random_state=42, stratify=strat)
    w = compute_sample_weight("balanced", ytr)
    svm_cv = min(3, int(np.bincount(ytr).min()))      # the SVM calibration needs a few rows of every class
    makers = {
        "xgb": ("XGBoost", "cicids2017_xgboost.pkl", lambda: __import__("xgboost").XGBClassifier(
            n_estimators=300, learning_rate=0.1, max_depth=8, objective="multi:softprob", tree_method="hist", n_jobs=-1, random_state=42)),
        "rf": ("Random Forest", "cicids2017_randomforest.pkl", lambda: RandomForestClassifier(200, class_weight="balanced", n_jobs=-1, random_state=42)),
        "svm": ("SVM", "cicids2017_svm.pkl", lambda: CalibratedClassifierCV(make_pipeline(StandardScaler(), LinearSVC(
            C=1.0, class_weight="balanced", max_iter=5000, dual="auto", random_state=42)), method="sigmoid", cv=svm_cv, n_jobs=-1)),
    }
    os.makedirs(a.out, exist_ok=True)
    results = []
    for key in [k.strip() for k in a.models.split(",") if k.strip()]:
        name, fname, make = makers[key]
        if key == "svm" and svm_cv < 2:
            print("skipping SVM: one class has too few rows"); continue
        print("training", name, "...")
        m = make()
        m.fit(Xtr, ytr, sample_weight=w) if key == "xgb" else m.fit(Xtr, ytr)
        p = m.predict(Xva)
        results.append({"Model": name, "Accuracy": accuracy_score(yva, p), "Precision_Macro": precision_score(yva, p, average="macro", zero_division=0),
                        "Recall_Macro": recall_score(yva, p, average="macro", zero_division=0), "F1_Macro": f1_score(yva, p, average="macro"),
                        "F1_Weighted": f1_score(yva, p, average="weighted")})
        joblib.dump(m, os.path.join(a.out, fname))
        print("  ", {k: round(v, 4) for k, v in results[-1].items() if k != "Model"})
    res = pd.DataFrame(results)
    res.to_csv(os.path.join(a.out, "validation_comparison.csv"), index=False)
    joblib.dump(enc, os.path.join(a.out, "target_encoder.pkl"))
    joblib.dump(list(X.columns), os.path.join(a.out, "feature_list.pkl"))
    joblib.dump(medians, os.path.join(a.out, "feature_medians.pkl"))
    joblib.dump({}, os.path.join(a.out, "categorical_encoders.pkl"))
    joblib.dump({"best_validation_model": res.sort_values("F1_Macro", ascending=False).iloc[0]["Model"], "dataset": "CICIDS2017"}, os.path.join(a.out, "model_config.pkl"))
    print(f"Saved to {a.out}/. Now set NETSHIELD_MODEL_DIR={a.out} in .env and restart the server.")

if __name__ == "__main__":
    main()
