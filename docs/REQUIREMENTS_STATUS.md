# Mentor requirements status October 13 2026

| Request | Current implementation | Evidence and limits |
|---|---|---|
| Streamable application | Fixed chunks, off-thread scoring, SSE/polling, IDs, heartbeat, Stop, bounded buffer/window | New reader starts at row one; current bounded worker call can finish after Stop |
| Explain risk scoring | Per-model and consensus severity, confidence, formula, priority band, review reasons | Priority is out of 100, not attack probability; manual severity policy is unvalidated |
| Additional model and comparison | Tuned RF, XGBoost and Extra Trees; majority vote; benign Isolation Forest review | Same 80,439 training and 45,032 holdout examples for classifiers |
| Hyperparameters | Two randomized candidates per classifier, grouped two-fold training-only search | Modest reproducible search, not exhaustive optimization |
| Meaningful ML complexity | Three-model disagreement, anomaly review, rare-class reports, confusion matrix, global importance | Extra Trees has more false alarms here; agreement is not correctness |
| Scan CSV from backend | Root/nested data sources selected by safe relative filename | Full daily files available locally under data or data/cicids |
| IP for each record | Validated source/destination IPs, ports/protocol and timestamp retained | Missing/invalid values are explicit; current 243-row demo retains original IPs |
| Postman | Importable collection with token/scan variables, stream/poll/report/incident/export | FastAPI remains the backend; Postman is the testing client |
| Performance focus | Macro/weighted F1, attack recall, FPR, AP, log loss, per-class supports, timing and full scan benchmark | Capped feature-hash benchmark; not independent day/session validation |
| Optional LLM chatbot | Deferred | No Groq/Ollama integration |

## Original internship reference PDF

Authentication, roles, team controls, audit, CSV monitoring, attack classification, anomaly review, priority scoring, internal review alerts, grouped incident investigation, analytics, reports/export, testing and Docker packaging are implemented.

Remaining: live packet collection/flow exporter, UNSW-NB15 schema integration and training, future intrusion forecasting, external notification/threat intelligence feeds, production hardening and actual Docker/cloud deployment. Do not present these as completed.

The active stack is FastAPI, HTML/CSS/JS, SQLite, pandas, scikit-learn and XGBoost. React/Next.js and PostgreSQL/MongoDB listed in the reference are not used. Confirm with mentor whether those specific choices are mandatory.

## Dataset and experiment evidence

The official CICIDS2017 CNS2022 archive was inspected and CRC-checked. All extracted byte lengths were verified, including re-extraction of a truncated Thursday copy. The definitive preparation pass read 2,099,976 rows, excluded five invalid selected-feature rows and retained 2,099,971 valid rows. File hashes and row counts are in models/data_manifest.json.

Fitting used bounded unique per-class samples from all five days. Numeric feature hashes keep identical feature vectors in one train/holdout partition. Per-class caps alter prevalence; weighted results apply to the holdout sample. The fixed 15 features were inherited from the earlier project. No claim of prospective or day/session-independent validation is made. Rare labels have very small supports.

Your uploaded model artifacts were inspected to recover features, but original sklearn 1.9.0 pickle objects were not mixed with the current 1.8.0 model bundle. Original reported comparisons are preserved separately as historical results. Missing XGB/encoder/features/performance attachments did not prevent this consistent retraining.

## CSV guide reliability

New scan from row one; no saved reader position. Chunk-based reads; bounded worker pool and two-scan concurrency. Eight display messages and a 200-row UI window. Successful saved rows remain authoritative when display events drop. Heartbeat after about 20 seconds without output. Stop/disconnect prevents future reading; polling inactivity threshold is 30 seconds. Recoverable chunk failures continue with explicit counts; fatal read failures do not masquerade as completion. Authentication uses the Authorization header through streaming fetch. One server worker is required; no Redis/multi-worker messaging is included.

Analytics source tracking is capped at 5,000 addresses and capture-hour buckets at 512 to avoid unbounded cardinality growth. Rows and grouped incidents persist on disk; disk use grows with the scan. Browser download Blob is suitable for small exports; stream large NDJSON to a file through an API client. Deliberate completed-scan cleanup is protected and never deletes source CSVs.
