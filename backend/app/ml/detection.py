"""Threat detection: score real traffic records with the trained model.

Detection is *only* performed with a trained scikit-learn pipeline. If no model
is available the API returns an explicit error instead of falling back to made-up
scores. A rule-based assessment is offered as a clearly separated, opt-in
fallback (``mode="heuristic"``) and is always labelled as such in the payload.
"""

from __future__ import annotations

import time
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd

from ..config import MAX_ALERT_ROWS, MAX_DETECTION_EXPORT_ROWS, TARGET_LABELS
from ..store import (
    detection_input_path,
    detection_rows_path,
    get_model,
    new_id,
    now_iso,
    read_jsonl,
    save_detection,
    stable_hash,
    write_jsonl,
)
from .dataset import json_safe
from .schema_utils import DataValidationError, read_csv
from .targets import display_class, is_attack_label
from .training import load_artifact, prepare_features

# ---------------------------------------------------------------------------
# Documented severity rules (configurable per request)
# ---------------------------------------------------------------------------
DEFAULT_SEVERITY_RULES = {"critical": 0.9, "high": 0.75, "medium": 0.6}

SEVERITY_ORDER = {"low": 1, "medium": 2, "high": 3, "critical": 4}

SEVERITY_DOCUMENTATION = (
    "Severity is derived from the model's predicted class and its predicted "
    "probability (confidence). A record classified as Normal is always 'low' "
    "(informational). A record classified as an attack is graded by confidence: "
    "confidence >= critical threshold -> critical; >= high threshold -> high; "
    ">= medium threshold -> medium; below that -> medium (low confidence). "
    "If the model cannot produce a probability the record is graded 'medium' and "
    "the reason field states that no probability output was available."
)

CATEGORY_ACTIONS: dict[str, list[str]] = {
    "generic": [
        "Block or rate-limit the source IP at the perimeter firewall.",
        "Inspect the flow for cipher/credential swapping patterns.",
    ],
    "exploits": [
        "Patch the targeted service and validate the CVE fingerprint.",
        "Enable deep packet inspection on the affected port.",
    ],
    "dos": [
        "Enable SYN-cookie protection and upstream scrubbing.",
        "Apply per-source rate limiting and alert the ISP.",
    ],
    "fuzzers": [
        "Harden input validation on the exposed service.",
        "Block the source and capture the malformed payloads for review.",
    ],
    "reconnaissance": [
        "Rate-limit port scans and review exposed services.",
        "Add the source to the watch list; scans often precede exploitation.",
    ],
    "analysis": [
        "Inspect the traffic for data harvesting on HTTP/SMTP services.",
        "Review logs for credential or file exfiltration attempts.",
    ],
    "backdoor": [
        "Isolate the host and hunt for persistence mechanisms.",
        "Rotate credentials reachable from the affected host.",
    ],
    "shellcode": [
        "Isolate the host immediately and capture memory for forensics.",
        "Verify endpoint protection is active and up to date.",
    ],
    "worms": [
        "Contain the host and check for lateral movement.",
        "Apply the missing patches and segment the network.",
    ],
    "_attack": [
        "Investigate the flow in the SIEM and correlate with endpoint telemetry.",
        "Apply the appropriate containment playbook before closing the alert.",
    ],
    "_normal": ["No action required. Keep the record for baseline trending."],
}


def _actions_for(display_label: str) -> list[str]:
    key = (display_label or "").strip().lower()
    if key in CATEGORY_ACTIONS:
        return CATEGORY_ACTIONS[key]
    return CATEGORY_ACTIONS["_normal"]


def _action_text(display_label: str) -> str:
    return " ".join(_actions_for(display_label))


def severity_for(display_label: str, confidence: float | None, rules: dict) -> tuple[str, str]:
    """Return ``(severity, reason)`` using the documented, configurable rules."""
    if not is_attack_label(None, display_label) and display_label.strip().lower() == "normal":
        return "low", "Model classified the record as normal traffic (informational)."

    if confidence is None:
        return (
            "medium",
            "Model classified the record as an attack but does not output a probability; "
            "graded 'medium' by default.",
        )

    if confidence >= float(rules.get("critical", DEFAULT_SEVERITY_RULES["critical"])):
        return "critical", f"Attack with confidence {confidence:.2%} (>= critical threshold)."
    if confidence >= float(rules.get("high", DEFAULT_SEVERITY_RULES["high"])):
        return "high", f"Attack with confidence {confidence:.2%} (>= high threshold)."
    if confidence >= float(rules.get("medium", DEFAULT_SEVERITY_RULES["medium"])):
        return "medium", f"Attack with confidence {confidence:.2%} (>= medium threshold)."
    return "medium", f"Attack with confidence {confidence:.2%} (below medium threshold; low confidence)."


def validate_detection_file(path: str | Path) -> pd.DataFrame:
    """Detection input needs rows and columns - a target column is NOT required."""
    frame = read_csv(path)
    if frame.shape[0] == 0:
        raise DataValidationError("The traffic file contains a header but no rows to score.")
    if frame.shape[1] == 0:
        raise DataValidationError("The traffic file has no columns.")
    return frame


def _heuristic_score(row: pd.Series, feature_columns: list[str]) -> tuple[float, list[str]]:
    """Rule-based fallback assessment (never presented as an ML prediction)."""
    reasons: list[str] = []
    score = 0.0
    for column in feature_columns:
        if column not in row.index:
            continue
        value = row[column]
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            continue
        if np.isnan(numeric):
            continue
        if column == "rate" and numeric > 1000:
            score += 0.3
            reasons.append(f"high packet rate ({numeric:g})")
        elif column == "ct_dst_src_ltm" and numeric > 20:
            score += 0.2
            reasons.append(f"many flows to the same destination/source ({numeric:g})")
        elif column == "ct_srv_dst" and numeric > 20:
            score += 0.2
            reasons.append(f"high service/destination count ({numeric:g})")
        elif column in {"sbytes", "dbytes"} and numeric > 5_000_000:
            score += 0.2
            reasons.append(f"very large byte volume on {column} ({numeric:g})")
        elif column == "sttl" and numeric == 0:
            score += 0.15
            reasons.append("source TTL of 0 (spoofed or malformed packet)")
    return min(score, 1.0), reasons


def run_detection(
    *,
    source_path: str | Path,
    source_filename: str,
    model_id: str | None,
    mode: str = "model",
    severity_rules: dict | None = None,
    detection_id: str | None = None,
    progress=None,
) -> dict:
    """Score every record in ``source_path`` and persist the detection run."""
    def emit(percent: int, message: str) -> None:
        if progress:
            progress(percent, message)

    rules = {**DEFAULT_SEVERITY_RULES, **(severity_rules or {})}
    started = time.time()

    emit(5, "Validating traffic file")
    frame = validate_detection_file(source_path)
    if len(frame) > MAX_DETECTION_EXPORT_ROWS:
        frame = frame.head(MAX_DETECTION_EXPORT_ROWS)

    warnings: list[str] = []
    artifact = None
    meta = None
    if mode == "model":
        emit(12, "Loading trained model")
        if not model_id:
            raise DataValidationError(
                "No trained model is available. Train a model on the Model Training page first."
            )
        meta = get_model(model_id)
        if not meta:
            raise DataValidationError("The requested model was not found. Train it again.")
        artifact = load_artifact(model_id)

        missing = [c for c in artifact["featureColumns"] if c not in frame.columns]
        if missing:
            warnings.append(
                f"{len(missing)} feature column(s) expected by the model are absent "
                f"({', '.join(missing[:6])}{'...' if len(missing) > 6 else ''}); "
                "the fitted pipeline imputed them."
            )
        X = prepare_features(frame, artifact)
        pipeline = artifact["pipeline"]
        can_probability = hasattr(pipeline, "predict_proba")

        emit(30, "Scoring traffic records")
        predictions = pipeline.predict(X)
        probabilities = pipeline.predict_proba(X) if can_probability else None
    else:
        emit(20, "Running rule-based assessment")
        can_probability = False
        probabilities = None
        predictions = None
        X = None

    target = meta["target"] if meta else None
    model_classes = list(artifact["classes"]) if artifact else []

    emit(60, "Applying severity rules")
    results: list[dict] = []
    severity_counter: Counter = Counter()
    category_counter: Counter = Counter()
    attack_count = 0
    normal_count = 0

    preview_features = []
    if artifact:
        preview_features = [c for c in artifact["featureColumns"]][:8]
    else:
        preview_features = [str(c) for c in frame.columns][:8]

    for position in range(len(frame)):
        source_row = frame.iloc[position]
        if mode == "model":
            raw_prediction = predictions[position]
            display_label = display_class(target, raw_prediction)
            confidence = None
            if probabilities is not None:
                value = float(probabilities[position].max())
                confidence = round(value, 6)
            attack = is_attack_label(target, raw_prediction)
            attack_category = display_label if attack and target and target != "label" else None
            reason_prefix = "ML model prediction"
        else:
            score, markers = _heuristic_score(source_row, [str(c) for c in frame.columns])
            attack = score >= 0.5
            display_label = "Suspected anomaly" if attack else "Normal"
            confidence = round(score, 4) if attack else None
            attack_category = None
            reason_prefix = "Rule-based assessment (NOT a machine-learning prediction)"
            if markers:
                reason_prefix += ": " + "; ".join(markers)
            raw_prediction = display_label

        severity, severity_reason = severity_for(display_label, confidence, rules)
        if not attack:
            severity = "low"

        if attack:
            attack_count += 1
        else:
            normal_count += 1
        severity_counter[severity] += 1
        if attack_category:
            category_counter[str(attack_category)] += 1

        actions = _actions_for(attack_category or display_label)
        input_features = {
            str(column): json_safe(source_row[column]) for column in preview_features
        }
        fingerprint = stable_hash(
            display_label,
            attack_category or "",
            severity,
            "|".join(f"{k}={v}" for k, v in sorted(input_features.items())),
        )

        results.append(
            {
                "recordIndex": position,
                "recordReference": f"ROW-{position:06d}",
                "predictedClass": json_safe(raw_prediction),
                "predictedLabel": display_label,
                "attackCategory": attack_category,
                "isThreat": bool(attack),
                "confidence": confidence,
                "confidenceSupported": bool(probabilities is not None) if mode == "model" else False,
                "severity": severity,
                "severityScore": SEVERITY_ORDER.get(severity, 1),
                "detectionReason": f"{reason_prefix}. {severity_reason}",
                "recommendedActions": actions,
                "recommendedAction": _action_text(attack_category or display_label),
                "inputFeatures": input_features,
                "fingerprint": fingerprint,
            }
        )
        if position % 5000 == 0 and position:
            emit(60 + int(30 * position / len(frame)), f"Scored {position}/{len(frame)} records")

    detection_id = detection_id or new_id("det")
    emit(92, "Writing detection results")
    write_jsonl(detection_rows_path(detection_id), results)

    # Keep the exact input file so the UI can show record details later.
    try:
        detection_input_path(detection_id).write_bytes(Path(source_path).read_bytes())
    except OSError:
        pass

    recommendation_summary = _summarise_recommendations(results)

    record = {
        "id": detection_id,
        "mode": mode,
        "modeLabel": "Machine-learning model" if mode == "model" else "Rule-based assessment",
        "modelId": model_id if mode == "model" else None,
        "algorithmLabel": meta.get("algorithmLabel") if meta else None,
        "target": target,
        "targetLabel": TARGET_LABELS.get(target, target) if target else None,
        "modelDatasetName": meta.get("datasetName") if meta else None,
        "modelTrainedAt": meta.get("trainedAt") if meta else None,
        "sourceFilename": source_filename,
        "createdAt": now_iso(),
        "rowsScanned": int(len(frame)),
        "predictedAttackCount": int(attack_count),
        "predictedNormalCount": int(normal_count),
        "attackRate": round(attack_count / len(frame) * 100, 2) if len(frame) else 0.0,
        "severityCounts": {k: int(v) for k, v in severity_counter.items()},
        "categoryCounts": {k: int(v) for k, v in category_counter.items()},
        "confidenceSupported": bool(probabilities is not None) if mode == "model" else False,
        "classes": model_classes,
        "displayClasses": [display_class(target, c) for c in model_classes] if target else [],
        "severityRules": rules,
        "severityDocumentation": SEVERITY_DOCUMENTATION,
        "warnings": warnings,
        "recommendationSummary": recommendation_summary,
        "durationSeconds": round(time.time() - started, 2),
        "rowsFile": detection_rows_path(detection_id).name,
        "alertsCreated": 0,
    }

    save_detection(record)
    emit(100, "Detection complete")
    return record


def _summarise_recommendations(results: list[dict]) -> list[dict]:
    counter: Counter = Counter()
    for row in results:
        if row["isThreat"]:
            counter[row["attackCategory"] or "Attack (unspecified category)"] += 1
    summary = []
    for name, count in counter.most_common(8):
        summary.append(
            {
                "threat": name,
                "count": int(count),
                "actions": _actions_for(name),
            }
        )
    if not summary:
        summary.append(
            {
                "threat": "No threats detected",
                "count": 0,
                "actions": CATEGORY_ACTIONS["_normal"],
            }
        )
    return summary


def detection_results_csv(results: list[dict]) -> str:
    columns = [
        ("recordReference", "record_reference"),
        ("predictedLabel", "predicted_class"),
        ("attackCategory", "attack_category"),
        ("confidence", "confidence"),
        ("severity", "risk_severity"),
        ("detectionReason", "detection_explanation"),
        ("recommendedAction", "recommended_action"),
    ]
    header = ",".join(name for _, name in columns)
    rows = [header]
    for item in results:
        values = []
        for key, _ in columns:
            value = item.get(key)
            text = "" if value is None else str(value)
            if any(ch in text for ch in [",", '"', "\n"]):
                text = '"' + text.replace('"', '""') + '"'
            values.append(text)
        rows.append(",".join(values))
    return "\n".join(rows) + "\n"


def read_results(detection_id: str) -> list[dict]:
    """Read the persisted detection rows back into dictionaries."""
    return read_jsonl(detection_rows_path(detection_id))


def fire_alerts(detection: dict) -> dict:
    """Materialise security alerts from a detection run.

    Only records the model flagged as threats become alerts. Duplicate alerts are
    prevented by a stable fingerprint (see :mod:`app.alerts`).
    """
    from ..alerts import create_alerts

    if detection.get("mode") != "model":
        return {
            "created": 0,
            "duplicates": 0,
            "skipped": True,
            "message": (
                "Alerts are only generated from machine-learning detections. "
                "Rule-based runs are kept as assessments and do not raise alerts."
            ),
        }

    rows = read_results(detection["id"])
    threats = [row for row in rows if _is_truthy(row.get("isThreat"))]
    return create_alerts(detection, threats[:MAX_ALERT_ROWS], total_threats=len(threats))


def _is_truthy(value) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"true", "1", "yes"}
