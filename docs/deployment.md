# NetShield AI - Deployment

> **Status: not deployed.** This document describes how to deploy the platform.
> No cloud deployment has been performed, and no hosted environment exists.

## Prerequisites

| Requirement | Notes |
|---|---|
| Python 3.9+ | Backend (developed and tested on 3.9 and 3.11) |
| Node.js 18+ | Frontend build |
| Docker + Compose v2 | Container deployment |
| PostgreSQL 14+ | Production database (SQLite is the dev default) |
| CICIDS2017 CSVs | Optional but required for analytics/replay - see `data/README.md` |

## 1. Local development

```bash
python -m pip install -r requirements.txt
cp .env.example .env          # then edit .env
python -m backend.scripts.train_models    # once, if models/ is empty
python -m backend                          # http://127.0.0.1:8000

cd frontend
npm install
npm run dev                                # http://127.0.0.1:5173
```

The Vite dev server proxies `/api` and `/health` to `127.0.0.1:8000`, so no CORS
configuration is needed in development. Override the target with
`VITE_PROXY_TARGET`.

## 2. Docker Compose

```bash
cp .env.example .env
# REQUIRED in .env:
#   POSTGRES_PASSWORD=<strong password>
#   NETSHIELD_JWT_SECRET=<python -c "import secrets; print(secrets.token_urlsafe(48))">

docker compose up --build
```

| Service | Port | Notes |
|---|---|---|
| `frontend` | 8080 -> 80 | nginx serving the built SPA, proxying `/api` to backend |
| `backend` | 8000 | uvicorn, non-root user, healthcheck on `/health` |
| `postgres` | internal | named volume `postgres-data`, `pg_isready` healthcheck |

Open `http://localhost:8080`.

Compose deliberately contains no secrets. It interpolates from `.env` and fails
fast if `POSTGRES_PASSWORD` or `NETSHIELD_JWT_SECRET` is missing.

### Mounted paths

The dataset and models are bind-mounted, not baked into the image:

```yaml
- ./CICIDS2017_improved:/app/CICIDS2017_improved:ro
- ./models:/app/models:ro
```

Both are read-only - the application never writes to the corpus or to model
artifacts. Train on the host, then restart the backend to pick up new models.

### Live capture in Docker

Not enabled. Packet capture inside a container requires `network_mode: host`
plus `cap_add: [NET_RAW, NET_ADMIN]`, which removes network isolation. If you
accept that trade-off:

```yaml
backend:
  network_mode: host
  cap_add: [NET_RAW, NET_ADMIN]
  environment:
    NETSHIELD_CAPTURE_ENABLED: "true"
    NETSHIELD_CAPTURE_INTERFACE: eth0
```

Note that `network_mode: host` is Linux-only and breaks the compose service
network, so the frontend proxy target must change too. Running the capture
collector on the host instead is the safer pattern.

## 3. Database

### PostgreSQL

```bash
NETSHIELD_DATABASE_URL=postgresql+psycopg2://netshield:PASSWORD@host:5432/netshield
```

`psycopg2-binary` is installed in the backend image. For a non-Docker install:

```bash
pip install "psycopg2-binary>=2.9"
```

### Schema creation

`Base.metadata.create_all()` runs at startup and creates any missing tables.
This is sufficient for first deployment and for additive changes.

### Migrations

`alembic` is in `requirements.txt` but no migration directory is committed -
the schema is currently created directly. To adopt migrations before making
destructive schema changes:

```bash
alembic init migrations
# in migrations/env.py:
#   from backend.app.database import Base
#   from backend.app import models          # registers all tables
#   target_metadata = Base.metadata
alembic revision --autogenerate -m "baseline"
alembic upgrade head
```

Once migrations are in use, remove the `create_all()` call from
`backend/app/main.py` so the two mechanisms cannot disagree.

### Backups

```bash
# backup
docker compose exec postgres pg_dump -U netshield netshield > backup.sql
# restore
docker compose exec -T postgres psql -U netshield netshield < backup.sql
```

## 4. Reverse proxy and HTTPS

The application speaks HTTP; terminate TLS in front of it.

```nginx
server {
    listen 443 ssl http2;
    server_name netshield.example.com;

    ssl_certificate     /etc/letsencrypt/live/netshield.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/netshield.example.com/privkey.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limit auth at the edge - the in-process limiter is per worker.
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://127.0.0.1:8080;
        include /etc/nginx/proxy_params;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket / SSE
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}

server {
    listen 80;
    server_name netshield.example.com;
    return 301 https://$host$request_uri;
}
```

Add to `http {}`:

```nginx
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;
```

`proxy_buffering off` and the long `proxy_read_timeout` are required for SSE and
WebSocket. Without them the stream endpoints appear to hang and the client falls
back to polling.

## 5. Production configuration

```bash
NETSHIELD_ENV=production
NETSHIELD_DEBUG=false
NETSHIELD_JWT_SECRET=<unique 32+ chars>
NETSHIELD_CORS_ORIGINS=https://netshield.example.com
NETSHIELD_DATABASE_URL=postgresql+psycopg2://...
NETSHIELD_RATE_LIMIT_ENABLED=true
NETSHIELD_ALERT_MIN_RISK_SCORE=65
NETSHIELD_NOTIFY_SEVERITIES=CRITICAL
```

The app logs a warning at startup for a default JWT secret, for open CORS in
production, and for SQLite in production. `/api/admin/system-config` surfaces
the same warnings in the UI.

### Workers

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Two caveats with multiple workers:

1. Rate-limit counters are per process - enforce limits at the proxy.
2. The event bus is in-process, so a streaming client only receives events
   produced by the worker it is connected to. For consistent real-time delivery
   across workers, either run a single worker for the streaming path or move the
   bus onto Redis pub/sub.

## 6. Frontend deployment

```bash
cd frontend
npm ci
npm run build       # -> frontend/dist
```

Serve `dist/` from any static host. Two wiring options:

- **Same origin (recommended)**: leave `VITE_API_BASE` empty and have the web
  server proxy `/api` to the backend. This is what the shipped nginx config and
  Docker image do, and it avoids CORS entirely.
- **Cross origin**: build with `VITE_API_BASE=https://api.example.com` and add
  that origin to `NETSHIELD_CORS_ORIGINS`.

Any static host must send `index.html` for unknown paths (SPA fallback), or
deep links such as `/alerts` will 404 on refresh.

## 7. Cloud notes

These are untested outlines, not verified deployments.

| Target | Approach |
|---|---|
| AWS | ECS/Fargate for both images, RDS PostgreSQL, ALB for TLS, EFS for the dataset if analytics are needed |
| Azure | Container Apps or App Service, Azure Database for PostgreSQL, Front Door for TLS |
| GCP | Cloud Run for both images, Cloud SQL, GCS + a sidecar for the dataset |
| VM | Docker Compose plus the nginx config above |

Cloud considerations specific to this app:

- The 1.1 GB corpus does not belong in a container image. Mount it, or run with
  analytics reporting `status: not_found` (the app handles its absence).
- Serverless container platforms may recycle instances, which clears the
  in-process analytics cache and event-bus history. Both degrade gracefully.
- Set `NETSHIELD_ANALYTICS_SAMPLE_LIMIT` lower on memory-constrained instances.

## 8. Health checks and monitoring

| Endpoint | Use |
|---|---|
| `GET /health` | Liveness/readiness (no auth) |
| `GET /ready` | Readiness |
| `GET /api/admin/system-config` | Configuration warnings (admin) |
| `GET /api/predictions/status` | Whether models are loaded |

Both Docker images define `HEALTHCHECK`, and compose gates `backend` on
`postgres` being healthy and `frontend` on `backend` being healthy.

Logs go to stdout in the format
`%(asctime)s %(levelname)s %(name)s %(message)s`.

## 9. Verifying a deployment

```bash
curl -fsS http://localhost:8080/health

# Register, then check RBAC is enforced
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Str0ngPassphrase1"}' | jq -r .access_token)

# Expect 403: a fresh account is an analyst, not an admin
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/admin/users \
  -H "Authorization: Bearer $TOKEN"

curl -s http://localhost:8080/api/monitoring/sources -H "Authorization: Bearer $TOKEN" | jq
curl -s -X POST 'http://localhost:8080/api/monitoring/scan?source=csv_replay&limit=5' \
  -H "Authorization: Bearer $TOKEN" | jq '{scored, alerts_created}'
```

## 10. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `503` from `/api/predictions` | No model on disk. Run the training script and restart. |
| Analytics `status: not_found` | Dataset absent. See `data/README.md`, or set `NETSHIELD_DATA_ROOT`. |
| Stream stuck on `polling` | Proxy is buffering. Set `proxy_buffering off` and a long read timeout. |
| `401` immediately after login | `NETSHIELD_JWT_SECRET` differs between workers/restarts. Set it explicitly. |
| Deep links 404 on refresh | Static host lacks SPA fallback to `index.html`. |
| `packet_capture` unavailable | Expected by default. Needs `NETSHIELD_CAPTURE_ENABLED=true`, Scapy, and Npcap on Windows. |
| Compose fails with "POSTGRES_PASSWORD must be set" | Working as intended - populate `.env`. |
