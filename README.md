# NetShield AI

Network anomaly detection and predictive intrusion monitoring platform.

A FastAPI backend and React SOC console over the local WTMC2021/CICIDS2017 flow
corpus: chunked ingestion, leakage-safe preprocessing, Isolation Forest anomaly
detection, Random Forest attack classification, transparent risk scoring, alert
and incident management, threat-intelligence enrichment, real-time streaming,
reporting, and RBAC-protected administration.

## What this is honest about

- **Model metrics** come from `models/metadata.json`, written by the actual
  evaluation run. No figure is restated in code, docs or UI. The Model page
  highlights macro F1 over accuracy because the corpus is benign-dominated, and
  shows per-class results including the classes with zero support.
- **Live packet capture** is implemented behind an abstraction but is off by
  default and, when enabled, produces flows that are **not** scored against the
  CICIDS2017 model - a sniffed packet cannot supply most of the 85 trained
  features. Those flows are recorded with an explicit `missing_features` list
  instead of a padded vector. CSV replay is the scoreable demonstration mode.
- **Threat intelligence** returns `is_malicious: null` for an address it has no
  record of, and reports `provider_configured: false` when no external provider
  is set up.
- **Notifications** record `SKIPPED` when unconfigured. Nothing is faked.
- **UNSW-NB15** is supported by the loader but absent from this repository, so
  no UNSW result is reported anywhere.
- **Deployment**: not deployed. `docs/deployment.md` describes how to.

## Quick start

```powershell
# 1. Backend dependencies
python -m pip install -r requirements.txt

# 2. Configuration (optional for local dev, required for anything shared)
Copy-Item .env.example .env
$env:NETSHIELD_JWT_SECRET = "a-local-secret-at-least-32-characters"

# 3. Train models (once; needed for detection)
python -m backend.scripts.train_models

# 4. Start the API on http://127.0.0.1:8000
python -m backend
```

```powershell
# 5. Frontend on http://127.0.0.1:5173 (proxies /api to the backend)
cd frontend
npm install
npm run dev
```

### If port 8000 is already taken

`python -m backend` refuses to start rather than silently losing the port to
another process - otherwise that other application answers your requests and
the dashboard shows confusing `Not Found` errors. Pick another port and point
the frontend at it:

```powershell
$env:NETSHIELD_PORT = "8001"
python -m backend
```

```ini
# frontend/.env
VITE_PROXY_TARGET=http://127.0.0.1:8001
```

Restart `npm run dev` after editing `frontend/.env`. To see what holds a port:

```powershell
netstat -ano | findstr :8000
Get-Process -Id <PID>
```

Tests:

```powershell
pytest -q
```

Docker (frontend on `http://localhost:8080`):

```bash
cp .env.example .env    # set POSTGRES_PASSWORD and NETSHIELD_JWT_SECRET
docker compose up --build
```

## Architecture

```text
React SPA (Vite + Tailwind + Chart.js)
        |
FastAPI REST API + WebSocket/SSE
        |
   Auth/RBAC -> Monitoring -> ML detection -> Risk scoring
        -> Alerts -> Incidents -> Threat intel -> Notifications
        -> Analytics -> Reporting
        |
SQLAlchemy -> PostgreSQL (production) | SQLite (development)
        |
models/*.joblib   CICIDS2017_improved/*.csv
```

Full detail in [docs/architecture.md](docs/architecture.md).

## Repository layout

| Path | Contents |
|---|---|
| `backend/app/api/` | Route modules, one per domain |
| `backend/app/services/` | Business logic (ML, alerts, incidents, analytics, TI, notifications, reporting, event bus) |
| `backend/app/monitoring/` | `NetworkDataSource` implementations and registry |
| `backend/app/ml/` | Loading, preprocessing, training, risk scoring |
| `backend/app/core/` | Config, security, rate limiting, errors |
| `backend/scripts/train_models.py` | Offline training entry point |
| `frontend/` | React SPA (14 pages) |
| `frontend-legacy/` | The original dependency-free dashboard, kept for reference |
| `tests/` | 187 tests |
| `docs/` | Architecture, pipeline, API, security, deployment, user guide |
| `CICIDS2017_improved/` | Local raw flow CSVs (git-ignored, never modified) |

## Monitoring sources

```text
NetworkDataSource
├── CICIDS2017DataSource    dataset, full feature set, scoreable
├── CSVReplayDataSource     cursor replay, full feature set, scoreable  <- default
├── PacketCaptureDataSource live via Scapy, partial features, not scoreable
└── ZeekDataSource          conn.log, partial features, not scoreable
```

`GET /api/monitoring/sources` reports availability with a reason for anything
unavailable, so the dashboard explains itself rather than erroring. The platform
runs with none of the optional sources present.

## Risk scoring

```text
score = anomaly_points(35)
      + attack_probability_weight(45) x attack_probability
      + confidence_weight(15)         x confidence
      + attack_type_points(prediction)
clamped to 0-100
```

Severity: CRITICAL >= 85, HIGH >= 65, MEDIUM >= 35, else LOW. Every weight and
threshold is an environment variable. `POST /api/predictions/explain` and the
Detection page return a per-term breakdown, so a score is never a black box.

Two deliberate changes from the original MVP behaviour are documented in
[docs/technical-pipeline.md](docs/technical-pipeline.md#two-deliberate-changes-to-the-original-scoring-behaviour):
attack-family matching is now substring-based (the old exact-match table never
matched real labels such as `DoS Hulk`), and the default alert threshold is 65
rather than 35 so confidently-benign outliers do not raise alerts.

## API

Interactive schema at `/docs`. Full reference in [docs/api.md](docs/api.md).

| Area | Prefix |
|---|---|
| Health | `/health`, `/ready` |
| Authentication | `/api/auth` |
| Predictions | `/api/predictions` |
| Monitoring | `/api/monitoring` |
| Alerts | `/api/alerts` |
| Incidents | `/api/incidents` |
| Analytics | `/api/analytics` |
| Threat intelligence | `/api/threat-intel` |
| Reports | `/api/reports` |
| Streaming | `/api/stream` |
| Admin (admin role) | `/api/admin` |

The pre-2.0 paths `/api/ml/predict`, `/api/ml/model-info`, `/api/ml/metrics` and
`/api/traffic/analytics` still work and return their original response shapes.

## Security

PBKDF2-HMAC-SHA256 password hashing (120k iterations, per-password salt), JWT
auth, analyst/admin RBAC, password strength policy, rate-limited auth endpoints,
bounded query parameters, allow-listed enum inputs, ORM-only database access,
no `dangerouslySetInnerHTML` in the frontend, structured errors that do not leak
internals, and audit logging that never records credentials.

Training is not reachable from the API: models are produced only by running the
training script on the host, so no request can trigger model code execution.

Details and the pre-deployment checklist: [docs/security.md](docs/security.md).

## Configuration

All settings are environment variables with safe defaults; see
[.env.example](.env.example). Nothing secret is committed, and
`/api/admin/system-config` reports only booleans and non-sensitive names.

Key variables: `NETSHIELD_JWT_SECRET`, `NETSHIELD_DATABASE_URL`,
`NETSHIELD_CORS_ORIGINS`, `NETSHIELD_ALERT_MIN_RISK_SCORE`,
`NETSHIELD_NOTIFY_SEVERITIES`, `NETSHIELD_CAPTURE_ENABLED`,
`THREAT_INTEL_PROVIDER`.

## Tests

```powershell
pytest -q                          # 187 tests
pytest tests/test_auth.py -q       # auth, JWT, RBAC, password policy
pytest tests/test_ml.py -q         # risk scoring, preprocessing, inference
pytest tests/test_integrations.py -q  # TI, notifications, sources, rate limits
```

Tests that need the dataset or trained models skip cleanly when either is
absent, so the suite passes on a fresh clone.

## Documentation

| Document | Contents |
|---|---|
| [architecture.md](docs/architecture.md) | Layers, modules, detection workflow, data-integrity rules |
| [technical-pipeline.md](docs/technical-pipeline.md) | Ingestion, preprocessing, models, evaluation, scoring, monitoring boundary, performance |
| [api.md](docs/api.md) | Every endpoint, payloads, error format |
| [security.md](docs/security.md) | Auth, RBAC, secrets, validation, limitations, checklist |
| [deployment.md](docs/deployment.md) | Local, Docker, PostgreSQL, TLS, cloud notes, troubleshooting |
| [user-guide.md](docs/user-guide.md) | Analyst walkthrough of all 14 pages |

## Known limitations

1. Live capture flows cannot be scored by the CICIDS2017 model (feature
   mismatch); replay is the scoreable path.
2. Rate limiting is per process - enforce it at the proxy for multi-worker
   deployments.
3. The event bus is in-process, so with multiple workers a streaming client sees
   only its own worker's events.
4. JWTs cannot be revoked before expiry; logout is audited, not enforced.
5. No Alembic migrations are committed; the schema is created at startup.
6. PDF export needs `reportlab`, which is not in `requirements.txt`.
7. Rare attack classes have very low or zero support in the held-out split.
8. Email, Slack, webhook and external threat intelligence need credentials.
9. UNSW-NB15 data is not present.
10. Not deployed anywhere.

## Contributing Guidelines (For Interns / Collaborators)

All interns added as collaborators to this repository must follow the branch
workflow below. **Direct commits or pushes to the `main` branch are not
allowed.**

> Note: `main` only contains the `LICENSE` and `README.md` — it is not used for
> active development. There is no need to pull the latest `main` into your
> branch at any point.

### 1. Branch Naming

- Every intern must create their own branch off `main`, named after themselves.
- Suggested naming convention: `firstname-lastname` (all lowercase,
  hyphen-separated).
  - Example: `john-doe`, `aisha-khan`

### 2. How to Create Your Branch

**Option A — Clone and push (recommended)**

```bash
git clone https://github.com/springboardmentor442n-coder/Network-Anomaly-Detection-and-Predictive-Intrusion-Monitoring-Platform.git
cd Network-Anomaly-Detection-and-Predictive-Intrusion-Monitoring-Platform
git checkout -b your-name
# ... make your changes ...
git add .
git commit -m "Describe your change here"
git push origin your-name
```

**Option B — GitHub UI upload**

1. Go to the repository on GitHub.
2. Switch the branch dropdown from `main` to your own branch (create it first
   via **Branch: main → View all branches → New branch**, named after yourself).
3. Once on your branch, use **Add file → Upload files** to upload your code.
4. Commit directly to your branch (not `main`).

### 3. Rules

- ❌ Do **not** push or upload code directly to `main`.
- ❌ Do **not** push code to another intern's branch.
- ✅ Only push/upload code to the branch that carries your own name.
- Keep uploading/pushing your code to your branch regularly as you make
  progress. No pull requests are required — your branch itself is the
  deliverable.

### 4. Summary

| Action | Allowed? |
|---|---|
| Push to `main` directly | ❌ No |
| Create your own branch from `main` | ✅ Yes |
| Push/upload code to your own branch | ✅ Yes |
| Push/upload code to someone else's branch | ❌ No |
| Open a Pull Request | Not required |
