# NetShield AI - Architecture

## Layers

```text
React SPA (Vite + Tailwind + Chart.js)
        |
        v
FastAPI REST API  (+ WebSocket / SSE)
        |
        +-- Authentication / Authorization  (JWT, PBKDF2, analyst|admin RBAC)
        |
        +-- Monitoring services  ---- NetworkDataSource abstraction
        |
        +-- ML detection & prediction  (Random Forest + Isolation Forest)
        |
        +-- Risk scoring  (centralized, transparent, configurable)
        |
        +-- Alert & incident management
        |
        +-- Threat intelligence  (provider abstraction)
        |
        +-- Notifications  (email / Slack / webhook)
        |
        +-- Analytics & reporting
        |
        v
SQLAlchemy ORM  ->  PostgreSQL (production) | SQLite (development)
        |
        v
Model & data storage  (models/*.joblib, CICIDS2017_improved/*.csv)
```

## Backend module map

| Path | Responsibility |
|---|---|
| `backend/app/main.py` | App construction, CORS, structured error handlers, startup warnings |
| `backend/app/core/config.py` | All settings, read from environment with safe defaults |
| `backend/app/core/security.py` | PBKDF2 hashing, password policy, JWT encode/decode |
| `backend/app/core/rate_limit.py` | Rate-limit dependency and in-process limiter |
| `backend/app/core/errors.py` | Domain exception hierarchy |
| `backend/app/database.py` | Engine, session factory, `get_db` dependency |
| `backend/app/models.py` | SQLAlchemy models (15 tables) |
| `backend/app/schemas.py` | Pydantic request/response models |
| `backend/app/api/` | Route modules, one per domain |
| `backend/app/services/` | Business logic; the only place that mutates domain state |
| `backend/app/ml/` | Data loading, preprocessing, training, risk scoring |
| `backend/app/monitoring/` | `NetworkDataSource` implementations and registry |
| `backend/scripts/train_models.py` | Offline training entry point |

### API modules

| Module | Prefix |
|---|---|
| `health.py` | `/health`, `/ready` |
| `auth.py` | `/api/auth` |
| `predictions.py` | `/api/predictions` |
| `monitoring.py` | `/api/monitoring` |
| `alerts.py` | `/api/alerts` |
| `incidents.py` | `/api/incidents` |
| `analytics.py` | `/api/analytics` |
| `threat_intel.py` | `/api/threat-intel` |
| `reports.py` | `/api/reports` |
| `stream.py` | `/api/stream` |
| `admin.py` | `/api/admin` |
| `legacy.py` | `/api/ml/*`, `/api/traffic/*` (deprecated aliases) |

### Service modules

| Service | Responsibility |
|---|---|
| `ml_service.py` | Lazy model loading, inference, per-class probabilities, anomaly score |
| `prediction_service.py` | The full detection workflow (see below) |
| `monitoring_service.py` | Pull flows from a source and run them through detection |
| `alert_service.py` | Alert creation and status transitions |
| `incident_service.py` | Incident lifecycle, notes, alert linking |
| `analytics_service.py` | Corpus streaming (cached) and SQL aggregates |
| `threat_intelligence_service.py` | Provider abstraction plus local indicator store |
| `notification_service.py` | Channel abstraction with safe degradation |
| `reporting_service.py` | Report assembly and JSON/CSV/PDF export |
| `event_bus.py` | In-process pub/sub behind WebSocket, SSE and polling |

## The detection workflow

`PredictionService.predict()` is the single path every analyzed flow takes:

1. Validate the input feature mapping.
2. Run the Random Forest classifier -> predicted class, per-class probabilities,
   confidence (top-class probability), attack probability (sum of non-benign
   class probabilities).
3. Run Isolation Forest on the same preprocessed vector -> anomaly flag and
   decision-function score.
4. Compute the risk score and severity via `ml/risk.py`.
5. Persist a `Detection` row (including the feature vector as JSON).
6. Create an `Alert` when `risk_score >= NETSHIELD_ALERT_MIN_RISK_SCORE`.
7. Dispatch notifications for severities listed in `NETSHIELD_NOTIFY_SEVERITIES`.
8. Publish `detection` and `alert` events to the event bus.
9. Write an `AuditLog` entry.

Steps 6-9 are best-effort: a failure there is logged and does not fail the
request or lose the detection.

## NetworkDataSource abstraction

```text
NetworkDataSource
├── CICIDS2017DataSource   (dataset)  - chunked read of the local corpus
├── CSVReplayDataSource    (replay)   - cursor-based sequential replay
├── PacketCaptureDataSource(live)     - Scapy, optional, off by default
└── ZeekDataSource         (sensor)   - conn.log reader, optional
```

Every source yields the same `FlowEvent`. Two properties matter downstream:

- `model_ready` - true only when the source supplies **every** feature the
  trained model expects.
- `missing_features` - the exact gap when it does not.

`MonitoringService.scan()` scores only `model_ready` events. A live-capture or
Zeek flow is recorded and streamed but returned with `scored: false` and its
missing-feature list. No feature is ever synthesised to complete a vector,
which is why the replay source is the default for demonstration.

Availability is always reported, never assumed: `registry.statuses()` returns a
reason string for each unavailable source (dataset absent, capture disabled,
Scapy/Npcap missing, Zeek unconfigured) so the UI can explain itself instead of
erroring.

## Real-time transport

The client tries WebSocket, falls back to SSE, then to polling the event bus's
bounded ring buffer. All three read the same `EventBus`. Publishing is
non-blocking and drops the oldest event for a slow subscriber rather than
stalling the producer.

## Frontend structure

```text
frontend/src
├── main.jsx            React root, providers, error boundary
├── App.jsx             Shell, navigation, route table, RBAC guards
├── lib/api.js          Single API client; normalises errors into ApiError
├── lib/auth.jsx        Auth context (token + resolved profile/role)
├── lib/useStream.js    Transport-falling-back event subscription
├── components/ui.jsx   Panels, tables, badges, fields, error notices
├── components/charts.jsx  Chart.js wrappers
└── pages/              14 pages, one per navigation entry
```

No component uses `dangerouslySetInnerHTML`; all backend strings render through
React's default escaping.

## Data integrity rules encoded in the architecture

- Model metrics are read from `models/metadata.json` (written by the training
  run) and surfaced unchanged. No metric is restated in code or docs.
- Corpus analytics report the exact number of rows read, never an extrapolation.
- Threat intelligence returns `is_malicious: null` for an address it has no
  record of.
- Unconfigured notification channels record `SKIPPED`, not a fake success.
- `top_source_ips` returns an empty list until IP-bearing events exist rather
  than substituting corpus IPs, because the two populations differ.
