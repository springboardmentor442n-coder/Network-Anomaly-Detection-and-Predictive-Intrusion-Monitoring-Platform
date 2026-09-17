# NetShield AI - Security

## Authentication

- **Password storage**: PBKDF2-HMAC-SHA256, 120,000 iterations, 16-byte random
  salt per password. Stored as
  `pbkdf2_sha256$<rounds>$<b64 salt>$<b64 digest>`. Verification uses
  `hmac.compare_digest`, so it is constant-time.
- **Password policy** (`core/security.py:validate_password_strength`): minimum
  length (`NETSHIELD_PASSWORD_MIN_LENGTH`, default 8), at least one letter, at
  least one digit, and rejection of a small list of well-known weak passwords.
- **Tokens**: JWT, HS256, with `sub`, `role` and `exp`.
  Lifetime `NETSHIELD_JWT_EXPIRY_MINUTES` (default 120).
- **Account enumeration**: an unknown email and a wrong password return the same
  401 body. A deactivated account returns 403 only after the password verifies.

### JWT secret

`NETSHIELD_JWT_SECRET` ships with a placeholder default. The app logs a warning
at startup and `/api/admin/system-config` raises a warning while it is unchanged.
Generate one with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Rotating the secret invalidates all existing tokens, which is the intended
behaviour after a suspected compromise.

## Authorization

Two roles: `analyst` (default) and `admin`.

- `current_user` resolves and validates the token, and rejects inactive accounts.
- `admin_user` additionally requires `role == "admin"`, returning 403 otherwise.
- Every route in `api/admin.py` and the indicator write routes in
  `api/threat_intel.py` depend on `admin_user`.
- Registration **always** assigns `analyst`; there is no way to self-register as
  an admin.
- The frontend hides admin navigation for analysts, but that is cosmetic - the
  server enforces the rule and is covered by tests.

### Creating the first admin

No admin exists on a fresh database. Promote one directly:

```bash
python - <<'PY'
from backend.app.database import SessionLocal
from backend.app.models import User
db = SessionLocal()
user = db.query(User).filter(User.email == "you@example.com").first()
user.role = "admin"
db.commit()
print(user.email, user.role)
PY
```

Thereafter admins can promote others through `/api/admin/users/{id}/promote-admin`.

## Rate limiting

`core/rate_limit.py` provides a `RateLimit` dependency applied to
`/api/auth/login` and `/api/auth/register`.

| Setting | Default |
|---|---|
| `NETSHIELD_RATE_LIMIT_ENABLED` | `true` |
| `NETSHIELD_RATE_LIMIT_LOGIN` | `10/minute` |
| `NETSHIELD_RATE_LIMIT_REGISTER` | `5/minute` |
| `NETSHIELD_RATE_LIMIT_DEFAULT` | `300/minute` |

Exceeding a limit returns 429 with `Retry-After`.

The client key comes from the first hop of `X-Forwarded-For` when present,
otherwise the socket address. Only set `X-Forwarded-For` from a trusted reverse
proxy - otherwise a client can spoof it to evade limiting.

**Known limitation**: the limiter is an in-process sliding window. With multiple
workers or replicas each process keeps its own counters, so the effective limit
multiplies by the worker count. For a real deployment, put the limit at the
reverse proxy or back it with Redis.

## Secrets handling

- No secret is hardcoded. Everything is read from environment variables in
  `core/config.py`.
- `.env` is git-ignored; `.env.example` contains placeholders only.
- `.dockerignore` excludes `.env`, the database, models and the dataset from
  build context.
- `docker-compose.yml` contains no credentials; it interpolates from `.env` and
  fails fast if `POSTGRES_PASSWORD` or `NETSHIELD_JWT_SECRET` is unset.
- `/api/admin/system-config` returns only booleans and non-sensitive names. A
  test asserts the JWT secret, SMTP password and threat-intel API key never
  appear in its response.
- Audit log details never include passwords, tokens or keys; a test asserts that
  a failed login does not record the attempted password.

## Input validation

- Pydantic validates every request body; failures return a structured 422 with
  per-field messages.
- Query parameters are bounded (`limit` 1-500, `hours` 1-720, scan `limit`
  1-200), so a caller cannot request an unbounded result set.
- Enum-like values (alert status, severity, incident status, indicator type,
  report format) are checked against explicit allow-lists.
- IP inputs go through `ipaddress.ip_address`, so malformed values are rejected
  before any lookup.
- `features` must be a non-empty mapping.

## Injection

- All database access goes through SQLAlchemy ORM constructs with bound
  parameters. There is no string-interpolated SQL anywhere in the codebase.
- The frontend never uses `dangerouslySetInnerHTML`; backend-supplied strings
  (IPs, labels, notes, audit details) render through React's escaping, so a
  stored value cannot execute as markup.
- The nginx image sets `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy` and a `Content-Security-Policy` restricting scripts to
  `self`.

## Model and training safety

Training is **not exposed over the API**. The only way to produce or replace a
model is running `python -m backend.scripts.train_models` on the host.

`POST /api/admin/models/sync` reads `models/metadata.json` and writes a registry
row. It executes no training code, accepts no file upload, and takes no path
from the caller. There is deliberately no endpoint that accepts a model file or
a training command, so no API caller - authenticated or not - can cause
arbitrary code execution through the model pipeline.

In Docker, `models/` is mounted read-only.

## CORS

`NETSHIELD_CORS_ORIGINS` defaults to `*` for local development. Set it to
explicit origins in any shared deployment; the app warns at startup and in the
admin panel while it is `*`.

## Transport security

The application speaks HTTP and expects TLS termination at a reverse proxy.
See [deployment.md](deployment.md). Tokens are sent in the `Authorization`
header rather than cookies, which avoids CSRF on the API, but it means the token
lives in `localStorage` and is therefore reachable by any successful XSS - which
is why the CSP and the no-raw-HTML rule above matter.

## Error handling

Handlers in `main.py` map domain exceptions to status codes and return
`{error, code, details}`. The catch-all handler logs the full exception
server-side and returns a generic message; internal details are included only
when `NETSHIELD_DEBUG=true`. Stack traces are never sent to clients in
production configuration.

## Degradation of optional integrations

Unconfigured integrations report themselves rather than failing:

| Integration | Behaviour when unconfigured |
|---|---|
| Email / Slack / webhook | Notification recorded as `SKIPPED` with a reason |
| Threat intelligence (http) | `status: "not_configured"`, falls back to the local indicator table |
| Packet capture | Source reports `available: false` with the missing dependency |
| Zeek | Source reports `available: false` |
| PDF export | `formats` reports `available: false`; the endpoint returns 503 |

A notification or threat-intel failure never fails the prediction that triggered
it.

## Checklist before exposing a deployment

- [ ] `NETSHIELD_JWT_SECRET` set to a unique 32+ character value
- [ ] `NETSHIELD_CORS_ORIGINS` restricted to your frontend origin(s)
- [ ] `NETSHIELD_ENV=production`
- [ ] `NETSHIELD_DEBUG=false`
- [ ] PostgreSQL configured via `NETSHIELD_DATABASE_URL`
- [ ] TLS terminated at the proxy; HTTP redirected to HTTPS
- [ ] Rate limiting enforced at the proxy (not only in-process)
- [ ] First admin promoted, and no unexpected admin accounts
- [ ] `.env` not committed (`git status --ignored` to confirm)
- [ ] Database backups configured

## Known limitations

1. In-process rate limiting does not coordinate across workers.
2. JWTs cannot be revoked before expiry; `logout` is an audit record, not a
   server-side invalidation. Shorten `NETSHIELD_JWT_EXPIRY_MINUTES` or add a
   token deny-list if revocation is required.
3. Report export links carry no `Authorization` header, so they suit an
   authenticated browser session rather than direct sharing.
4. Audit entries store the reported client IP; behind an untrusted proxy chain
   that value can be spoofed.
5. No multi-factor authentication.
6. No automated secret rotation.
