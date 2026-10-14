"""Reproducible demo/full-data trainer. Holdout is never used by parameter search."""

import argparse, json, time, hashlib, platform
from pathlib import Path
import numpy as np, pandas as pd, joblib, sklearn
from sklearn.ensemble import (
    RandomForestClassifier,
    ExtraTreesClassifier,
    IsolationForest,
)
from sklearn.preprocessing import LabelEncoder
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import (
    train_test_split,
    RandomizedSearchCV,
    StratifiedKFold,
)
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
    accuracy_score,
    average_precision_score,
)
from xgboost import XGBClassifier

ROOT = Path(__file__).resolve().parent
EXCLUDED = {
    "id",
    "flowid",
    "srcip",
    "dstip",
    "sourceip",
    "destinationip",
    "timestamp",
    "label",
    "attackcat",
    "attemptedcategory",
    "isattack",
    "srcport",
    "dstport",
    "sport",
    "dsport",
}


def norm(x):
    return "".join(c for c in str(x).lower() if c.isalnum())


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--csv", nargs="+", default=[str(ROOT / "data/sample_traffic.csv")])
    p.add_argument("--demo", action="store_true")
    p.add_argument("--tune", action="store_true")
    p.add_argument(
        "--time-column",
        help="Recommended chronological holdout column; earliest 80%% train, latest 20%% test.",
    )
    p.add_argument(
        "--features", help="JSON feature list, otherwise numeric non-identifiers."
    )
    a = p.parse_args()
    frames = []
    hashes = {}
    for path in a.csv:
        file = Path(path)
        hashes[file.name] = hashlib.sha256(file.read_bytes()).hexdigest()
        frames.append(pd.read_csv(file))
    df = pd.concat(frames, ignore_index=True)
    df.columns = df.columns.str.strip()
    if "Label" not in df:
        raise ValueError(
            "Training requires Label. UNSW-NB15 needs explicit schema conversion; do not combine unrelated feature schemas."
        )
    if "Attempted Category" in df:
        df.loc[df["Attempted Category"] != -1, "Label"] = "BENIGN"
    df = df.drop_duplicates()
    df = df[df.Label.notna()].copy()
    df["Label"] = df.Label.astype(str).str.strip()
    df.loc[df.Label.str.lower().isin(["benign", "normal"]), "Label"] = "BENIGN"
    features = (
        json.load(open(a.features))
        if a.features
        else [c for c in df.select_dtypes(include="number") if norm(c) not in EXCLUDED]
    )
    features = [c for c in features if norm(c) not in EXCLUDED]
    X = df[features].replace([np.inf, -np.inf], np.nan)
    ok = ~X.isna().any(axis=1)
    df = df.loc[ok]
    X = X.loc[ok]
    y = df.Label
    rare = y.value_counts()
    rare = rare[rare < 4].to_dict()
    if rare:
        raise ValueError(
            "Need at least 4 examples per class for reliable stratified train/test/CV: "
            + str(rare)
        )
    if a.time_column:
        indices = pd.to_datetime(df[a.time_column], errors="raise").sort_values().index
        cut = int(0.8 * len(indices))
        tr = indices[:cut]
        te = indices[cut:]
        xt, xe, yt, ye = X.loc[tr], X.loc[te], y.loc[tr], y.loc[te]
        if set(ye) - set(yt):
            raise ValueError(
                "Holdout includes classes unseen in training. Report them separately or revise split."
            )
    else:
        xt, xe, yt, ye = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
    encoder = LabelEncoder().fit(yt)
    encoded = encoder.transform(yt)
    models = {
        "random_forest": RandomForestClassifier(
            n_estimators=160,
            max_depth=20,
            class_weight="balanced",
            n_jobs=2,
            random_state=42,
        ),
        "xgboost": XGBClassifier(
            n_estimators=120,
            max_depth=4,
            learning_rate=0.08,
            subsample=0.9,
            colsample_bytree=0.9,
            n_jobs=2,
            random_state=42,
            eval_metric="mlogloss",
        ),
        "extra_trees": ExtraTreesClassifier(
            n_estimators=160, class_weight="balanced", n_jobs=2, random_state=42
        ),
    }
    grids = {
        "random_forest": {
            "n_estimators": [100, 160, 240],
            "max_depth": [10, 20, None],
            "min_samples_leaf": [1, 2, 4],
        },
        "xgboost": {
            "n_estimators": [80, 120, 180],
            "max_depth": [3, 4, 6],
            "learning_rate": [0.03, 0.08, 0.15],
        },
        "extra_trees": {
            "n_estimators": [100, 160, 240],
            "max_depth": [10, 20, None],
            "min_samples_leaf": [1, 2, 4],
        },
    }
    reports = {}
    for name, model in models.items():
        target = encoded if name == "xgboost" else yt
        cv_results = None
        t = time.perf_counter()
        if a.tune:
            folds = min(3, int(yt.value_counts().min()))
            if folds < 2:
                raise ValueError("Insufficient minority-class training rows for CV")
            search = RandomizedSearchCV(
                model,
                grids[name],
                n_iter=4,
                scoring="f1_macro",
                cv=StratifiedKFold(folds, shuffle=True, random_state=42),
                random_state=42,
                n_jobs=1,
            )
            search.fit(xt, target)
            model = search.best_estimator_
            models[name] = model
            cv_results = {
                "best_params": search.best_params_,
                "best_cv_macro_f1": search.best_score_,
                "folds": folds,
            }
        else:
            model.fit(xt, target)
        train_seconds = time.perf_counter() - t
        times = []
        for _ in range(5):
            t = time.perf_counter()
            prob = model.predict_proba(xe)
            times.append((time.perf_counter() - t) * 1000)
        classes = (
            encoder.inverse_transform(model.classes_.astype(int))
            if name == "xgboost"
            else model.classes_
        )
        pred = classes[prob.argmax(axis=1)]
        truth = (ye != "BENIGN").astype(int)
        attack = (pred != "BENIGN").astype(int)
        cm = confusion_matrix(truth, attack, labels=[0, 1])
        tn, fp, fn, tp = cm.ravel()
        attackprob = (
            1 - prob[:, list(classes).index("BENIGN")]
            if "BENIGN" in classes
            else prob.sum(axis=1)
        )
        reports[name] = {
            "accuracy": accuracy_score(ye, pred),
            "macro_f1": f1_score(ye, pred, average="macro"),
            "weighted_f1": f1_score(ye, pred, average="weighted"),
            "attack_precision": precision_score(truth, attack, zero_division=0),
            "attack_recall": recall_score(truth, attack, zero_division=0),
            "false_positive_rate": float(fp / (fp + tn)) if fp + tn else None,
            "attack_average_precision": (
                average_precision_score(truth, attackprob)
                if truth.nunique() == 2
                else None
            ),
            "classification_report": classification_report(
                ye, pred, output_dict=True, zero_division=0
            ),
            "confusion_matrix": confusion_matrix(
                ye, pred, labels=list(encoder.classes_)
            ).tolist(),
            "class_order": list(encoder.classes_),
            "train_seconds": train_seconds,
            "batch_latency_p50_ms": float(np.median(times)),
            "batch_latency_p95_ms": float(np.percentile(times, 95)),
            "rows_per_second": len(xe) / (np.median(times) / 1000),
            "holdout_rows": len(xe),
            "hyperparameters": model.get_params(),
            "search": cv_results,
        }
    benign = xt[yt == "BENIGN"]
    if len(benign) < 5:
        raise ValueError("At least 5 benign training rows needed for anomaly detector")
    anomaly = make_pipeline(
        SimpleImputer(strategy="median"),
        StandardScaler(),
        IsolationForest(
            n_estimators=100, contamination=0.05, random_state=42, n_jobs=2
        ),
    ).fit(benign)
    metadata = {
        "scope": (
            "DEMO: trained on 302-row supplied sample; not full CICIDS2017 validation"
            if a.demo
            else "User-supplied training data; inspect source provenance"
        ),
        "demo": a.demo,
        "split": (
            "chronological"
            if a.time_column
            else "stratified random; temporal/session leakage remains possible"
        ),
        "train_rows": len(xt),
        "test_rows": len(xe),
        "features": features,
        "data_hashes": hashes,
        "versions": {
            "python": platform.python_version(),
            "sklearn": sklearn.__version__,
        },
        "models": reports,
        "anomaly": "Isolation Forest trained on benign training rows; contamination .05 is a policy setting, not measured prevalence",
        "risk_policy": "mentor-compatible-v1",
    }
    metadata = json.loads(
        json.dumps(metadata, default=str), parse_constant=lambda value: None
    )
    (ROOT / "models").mkdir(exist_ok=True)
    joblib.dump(
        {
            "features": features,
            "models": models,
            "encoder": encoder,
            "anomaly": anomaly,
            "metadata": metadata,
        },
        ROOT / "models/bundle.joblib",
    )
    (ROOT / "models/metrics.json").write_text(
        json.dumps(metadata, indent=2, default=str)
    )
    print(
        json.dumps(
            {
                k: {
                    m: v
                    for m, v in r.items()
                    if m
                    in [
                        "macro_f1",
                        "weighted_f1",
                        "attack_recall",
                        "false_positive_rate",
                        "rows_per_second",
                    ]
                }
                for k, r in reports.items()
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
