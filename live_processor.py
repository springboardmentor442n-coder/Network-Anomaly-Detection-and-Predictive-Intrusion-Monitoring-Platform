"""Scoring pipeline: loads the trained models, preprocesses flows, predicts, adds risk scores, saves to SQL."""
import os, threading, time
from collections import Counter
from datetime import datetime, timezone
import joblib, numpy as np, pandas as pd
from sklearn.metrics import accuracy_score, classification_report, f1_score
from xgboost import XGBClassifier
from db import sql
import notifier, perf
from risk_engine import compute_risk_score

MODEL_DIR = os.getenv("NETSHIELD_MODEL_DIR", "model")
now = lambda: datetime.now(timezone.utc)
_tl = threading.local()   # remembers when predict() started, so save() can measure the whole batch
_l = lambda n: joblib.load(os.path.join(MODEL_DIR, n))

# ---------- shared preprocessing files (saved by the Colab notebook) ----------
target_encoder = _l("target_encoder.pkl")
features, medians = _l("feature_list.pkl"), _l("feature_medians.pkl")
cat_maps = {c: {v: i for i, v in enumerate(e.classes_)} for c, e in _l("categorical_encoders.pkl").items()}
print("[NetShield] Features loaded:", len(features))
print("[NetShield] Categorical columns:", len(cat_maps))

# ---------- the trained models (loaded the first time they are used) ----------
MODEL_FILES = {
    "XGBoost": ["unsw_nb15_xgboost.json", "unsw_nb15_multiclass_xgboost.pkl", "cicids2017_xgboost.pkl"],
    "Random Forest": ["unsw_nb15_multiclass_randomforest.pkl", "cicids2017_randomforest.pkl"],
    "SVM": ["unsw_nb15_multiclass_svm.pkl", "cicids2017_svm.pkl"],
}
_cache, _errors, _state = {}, {}, {"active": None}

def available():
    return [n for n, fs in MODEL_FILES.items() if any(os.path.exists(os.path.join(MODEL_DIR, f)) for f in fs)]

def get_model(name):
    if name not in _cache:
        print("[NetShield] Loading model:", name)
        try:
            path = next(os.path.join(MODEL_DIR, f) for f in MODEL_FILES[name] if os.path.exists(os.path.join(MODEL_DIR, f)))
            if path.endswith(".json"):          # native XGBoost file, works across XGBoost versions
                m = XGBClassifier(); m.load_model(path)
            else:
                m = joblib.load(path)
            _cache[name] = m; _errors.pop(name, None)
        except StopIteration:
            raise ValueError(f"No model file found for {name} in {MODEL_DIR}/")
        except Exception as e:
            _errors[name] = str(e)[:200]
            raise
        print("[NetShield] Model loaded:", name)
    return _cache[name]

def active_name():
    """The model that scores new traffic: the saved choice, else the notebook's best model, else XGBoost."""
    if _state["active"] is None:
        av = available()
        if not av:
            raise RuntimeError(f"No model files found in {MODEL_DIR}/")
        saved = sql("SELECT v FROM settings WHERE k='active_model'")
        try: cfg = _l("model_config.pkl"); best = cfg.get("best_validation_model") or cfg.get("best_model")
        except Exception: best = None
        order = ([saved[0]["v"]] if saved else []) + [best, "XGBoost"]
        _state["active"] = next((c for c in order if c in av), av[0])
    return _state["active"]

def set_active(name):
    if name not in available():
        raise ValueError(f"Model not available: {name}")
    get_model(name)
    sql("REPLACE INTO settings(k,v) VALUES('active_model',%s)", (name,))
    _state["active"] = name

_METRICS = {"Accuracy": "accuracy", "Precision_Macro": "precision", "Recall_Macro": "recall", "F1_Macro": "macro_f1",
            "F1_Weighted": "weighted_f1", "Macro F1": "macro_f1", "Weighted F1": "weighted_f1"}

def list_models():
    metrics = {}
    for fname in ("test_comparison.csv", "validation_comparison.csv", "model_comparison.csv"):   # written by the notebook
        try:
            df = pd.read_csv(os.path.join(MODEL_DIR, fname)).rename(columns=_METRICS)
            keep = [c for c in dict.fromkeys(_METRICS.values()) if c in df.columns]
            metrics = df.set_index("Model")[keep].to_dict("index")
            break
        except Exception:
            continue
    av = available()
    return [{"name": n, "available": n in av, "loaded": n in _cache, "error": _errors.get(n), "metrics": metrics.get(n)}
            for n in MODEL_FILES]

# ---------- anomaly detector (Isolation Forest trained on normal traffic, see train_anomaly.py) ----------
_anom = {"loaded": False, "obj": None}

def _anomaly():
    if not _anom["loaded"]:
        _anom["loaded"] = True
        path = os.path.join(MODEL_DIR, "anomaly_model.pkl")
        if os.path.exists(path):
            try:
                _anom["obj"] = joblib.load(path); print("[NetShield] Anomaly detector loaded")
            except Exception as e:
                print("[NetShield] Anomaly detector failed to load:", e)
    return _anom["obj"]

def anomaly_available():
    return _anomaly() is not None

def anomaly_scores(X):
    """0-100: how unlike normal traffic each flow is (0 if the detector has not been trained)."""
    a = _anomaly()
    if a is None:
        return np.zeros(len(X))
    return 100 * np.clip((a["hi"] - a["model"].score_samples(X)) / (a["hi"] - a["lo"] + 1e-9), 0, 1)

# ---------- scoring ----------
def preprocess(df):
    X = df.drop(columns=["attack_cat", "label", "id"], errors="ignore").copy()
    for col, m in cat_maps.items():
        X[col] = X[col].astype(str).str.strip().map(m).fillna(-1) if col in X else -1   # unseen category -> -1
    X = X.reindex(columns=features).apply(pd.to_numeric, errors="coerce").replace([np.inf, -np.inf], np.nan)  # missing -> medians
    return X.fillna(medians)[features]                          # same columns, same order as training

def predict(df, name=None):
    _tl.t0, _tl.rows = time.perf_counter(), len(df)
    X = preprocess(df)
    probs = get_model(name or active_name()).predict_proba(X)
    cls, conf, an = target_encoder.inverse_transform(probs.argmax(axis=1)), probs.max(axis=1), anomaly_scores(X)
    out = []
    for c, p, a in zip(cls, conf, an):
        r = compute_risk_score(str(c), float(p), float(a))      # severity x confidence + 0.3 x anomaly
        r["anomaly"] = int(round(a))
        out.append((str(c), float(p), r))
    return out

def summarize(res):
    top = sorted(range(len(res)), key=lambda i: -res[i][2]["risk_score"])[:20]  # keep messages small
    t = now().strftime("%Y-%m-%d %H:%M:%S")      # UTC; the browser shows it in local time
    return {"n": len(res), "classes": dict(Counter(r[0] for r in res)),
            "levels": dict(Counter(r[2]["risk_label"] for r in res)),
            "score_sum": sum(r[2]["risk_score"] for r in res),
            "rows": [{"time": t, "prediction": res[i][0], **res[i][2]} for i in top]}

def _labeled_sample(path, n):
    """Random rows of a labeled dataset file (UNSW-NB15 attack_cat or CICIDS2017 Label) and their class names."""
    df = pd.read_parquet(path) if path.endswith(".parquet") else pd.read_csv(path, skipinitialspace=True, encoding="latin-1")
    df.columns = df.columns.astype(str).str.strip()
    col = next((c for c in ("attack_cat", "Label") if c in df.columns), None)
    if col is None:
        raise ValueError("The dataset file has no attack_cat or Label column to compare with")
    df = df.sample(min(n, len(df)))
    y = df[col].astype(str).str.strip().str.replace(r"[^\x00-\x7F]+", "-", regex=True).replace({"BENIGN": "Normal", "": "Normal"}).values
    return df, y

def evaluate(path, n=1000, name=None):
    """Quality of one model on labeled rows: per-class precision / recall / F1, detection rate, false positive rate."""
    df, y = _labeled_sample(path, n)
    mname = name or active_name()
    t0 = time.perf_counter(); probs = get_model(mname).predict_proba(preprocess(df)); dt = time.perf_counter() - t0
    p = target_encoder.inverse_transform(probs.argmax(axis=1))
    rep = classification_report(y, p, output_dict=True, zero_division=0)
    classes = [{"name": k, "precision": float(v["precision"]), "recall": float(v["recall"]), "f1": float(v["f1-score"]), "support": int(v["support"])}
               for k, v in rep.items() if k not in ("accuracy", "macro avg", "weighted avg")]
    at, ap = y != "Normal", p != "Normal"
    tp, fn, fp, tn = int((at & ap).sum()), int((at & ~ap).sum()), int((~at & ap).sum()), int((~at & ~ap).sum())
    div = lambda a, b: float(a / b) if b else None
    return {"model": mname, "rows": int(len(y)), "accuracy": float(accuracy_score(y, p)), "macro_f1": float(f1_score(y, p, average="macro")),
            "detection_rate": div(tp, tp + fn), "false_positive_rate": div(fp, fp + tn), "precision_attack": div(tp, tp + fp),
            "tp": tp, "fn": fn, "fp": fp, "tn": tn, "classes": classes, "ms_per_1000": round(dt / len(y) * 1e6, 1)}

def compare_on_sample(path, n=500):
    """Run every available model on the same random rows and compare with the true labels."""
    df, y = _labeled_sample(path, n)
    X, out, preds = preprocess(df), [], {}
    for nm in available():
        try:
            t0 = time.perf_counter(); probs = get_model(nm).predict_proba(X); dt = time.perf_counter() - t0
            p = target_encoder.inverse_transform(probs.argmax(axis=1)); preds[nm] = p
            out.append({"name": nm, "accuracy": float(accuracy_score(y, p)),
                        "macro_f1": float(f1_score(y, p, average="macro")), "ms_per_1000": round(dt / len(X) * 1e6, 1)})
        except Exception as e:
            out.append({"name": nm, "error": str(e)[:200]})
    agree = None
    if len(preds) > 1:
        arr = np.array(list(preds.values())); agree = float((arr == arr[0]).all(axis=0).mean())
    return {"rows": len(X), "models": out, "agree": agree}

# ---------- history ----------
FLOW_COLS = ("proto", "service", "state", "dur", "sbytes", "dbytes", "srcip", "dstip")
_LIMIT = {"proto": 16, "service": 16, "state": 16, "srcip": 45, "dstip": 45}

def _flow_values(df, n):
    if df is None:
        return [(None,) * len(FLOW_COLS)] * n
    cols = [df[c].tolist() if c in df.columns else [None] * n for c in FLOW_COLS]
    def clean(v, c):
        if v is None or (isinstance(v, float) and np.isnan(v)): return None
        return str(v)[:_LIMIT[c]] if c in _LIMIT else v
    return [tuple(clean(v, c) for v, c in zip(row, FLOW_COLS)) for row in zip(*cols)]

def save(res, df=None, source="live", name="", model=None):
    """Store every prediction (class, confidence, risk, anomaly, model, flow fields, addresses) and raise alerts."""
    ts, mname, nm = now().strftime("%Y-%m-%d %H:%M:%S"), model or active_name(), (name or None) and name[:100]
    fv = _flow_values(df, len(res))
    sql("""INSERT INTO detections(ts,prediction,confidence,risk_score,risk_label,source,source_name,
           proto,service,state,dur,sbytes,dbytes,src_ip,dst_ip,model,anomaly_score)
           VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        [(ts, c, p, r["risk_score"], r["risk_label"], source, nm, *f, mname, r.get("anomaly")) for (c, p, r), f in zip(res, fv)], many=True)
    alert_rows = [(ts, c, pr, r["risk_score"], r["risk_label"], source, nm, f[6])
                  for (c, pr, r), f in zip(res, fv) if r["risk_label"] in ("High", "Critical")]
    if alert_rows:  # every High / Critical prediction also becomes an alert
        sql("INSERT INTO alerts(ts,prediction,confidence,risk_score,risk_label,source,source_name,src_ip) VALUES(%s,%s,%s,%s,%s,%s,%s,%s)",
            alert_rows, many=True)
    ms = (time.perf_counter() - getattr(_tl, "t0", time.perf_counter())) * 1000      # time since predict() started
    perf.record("batch_ms", ms, getattr(_tl, "rows", len(res)))
    if alert_rows:
        perf.record("alert_latency_ms", ms)
        try:
            notifier.alerts(alert_rows)    # webhook / email / SIEM (does nothing unless configured)
        except Exception as e:
            print("notification failed:", e)
