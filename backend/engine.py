"""Inference never reads Label, IP addresses or timestamps as model features."""

import ipaddress, re, time
from pathlib import Path
from collections import Counter
import joblib
import numpy as np
import pandas as pd

SEVERITY = {
    "BENIGN": 0,
    "Portscan": 30,
    "Infiltration - Portscan": 35,
    "FTP-Patator": 45,
    "SSH-Patator": 45,
    "Web Attack - Brute Force": 50,
    "Web Attack - XSS": 55,
    "DoS Slowloris": 60,
    "DoS Slowhttptest": 60,
    "DoS Hulk": 70,
    "DoS GoldenEye": 70,
    "Web Attack - SQL Injection": 75,
    "Botnet": 80,
    "Infiltration": 85,
    "DDoS": 90,
    "Heartbleed": 95,
}


def norm(x):
    return re.sub("[^a-z0-9]", "", str(x).strip().lower())


_SEVERITY_LOOKUP = {norm(k): v for k, v in SEVERITY.items()}


def severity(label):
    return _SEVERITY_LOOKUP.get(norm(label), 50)


def risk(label, confidence):
    base = severity(label)
    score = int(round(base * float(confidence)))
    return {
        "risk_score": score,
        "risk_label": (
            "Low"
            if score <= 25
            else "Medium" if score <= 50 else "High" if score <= 75 else "Critical"
        ),
        "severity": base,
        "confidence": round(float(confidence), 6),
        "formula": "round(severity × classifier confidence)",
        "policy_version": "mentor-compatible-v1",
        "unknown_severity": norm(label) not in _SEVERITY_LOOKUP,
    }


def ip(value):
    if pd.isna(value):
        return {"value": None, "status": "missing"}
    try:
        parsed = ipaddress.ip_address(str(value).strip())
        return {"value": str(parsed), "status": "valid", "private": parsed.is_private}
    except ValueError:
        return {"value": str(value), "status": "invalid"}


class Engine:
    def __init__(self, path):
        self.bundle = joblib.load(path)
        self.features = self.bundle["features"]
        stored_models = self.bundle["models"]
        if "native_xgboost" in self.bundle:
            # Native model JSON avoids unpickling XGBoost's platform-dependent memory snapshot.
            from xgboost import XGBClassifier

            native_path = Path(path).parent / self.bundle["native_xgboost"]
            if not native_path.is_file():
                raise FileNotFoundError(
                    f"Missing native XGBoost model: {native_path}. Copy both updated models files."
                )
            native_model = XGBClassifier(n_jobs=2, device="cpu")
            native_model.load_model(native_path)
            native_model.set_params(n_jobs=2, device="cpu")
            stored_models["xgboost"] = native_model
        self.models = {
            name: stored_models[name]
            for name in ("random_forest", "xgboost", "extra_trees")
        }
        self.bundle["models"] = self.models

    def mapping(self, columns):
        aliases = {
            "avgfwdsegmentsize": "fwdsegmentsizeavg",
            "avgbwdsegmentsize": "bwdsegmentsizeavg",
            "maxpacketlength": "packetlengthmax",
            "minpacketlength": "packetlengthmin",
        }
        names = {norm(c): c for c in self.features}
        mapping = {}
        for c in columns:
            key = aliases.get(norm(c), norm(c))
            if key in names:
                if names[key] in mapping.values():
                    raise ValueError("Ambiguous feature columns: " + names[key])
                mapping[c] = names[key]
        missing = set(self.features) - set(mapping.values())
        if missing:
            raise ValueError("Missing required features: " + ", ".join(sorted(missing)))
        return mapping

    def score(self, chunk, offset):
        started = time.perf_counter()
        mapping = self.mapping(chunk.columns)
        numeric = (
            chunk.rename(columns=mapping)[self.features]
            .apply(pd.to_numeric, errors="coerce")
            .replace([np.inf, -np.inf], np.nan)
        )
        valid = ~numeric.isna().any(axis=1)
        good = numeric.loc[valid]
        good_values = good.to_numpy(copy=False)
        predictions = {}
        timing = {}
        for name, model in self.models.items():
            t = time.perf_counter()
            probabilities = model.predict_proba(good) if len(good) else np.empty((0, 0))
            classes = model.classes_
            if name == "xgboost":
                classes = self.bundle["encoder"].inverse_transform(classes.astype(int))
            predictions[name] = (
                classes[probabilities.argmax(axis=1)] if len(good) else [],
                probabilities.max(axis=1) if len(good) else [],
            )
            timing[name] = round((time.perf_counter() - t) * 1000, 3)
        anomalies = self.bundle["anomaly"].predict(good) if len(good) else []
        columns = {norm(c): c for c in chunk.columns}

        def column(options):
            return next((columns[norm(c)] for c in options if norm(c) in columns), None)

        src = column(["Src IP", "Source IP", "SrcIP", "Source Address"])
        dst = column(["Dst IP", "Destination IP", "DstIP", "Destination Address"])
        proto = column(["Protocol", "proto"])
        stamp = column(["Timestamp", "stime"])
        results = []
        j = 0
        for i, (_, row) in enumerate(chunk.iterrows()):
            item = {
                "row_number": offset + i + 1,
                "src_ip": (
                    ip(row[src]) if src else {"value": None, "status": "column_absent"}
                ),
                "dst_ip": (
                    ip(row[dst]) if dst else {"value": None, "status": "column_absent"}
                ),
                "protocol": str(row[proto]) if proto else None,
                "timestamp": str(row[stamp]) if stamp else None,
                "src_port": (
                    str(row[columns["srcport"]]) if "srcport" in columns else None
                ),
                "dst_port": (
                    str(row[columns["dstport"]]) if "dstport" in columns else None
                ),
                "ip_provenance": (
                    str(row[columns["ipprovenance"]])
                    if "ipprovenance" in columns
                    else "CSV supplied; original provenance not independently verified"
                ),
            }
            if not valid.iloc[i]:
                item.update(
                    status="invalid",
                    error="Missing, nonnumeric or infinite required feature; row excluded from inference.",
                )
                results.append(item)
                continue
            models = {}
            for name, (labels, conf) in predictions.items():
                label = str(labels[j])
                models[name] = {"predicted_class": label, **risk(label, conf[j])}
            labels = [m["predicted_class"] for m in models.values()]
            counts = Counter(labels)
            chosen = counts.most_common(1)[0][0]
            # Stable tie-break uses RF; disagreement is visible, never labelled an attack probability.
            if max(counts.values()) == 1:
                chosen = models["random_forest"]["predicted_class"]
            item.update(
                status="scored",
                models=models,
                consensus=chosen,
                models_agree=len(set(labels)) == 1,
                anomaly=bool(anomalies[j] == -1),
                **risk(
                    chosen,
                    np.mean(
                        [
                            m["confidence"]
                            for m in models.values()
                            if m["predicted_class"] == chosen
                        ]
                    ),
                ),
            )
            item["review_reasons"] = []
            if not item["models_agree"]:
                item["review_reasons"].append("Model disagreement")
            if min(m["confidence"] for m in models.values()) < 0.6:
                item["review_reasons"].append("At least one model confidence below 60%")
            if item["anomaly"]:
                item["review_reasons"].append("Isolation Forest unusual behaviour flag")
            if item["risk_score"] >= 51:
                item["review_reasons"].append("High or Critical policy priority")
            item["needs_review"] = bool(item["review_reasons"])
            item["feature_evidence"] = {
                f: float(v) for f, v in zip(self.features, good_values[j])
            }
            item["consensus_rule"] = "Majority vote; three-way tie uses Random Forest"
            item["protocol_name"] = {
                "6": "TCP",
                "17": "UDP",
                "1": "ICMP",
                "6.0": "TCP",
                "17.0": "UDP",
                "1.0": "ICMP",
            }.get(item["protocol"], item["protocol"] or "Unavailable")
            results.append(item)
            j += 1
        return results, {
            "model_ms": timing,
            "pipeline_ms": round((time.perf_counter() - started) * 1000, 3),
            "valid": len(good),
            "invalid": int((~valid).sum()),
        }
