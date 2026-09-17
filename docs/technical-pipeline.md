# NetShield AI - Technical Pipeline

```text
DATA -> PREPROCESSING -> FEATURE ENGINEERING -> ANOMALY DETECTION
     -> ATTACK CLASSIFICATION -> INTRUSION PREDICTION -> RISK SCORING
     -> ALERTING -> API -> DASHBOARD
```

## 1. Data loading

CSV files under `CICIDS2017_improved/` are read in chunks
(`NETSHIELD_ANALYTICS_CHUNK_SIZE`, default 50,000 rows). The corpus is ~1.1 GB
and is never loaded whole - neither for analytics nor for training.

The label column is discovered by name (`Label`, `Class`, `attack_cat`,
`attack category`, `target`), so the loader also accepts UNSW-NB15 style files.

## 2. Cleaning

- `±inf` is replaced with `NaN`.
- Rows with a missing label are dropped.
- Exact duplicate rows are dropped.

## 3. Feature engineering and leakage control

These columns are excluded from the model feature set:

```text
id, Flow ID, Timestamp, Src IP, Dst IP, Source IP, Destination IP, Source_File
```

Excluding IPs and timestamps prevents the classifier from memorising which host
or which capture window an attack came from instead of learning flow behaviour.

Transformations:

| Feature kind | Imputation | Encoding |
|---|---|---|
| Numeric | median | `StandardScaler` |
| Categorical | most frequent | `OneHotEncoder(handle_unknown="ignore")` |

The `ColumnTransformer` is fitted **only on the training split**, then applied
to the test split.

## 4. Models

| Model | Type | Purpose |
|---|---|---|
| `RandomForestClassifier` | supervised, 100 trees, `class_weight="balanced"` | attack-class prediction and per-class probabilities |
| `IsolationForest` | unsupervised, 100 trees, `contamination="auto"` | out-of-distribution flag and anomaly score |

Both are persisted with joblib to `models/`. The anomaly artifact stores the
fitted preprocessor alongside the detector so inference reproduces the training
transformation exactly.

Training: `python -m backend.scripts.train_models`. This is the **only** way to
produce or replace a model. It is not reachable from the API - see
[security.md](security.md).

## 5. Evaluation

The training run writes real measured values to `models/metadata.json`:
accuracy, macro precision/recall/F1, weighted F1, the full per-class
classification report, and the confusion matrix. The API and dashboard read
that file and display it unchanged.

**Reading the numbers honestly.** The corpus is dominated by `BENIGN`, so
accuracy is not a useful headline figure. Macro F1 is the number that reflects
multi-class performance, and several rare classes (for example `Heartbleed`,
`Infiltration`) have very low or zero support in the held-out split, which the
per-class table on the Model page shows explicitly.

## 6. Inference

For one flow:

1. `predict()` -> class label.
2. `predict_proba()` -> per-class probabilities.
   - `confidence` = highest probability.
   - `attack_probability` = sum of probabilities over all non-benign classes.
3. `preprocessor.transform()` then `IsolationForest.predict()` -> `-1` means
   anomalous. `decision_function()` supplies the anomaly score when available.

## 7. Risk scoring

Centralized in `backend/app/ml/risk.py`. There is no model here - it is a
weighted sum, and every term is reported by `explain()`.

```text
score = anomaly_points
      + attack_probability_weight x clamp01(attack_probability)
      + confidence_weight         x clamp01(confidence)
      + attack_type_points(prediction)

score = clamp(round(score), 0, 100)
```

| Term | Default | Environment variable |
|---|---|---|
| anomaly_points | 35 | `NETSHIELD_RISK_ANOMALY_POINTS` |
| attack_probability_weight | 45 | `NETSHIELD_RISK_ATTACK_WEIGHT` |
| confidence_weight | 15 | `NETSHIELD_RISK_CONFIDENCE_WEIGHT` |
| unknown-type points | 10 | `NETSHIELD_RISK_UNKNOWN_TYPE_POINTS` |

Attack-family weights: `DDoS` 35, `Heartbleed` 35, `DoS` 30, `Bot`/`Botnet` 30,
`Infiltration` 30, `Web Attack` 25, `Patator` 25, `Reconnaissance`/`Portscan` 20,
`Benign`/`Normal` 0.

Severity mapping (all configurable):

| Severity | Threshold | Variable |
|---|---|---|
| CRITICAL | >= 85 | `NETSHIELD_SEVERITY_CRITICAL` |
| HIGH | >= 65 | `NETSHIELD_SEVERITY_HIGH` |
| MEDIUM | >= 35 | `NETSHIELD_SEVERITY_MEDIUM` |
| LOW | < 35 | - |

`GET /api/analytics/risk-policy` returns the live configuration, and
`POST /api/predictions/explain` returns a full breakdown for any input. Both use
the same code path as scoring, so an explanation cannot drift from the score.

### Two deliberate changes to the original scoring behaviour

**Family matching is now substring-based.** The original lookup was an exact
dictionary hit (`SEVERITY_WEIGHTS.get(prediction, ...)`) against keys like
`"DoS"` and `"Benign"`. The corpus labels are `"BENIGN"`, `"DoS Hulk"`,
`"Web Attack - Brute Force - Attempted"` - none of which matched, so in practice
every real label fell through to the default branch and the weight table was
inert. Matching is now case-insensitive and substring-based, longest family
first (so `DDoS` wins over `DoS`).

Consequence: a confidently-benign flow no longer receives the
unrecognised-label points it used to collect, and real attack labels now receive
their intended family weight.

**The default alert threshold is 65, not 35.** Under the formula above, a flow
the classifier labels `BENIGN` with ~99% confidence but which Isolation Forest
flags as an outlier scores `35 + ~0.5 + ~14.9 = ~50` (MEDIUM). With a MEDIUM
threshold, routine benign traffic generated alerts. The default is therefore
`NETSHIELD_ALERT_MIN_RISK_SCORE=65`; lower it if you want MEDIUM detections to
raise alerts.

## 8. Alerting

An alert is created when `risk_score >= NETSHIELD_ALERT_MIN_RISK_SCORE`. It
carries severity, risk score, attack type, source/destination IP (when the
caller supplied them) and a reference to the detection.

Statuses: `NEW -> ACKNOWLEDGED -> INVESTIGATING -> RESOLVED`, with
`FALSE_POSITIVE` available at any point. Acknowledge and resolve record the
acting user and a timestamp.

Notifications fire only for severities in `NETSHIELD_NOTIFY_SEVERITIES`
(default `CRITICAL`).

## 9. Monitoring boundary

| Source | Feature coverage | Scoreable |
|---|---|---|
| `cicids2017` | full (85 features) | yes |
| `csv_replay` | full (85 features) | yes |
| `packet_capture` | ~16 observable features | no |
| `zeek` | ~8 observable features | no |

A sniffed packet or a Zeek `conn.log` row simply does not contain most
CICIDS2017 features (subflow statistics, bulk-rate averages, active/idle
windows, and so on). Rather than pad the vector with zeros and produce a
meaningless prediction, partial flows are recorded and streamed with
`scored: false` and an explicit `missing_features` list.

This is why `csv_replay` is the default demonstration source: it advances a
cursor through **real** dataset rows, giving genuine real-time-like detection
behaviour on a static corpus without fabricating traffic.

To make live capture scoreable, a model would need to be trained on the feature
subset a packet capture can actually provide. That is a training-side change and
is not attempted here.

## 10. Performance

- Chunked CSV reads bound memory regardless of corpus size.
- Corpus analytics are cached for `NETSHIELD_ANALYTICS_CACHE_SECONDS`
  (default 300s), so dashboard refreshes do not rescan gigabytes.
- Analytics sampling is capped by `NETSHIELD_ANALYTICS_SAMPLE_LIMIT`
  (default 250,000 rows) and reports the exact count read.
- Models are loaded lazily and cached on the service instance.
- Operational analytics are SQL `GROUP BY`/`COUNT` aggregates, not Python loops
  over full tables.
- Alert, detection and audit tables are indexed on timestamp, severity, status
  and IP columns.
- List endpoints paginate via `limit`/`offset`.

## 11. UNSW-NB15

The loader recognises UNSW-NB15 directory names (`UNSW-NB15/`, `UNSW_NB15/`) and
its label columns (`attack_cat`, `Class`). No UNSW files are present in this
repository, so **no UNSW result is reported anywhere**. To use it:

1. Place the CSVs in `UNSW-NB15/` under `NETSHIELD_DATA_ROOT`.
2. Train with `dataset="unsw"` via `train_models(root, model_root, dataset="unsw")`.
3. Note that a model trained on UNSW features cannot score CICIDS2017 rows - the
   feature sets differ. Keep separate model directories per dataset.
