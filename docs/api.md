# NetShield AI - API Reference

Base URL: `http://127.0.0.1:8000`
Interactive schema: `/docs` (Swagger UI), `/openapi.json`

All `/api/*` routes except `/api/auth/register` and `/api/auth/login` require:

```http
Authorization: Bearer <access_token>
```

## Error format

Domain and validation errors return a structured body:

```json
{
  "error": "Human readable message",
  "code": "VALIDATION_ERROR",
  "details": { "fields": [{ "field": "features", "message": "Field required" }] }
}
```

| Status | Meaning |
|---|---|
| 400 | Domain validation error (bad filter value, malformed IP) |
| 401 | Missing, invalid or expired token |
| 403 | Authenticated but lacking the required role, or account deactivated |
| 404 | Resource not found |
| 409 | Conflict, or a precondition is unmet (source unavailable, no model on disk) |
| 422 | Request-shape validation failure (FastAPI/Pydantic) |
| 429 | Rate limit exceeded (includes `Retry-After`) |
| 503 | Models not trained, or an optional export dependency is absent |

## Health

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | no |
| GET | `/ready` | no |

## Authentication

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | - | Always creates an `analyst`. Rate limited. |
| POST | `/api/auth/login` | - | Rate limited. |
| GET | `/api/auth/me` | any | Own profile. |
| POST | `/api/auth/logout` | any | Audits the logout; JWTs remain valid until expiry, so the client must discard the token. |

Register/login body:

```json
{ "email": "analyst@example.com", "password": "Str0ngPassphrase1" }
```

Password policy: minimum length (`NETSHIELD_PASSWORD_MIN_LENGTH`, default 8), at
least one letter, at least one digit, not a well-known weak password. Violations
return 422 with a `problems` list.

## Predictions

| Method | Path | Role |
|---|---|---|
| POST | `/api/predictions` | any |
| POST | `/api/predictions/explain` | any |
| GET | `/api/predictions/status` | any |
| GET | `/api/predictions/features` | any |
| GET | `/api/predictions/risk-policy` | any |
| GET | `/api/predictions/model-info` | any |
| GET | `/api/predictions/metrics` | any |
| GET | `/api/predictions/detections` | any |
| GET | `/api/predictions/detections/{id}` | any |

### POST /api/predictions

```json
{
  "features": { "Protocol": 6, "Flow Duration": 1234, "...": "..." },
  "source_ip": "192.168.10.50",
  "destination_ip": "192.168.10.3"
}
```

`source_ip`/`destination_ip` are optional and used only to enrich the alert -
they are not model inputs.

Response:

```json
{
  "detection_id": 42,
  "alert_id": 7,
  "prediction": "DoS Hulk",
  "confidence": 0.98,
  "attack_probability": 0.97,
  "is_anomaly": true,
  "risk_score": 92,
  "severity": "CRITICAL",
  "timestamp": "2026-09-17T12:00:00+00:00",
  "model_version": "1.0",
  "class_probabilities": { "DoS Hulk": 0.98, "BENIGN": 0.01 },
  "explanation": {
    "risk_score": 92,
    "severity": "CRITICAL",
    "raw_score": 92.15,
    "components": [
      { "name": "Anomaly detection", "points": 35, "max_points": 35, "reason": "..." },
      { "name": "Attack probability", "points": 43.65, "max_points": 45, "reason": "..." },
      { "name": "Model confidence", "points": 14.7, "max_points": 15, "reason": "..." },
      { "name": "Attack type weight", "points": 30, "max_points": 35, "reason": "..." }
    ],
    "thresholds": { "CRITICAL": 85, "HIGH": 65, "MEDIUM": 35, "LOW": 0 },
    "formula": "score = anomaly_points + attack_weight x attack_probability + ..."
  },
  "notifications": [{ "channel": "EMAIL", "status": "SKIPPED", "error": "..." }]
}
```

`GET /api/predictions/features` returns the required feature names grouped for
form rendering, with identity columns excluded.

## Monitoring

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/api/monitoring/sources` | any | All sources with availability and reasons |
| GET | `/api/monitoring/sources/{name}` | any | One source's detailed status |
| GET | `/api/monitoring/sample-flow?source=csv_replay` | any | A real dataset row as example prediction input |
| POST | `/api/monitoring/scan?source=&limit=&persist=&notify=` | any | Pull flows and analyze them (`limit` 1-200) |
| POST | `/api/monitoring/replay/reset` | any | Rewind the replay cursor |

Scan response summary:

```json
{
  "source": "csv_replay",
  "source_kind": "replay",
  "requested": 10,
  "returned": 10,
  "scored": 10,
  "skipped_incomplete_features": 0,
  "failed": 0,
  "alerts_created": 2,
  "results": [{ "flow": { "...": "..." }, "scored": true, "detection": { "...": "..." } }]
}
```

Flows from a source that cannot supply the full trained feature set come back
with `"scored": false`, a `reason`, and `missing_features_sample`.

## Alerts

| Method | Path | Role |
|---|---|---|
| GET | `/api/alerts?status=&severity=&limit=&offset=` | any |
| GET | `/api/alerts/{id}` | any |
| PATCH | `/api/alerts/{id}` | any |
| POST | `/api/alerts/{id}/acknowledge` | any |
| POST | `/api/alerts/{id}/resolve` | any |
| POST | `/api/alerts/{id}/false-positive` | any |

Statuses: `NEW`, `ACKNOWLEDGED`, `INVESTIGATING`, `RESOLVED`, `FALSE_POSITIVE`.
Severities: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. An invalid filter value returns
400 rather than silently ignoring it.

## Incidents

| Method | Path | Role |
|---|---|---|
| POST | `/api/incidents` | any |
| GET | `/api/incidents?status=&severity=&limit=&offset=` | any |
| GET | `/api/incidents/{id}` | any (includes notes) |
| PATCH | `/api/incidents/{id}` | any |
| POST | `/api/incidents/{id}/notes` | any |
| POST | `/api/incidents/{id}/link-alert/{alert_id}` | any |

Statuses: `OPEN`, `INVESTIGATING`, `RESOLVED`, `CLOSED`. Priority 1 (highest) to
10. Moving to `CLOSED` stamps `closed_at`.

## Analytics

| Method | Path | Notes |
|---|---|---|
| GET | `/api/analytics/overview?hours=` | Everything the dashboard needs in one call |
| GET | `/api/analytics/traffic?refresh=` | Corpus analytics (cached) |
| GET | `/api/analytics/security-metrics?hours=` | Overview counters |
| GET | `/api/analytics/attack-trends?hours=` | Hourly buckets by severity |
| GET | `/api/analytics/severity-distribution` | Detection counts per severity |
| GET | `/api/analytics/top-attacks?limit=` | Most frequent non-benign classes |
| GET | `/api/analytics/top-ips?limit=` | Most active source/destination IPs |
| GET | `/api/analytics/detections-by-type` | Counts by predicted class |
| GET | `/api/analytics/recent-detections?limit=` | Newest detections |
| GET | `/api/analytics/model-metrics` | Metrics from `models/metadata.json` |
| GET | `/api/analytics/risk-policy` | Live scoring weights and thresholds |

`hours` is bounded to 1-720. `/api/analytics/traffic` reports
`total_records_sampled` (the exact number of rows read, not an extrapolation)
and `cached`.

`top-ips` returns empty arrays until IP-bearing events exist; corpus IP counts
are reported separately by `/api/analytics/traffic`.

## Threat intelligence

| Method | Path | Role |
|---|---|---|
| GET | `/api/threat-intel/status` | any |
| GET | `/api/threat-intel/lookup/{ip}` | any |
| POST | `/api/threat-intel/detections/{id}/enrich?ips=` | any |
| GET | `/api/threat-intel/indicators?indicator_type=&limit=&offset=` | any |
| POST | `/api/threat-intel/indicators` | **admin** |
| DELETE | `/api/threat-intel/indicators/{id}` | **admin** |

Lookup `status` values: `known`, `unknown`, `not_configured`, `error`. An IP
with no record returns `is_malicious: null` - the platform never guesses a
verdict. Providers: `local` (default, always available) and `http` (set
`THREAT_INTEL_BASE_URL` and `THREAT_INTEL_API_KEY`).

## Reports

| Method | Path | Notes |
|---|---|---|
| GET | `/api/reports/formats` | Which exports are available in this deployment |
| GET | `/api/reports/preview?days=` | Build a report without storing it |
| POST | `/api/reports` | Generate and store (`{title?, report_type, days}`) |
| GET | `/api/reports` | List stored reports |
| GET | `/api/reports/{id}?format=json\|csv\|pdf` | Fetch/export |

PDF requires `reportlab`. Without it, `format=pdf` returns 503 with an install
hint rather than a broken file.

## Streaming

| Method | Path | Transport |
|---|---|---|
| GET | `/api/stream/status` | Transport availability |
| GET | `/api/stream/events?since_id=&limit=` | Polling fallback (header auth) |
| GET | `/api/stream/sse?token=` | Server-Sent Events |
| WS | `/api/stream/ws?token=` | WebSocket |

SSE and WebSocket take the token as a query parameter because browsers cannot
set headers on those transports. Event types: `detection`, `alert`, `flow`, plus
`connected` and `heartbeat` control frames.

## Admin (role `admin` only)

| Method | Path |
|---|---|
| GET | `/api/admin/users` |
| GET | `/api/admin/users/{id}` |
| PATCH | `/api/admin/users/{id}` |
| POST | `/api/admin/users/{id}/promote-admin` |
| POST | `/api/admin/users/{id}/demote-analyst` |
| POST | `/api/admin/users/{id}/activate` |
| POST | `/api/admin/users/{id}/deactivate` |
| GET | `/api/admin/users/{id}/activity` |
| GET | `/api/admin/stats` |
| GET | `/api/admin/audit-logs?user_email=&action=&limit=&offset=` |
| GET | `/api/admin/audit-logs/actions` |
| GET | `/api/admin/system-config` |
| GET | `/api/admin/models` |
| POST | `/api/admin/models/sync` |

`/api/admin/system-config` returns booleans and non-sensitive names only - no
secret value is ever included.

`/api/admin/models/sync` records the on-disk model in the `model_versions`
registry. It does **not** train: retraining runs on the host only.

## Deprecated (pre-2.0 compatibility)

These still work and are excluded from the OpenAPI schema:

| Old | New |
|---|---|
| `GET /api/ml/model-info` | `GET /api/predictions/model-info` |
| `GET /api/ml/metrics` | `GET /api/predictions/metrics` |
| `POST /api/ml/predict` | `POST /api/predictions` |
| `GET /api/traffic/analytics` | `GET /api/analytics/traffic` |

`POST /api/ml/predict` returns the original six-field response shape.

## Audit actions

`register`, `login`, `login_failed`, `login_denied_inactive`, `logout`,
`prediction`, `report_generated`, `model_registry_sync`.

Audit details never contain passwords, tokens or API keys.
