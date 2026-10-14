"""Train three models fairly on prepared real data; no holdout used for tuning."""

import argparse, json, time, platform, importlib.metadata
from pathlib import Path
import numpy as np, pandas as pd, joblib
from sklearn.ensemble import (
    RandomForestClassifier,
    ExtraTreesClassifier,
    IsolationForest,
)
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import RandomizedSearchCV, StratifiedGroupKFold
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    accuracy_score,
    average_precision_score,
    log_loss,
)
from xgboost import XGBClassifier
from prepare_cicids import FEATURES

ROOT = Path(__file__).resolve().parent


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--tune", action="store_true")
    a = p.parse_args()
    manifest = json.load(open(ROOT / "models/data_manifest.json"))
    train = pd.read_csv(
        ROOT / "data/prepared/train.csv", dtype={"feature_hash": "uint64"}
    )
    test = pd.read_csv(
        ROOT / "data/prepared/test.csv", dtype={"feature_hash": "uint64"}
    )
    assert not set(train.feature_hash) & set(test.feature_hash)
    xt = train[FEATURES]
    yt = train.Label
    xe = test[FEATURES]
    ye = test.Label
    encoder = LabelEncoder().fit(yt)
    if set(ye) - set(yt):
        raise ValueError("Holdout-only classes: " + str(set(ye) - set(yt)))
    models = {
        "random_forest": RandomForestClassifier(
            n_estimators=160,
            max_depth=22,
            class_weight="balanced_subsample",
            random_state=42,
            n_jobs=2,
        ),
        "xgboost": XGBClassifier(
            n_estimators=160,
            max_depth=6,
            learning_rate=0.08,
            subsample=0.9,
            colsample_bytree=0.9,
            n_jobs=2,
            random_state=42,
            tree_method="hist",
            eval_metric="mlogloss",
        ),
        "extra_trees": ExtraTreesClassifier(
            n_estimators=160,
            max_depth=24,
            class_weight="balanced",
            random_state=42,
            n_jobs=2,
        ),
    }
    grids = {
        "random_forest": {
            "n_estimators": [100, 160],
            "max_depth": [14, 22],
            "min_samples_leaf": [1, 2],
        },
        "xgboost": {
            "n_estimators": [100, 160],
            "max_depth": [4, 6],
            "learning_rate": [0.05, 0.1],
        },
        "extra_trees": {
            "n_estimators": [100, 160],
            "max_depth": [16, 24],
            "min_samples_leaf": [1, 2],
        },
    }
    tune = pd.concat(
        [
            g.sample(min(2000, len(g)), random_state=42)
            for _, g in train.groupby("Label")
        ]
    )
    reports = {}
    global_features = {}
    probs_all = {}
    for name, model in models.items():
        start = time.perf_counter()
        search_info = None
        target = encoder.transform(yt) if name == "xgboost" else yt
        if a.tune:
            tune_target = (
                encoder.transform(tune.Label) if name == "xgboost" else tune.Label
            )
            search = RandomizedSearchCV(
                model,
                grids[name],
                n_iter=2,
                scoring="f1_macro",
                cv=StratifiedGroupKFold(2, shuffle=True, random_state=42),
                random_state=42,
                n_jobs=1,
                error_score="raise",
            )
            search.fit(tune[FEATURES], tune_target, groups=tune.feature_hash)
            model.set_params(**search.best_params_)
            search_info = {
                "best_params": search.best_params_,
                "best_cv_macro_f1": float(search.best_score_),
                "folds": 2,
                "search_rows": len(tune),
                "candidate_results": [
                    {"params": params, "mean_macro_f1": float(score)}
                    for params, score in zip(
                        search.cv_results_["params"],
                        search.cv_results_["mean_test_score"],
                    )
                ],
            }
        model.fit(xt, target)
        models[name] = model
        fit_seconds = time.perf_counter() - start
        timings = []
        batch = xe.iloc[:1000]
        for _ in range(10):
            t = time.perf_counter()
            model.predict_proba(batch)
            timings.append((time.perf_counter() - t) * 1000)
        probabilities = model.predict_proba(xe)
        classes = (
            encoder.inverse_transform(model.classes_.astype(int))
            if name == "xgboost"
            else model.classes_
        )
        pred = classes[probabilities.argmax(axis=1)]
        probs_all[name] = (pred, probabilities.max(axis=1))
        binary_true = (ye != "BENIGN").astype(int)
        binary_pred = (pred != "BENIGN").astype(int)
        tn, fp, fn, tp = confusion_matrix(
            binary_true, binary_pred, labels=[0, 1]
        ).ravel()
        attackprob = 1 - probabilities[:, list(classes).index("BENIGN")]
        report = classification_report(
            ye, pred, labels=list(encoder.classes_), output_dict=True, zero_division=0
        )
        reports[name] = {
            "accuracy": accuracy_score(ye, pred),
            "macro_f1": f1_score(ye, pred, average="macro"),
            "weighted_f1": f1_score(ye, pred, average="weighted"),
            "attack_precision": precision_score(
                binary_true, binary_pred, zero_division=0
            ),
            "attack_recall": recall_score(binary_true, binary_pred, zero_division=0),
            "false_positive_rate": float(fp / (fp + tn)),
            "attack_average_precision": average_precision_score(
                binary_true, attackprob
            ),
            "log_loss": log_loss(ye, probabilities, labels=list(classes)),
            "classification_report": report,
            "confusion_matrix": confusion_matrix(
                ye, pred, labels=list(encoder.classes_)
            ).tolist(),
            "class_order": list(encoder.classes_),
            "binary_confusion": {
                "TN": int(tn),
                "FP": int(fp),
                "FN": int(fn),
                "TP": int(tp),
            },
            "train_seconds_including_search": fit_seconds,
            "batch_latency_p50_ms": float(np.median(timings)),
            "batch_latency_p95_ms": float(np.percentile(timings, 95)),
            "benchmark_batch_rows": len(batch),
            "benchmark_repeats": 10,
            "rows_per_second": len(batch) / (np.median(timings) / 1000),
            "holdout_rows": len(xe),
            "hyperparameters": model.get_params(),
            "search": search_info,
        }
        global_features[name] = sorted(
            [
                {"feature": f, "importance": float(v)}
                for f, v in zip(FEATURES, model.feature_importances_)
            ],
            key=lambda x: x["importance"],
            reverse=True,
        )
        print(
            name,
            "macro F1",
            round(reports[name]["macro_f1"], 4),
            "FPR",
            round(reports[name]["false_positive_rate"], 5),
            "fit_seconds",
            round(fit_seconds, 1),
            flush=True,
        )
    benign = xt[yt == "BENIGN"]
    anomaly = make_pipeline(
        SimpleImputer(strategy="median"),
        StandardScaler(),
        IsolationForest(
            n_estimators=120, contamination=0.03, random_state=42, n_jobs=2
        ),
    ).fit(benign)
    # Evaluate anomaly review behaviour without presenting it as attack classification.
    flags = anomaly.predict(xe) == -1
    anomaly_metrics = {
        "benign_flag_rate": float(flags[binary_true == 0].mean()),
        "attack_flag_rate": float(flags[binary_true == 1].mean()),
        "contamination_policy": 0.03,
        "benign_train_rows": len(benign),
        "interpretation": "Unusual behaviour review signal, not a calibrated attack probability",
    }
    disagreement = (
        pd.DataFrame({n: v[0] for n, v in probs_all.items()}).nunique(axis=1) > 1
    )
    metadata = {
        "scope": "REAL CICIDS2017 CNS2022: capped unique training and holdout samples drawn from all five original daily CSVs",
        "demo": False,
        "trained_at": pd.Timestamp.now(tz="UTC").isoformat(),
        "split": manifest["split"],
        "train_rows": len(xt),
        "test_rows": len(xe),
        "features": FEATURES,
        "data_manifest": manifest,
        "models": reports,
        "global_feature_importances": global_features,
        "anomaly_metrics": anomaly_metrics,
        "holdout_model_disagreement_rate": float(disagreement.mean()),
        "versions": {
            "python": platform.python_version(),
            **{
                p: importlib.metadata.version(p)
                for p in ["scikit-learn", "xgboost", "pandas", "numpy", "joblib"]
            },
        },
        "risk_policy": "mentor-compatible-v1",
        "probability_calibration": "Not calibrated; confidence is model-estimated class probability",
        "limitations": manifest["limitations"],
        "legacy_results": (
            json.load(open(ROOT / "docs/original_model_comparison.json"))
            if (ROOT / "docs/original_model_comparison.json").exists()
            else None
        ),
    }
    metadata = json.loads(
        json.dumps(metadata, default=str), parse_constant=lambda _: None
    )
    bundle = {
        "features": FEATURES,
        "models": models,
        "encoder": encoder,
        "anomaly": anomaly,
        "metadata": metadata,
    }
    joblib.dump(bundle, ROOT / "models/bundle.joblib", compress=3)
    (ROOT / "models/metrics.json").write_text(json.dumps(metadata, indent=2))
    for name, model in models.items():
        joblib.dump(
            model,
            ROOT
            / "backend"
            / (
                "model_rf.pkl"
                if name == "random_forest"
                else "model_xgb.pkl" if name == "xgboost" else "model_extra_trees.pkl"
            ),
            compress=3,
        )
    joblib.dump(encoder, ROOT / "backend/label_encoder.pkl")
    joblib.dump(FEATURES, ROOT / "backend/model_features.pkl")
    (ROOT / "backend/model_comparison.json").write_text(
        json.dumps(reports, indent=2, default=str)
    )
    (ROOT / "backend/traffic_summary.json").write_text(json.dumps(manifest, indent=2))
    print("SAVED real-data bundle", flush=True)


if __name__ == "__main__":
    main()
