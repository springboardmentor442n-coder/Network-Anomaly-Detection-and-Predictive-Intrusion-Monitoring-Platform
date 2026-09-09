# NetShield AI Technical Pipeline

```text
DATA -> PREPROCESSING -> FEATURE ENGINEERING -> ANOMALY DETECTION
     -> ATTACK CLASSIFICATION -> INTRUSION PREDICTION -> RISK SCORING
     -> API -> DASHBOARD
```

The loader reads local CSV files in chunks. Cleaning removes duplicate rows and invalid numeric values; identifiers and timestamps are excluded from modeling to reduce identity and capture-time leakage. Numeric features receive median imputation and standardization, while categorical features receive most-frequent imputation and one-hot encoding. The `ColumnTransformer` is fitted only on the training split.

Isolation Forest supplies an unsupervised anomaly signal. A balanced Random Forest supplies attack-class predictions and probabilities. Risk is transparent: anomaly status contributes 35 points, attack probability up to 45, confidence up to 15, and a small attack-type weight; the result is clamped to 0-100 and mapped to LOW, MEDIUM, HIGH, or CRITICAL.

The current packet-monitoring boundary is explicit: dataset analytics are available through `/api/traffic/analytics`; no live packet capture is claimed. A future collector can implement the same traffic-record contract without changing the dashboard or detection service.