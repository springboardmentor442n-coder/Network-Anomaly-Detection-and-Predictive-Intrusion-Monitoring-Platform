# NetShield AI — Network Anomaly Detection & Threat Monitoring System

Infosys Springboard internship project. This repo covers **Milestone 1
(Weeks 1-2)**: project setup, authentication, RBAC, audit logging, traffic
ingestion, and a basic analytics dashboard.

## Stack
- **Backend:** FastAPI + SQLAlchemy + PostgreSQL, JWT auth
- **Frontend:** Next.js (React), plain CSS
- **ML (coming in Milestone 2):** scikit-learn, TensorFlow, XGBoost

## Quick start (Docker — recommended)

```bash
docker-compose up --build
```

- Backend API: http://localhost:8000 (interactive docs at `/docs`)
- Frontend: http://localhost:3000

## Quick start (without Docker)

### 1. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # then edit DATABASE_URL / JWT_SECRET_KEY

# Start Postgres locally, or point DATABASE_URL at any Postgres instance
uvicorn app.main:app --reload
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

## First-time setup: create your admin account

Open http://localhost:8000/docs, use `POST /auth/register`:
```json
{
  "email": "admin@netshield.io",
  "full_name": "Your Name",
  "password": "yourpassword",
  "role": "admin",
  "team": "SOC-Alpha"
}
```
Then log in at http://localhost:3000 to see the dashboard.

## Loading real traffic data

Download CICIDS2017 or UNSW-NB15 CSVs (see links in `data/load_datasets.py`),
then:
```bash
cd data
python load_datasets.py --file path/to/file.csv --dataset cicids2017 --limit 5000
```
The `--limit` flag is handy for a quick local test before loading the full
multi-GB file.

## Project structure
```
netshield-ai/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + router registration
│   │   ├── config.py        # env-based settings
│   │   ├── database.py      # SQLAlchemy engine/session
│   │   ├── models.py        # User, AuditLog, TrafficRecord, Alert
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── security.py      # password hashing + JWT
│   │   ├── dependencies.py  # get_current_user, require_role (RBAC)
│   │   └── routers/
│   │       ├── auth.py      # register / login / me
│   │       ├── users.py     # admin: team mgmt + audit logs
│   │       └── traffic.py   # ingest / list / stats
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── pages/
│   │   ├── index.js         # login page
│   │   ├── dashboard.js     # stats + traffic table
│   │   └── _app.js
│   └── lib/api.js           # axios client w/ JWT interceptor
├── data/
│   └── load_datasets.py     # CICIDS2017 / UNSW-NB15 loader
└── docker-compose.yml
```

## Roadmap (matches the internship's milestone plan)

- [x] **Milestone 1 (Wk 1-2):** Auth, RBAC, audit logs, DB schema, traffic
      ingestion, dataset loader, basic dashboard — *this repo*
- [ ] **Milestone 2 (Wk 3-4):** Train anomaly detection models (Isolation
      Forest, Autoencoder) + intrusion prediction classifier (Random
      Forest/XGBoost) on CICIDS2017/UNSW-NB15; wire predictions into
      `anomaly_score` / `risk_score` / `is_anomalous` fields on ingest
- [ ] **Milestone 3 (Wk 5-6):** Alert generation from risk scores, incident
      management endpoints, notification integrations (email/Slack), richer
      analytics dashboards (attack trends, top attackers)
- [ ] **Milestone 4 (Wk 7-8):** Model validation, performance tuning, full
      Docker/cloud deployment, documentation & demo

## Notes on RBAC
Three roles: `admin`, `soc_analyst`, `viewer`. Enforcement happens in
`app/dependencies.py::require_role` — every protected route declares which
roles may call it, e.g.:
```python
@router.get("/users/")
def list_users(_admin = Depends(require_role(RoleEnum.admin))):
    ...
```
This has been tested end-to-end (analysts get 403 on admin routes, can view
traffic; admins can do everything).
