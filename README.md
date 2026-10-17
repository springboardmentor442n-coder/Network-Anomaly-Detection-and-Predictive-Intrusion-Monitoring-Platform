# ThreatRadar: Network Anomaly Detection and Threat Monitoring

An AI-powered platform that analyzes network traffic, classifies attacks, scores their risk, and
helps security analysts manage alerts and incidents.

## Features
- **Authentication and roles:** JWT login with Admin, Analyst and Viewer roles enforced on the server.
- **Threat classification:** XGBoost model trained on UNSW-NB15 (Normal plus 9 attack types) with a confidence score.
- **Risk scoring:** severity x confidence, grouped into Low, Medium, High and Critical.
- **Anomaly detection:** Isolation Forest trained on normal traffic (unsupervised).
- **CSV analysis:** large files are processed in chunks; every run is saved with date, time and analyst.
- **Live monitoring:** dataset replay through the model, or optional real packet capture; includes an intrusion forecast.
- **Alerts and incidents:** High and Critical detections open incidents (New, Investigating, Resolved) and notifications (Slack or email when configured).
- **Model evaluation:** accuracy, precision, recall, F1, false positive rate, detection rate and confusion matrix on a labeled CSV.
- **Reports:** downloadable detection and threat intelligence reports (CSV).
- **Team management and audit log:** Admin can change roles and review all activity.

## Tech stack
FastAPI, SQLAlchemy (SQLite), XGBoost, scikit-learn, pandas, React + Vite.

## Project structure
```
backend/    FastAPI app (main.py, extras.py, models.py, models_extra.py, capture.py)
frontend/   React dashboard (src/App.jsx)
model/      trained model and encoders
datasets/   UNSW-NB15 training data
notebooks/  model training and comparison
```

## Setup
Backend:
```
cd backend
pip install -r requirements.txt
python init_db.py
python create_demo_user.py     # creates Admin, Analyst and Viewer demo accounts
python -m uvicorn main:app --reload
```
Frontend:
```
cd frontend
npm install
npm run dev
```
Open the URL Vite prints (usually http://localhost:5173).

## Roles
| Role | Can do |
|---|---|
| Admin | Everything, plus user management and the audit log |
| Analyst | Upload and analyze traffic, run evaluations, manage incidents |
| Viewer | Read-only access |

## Model results
Test accuracy 83.63% and weighted F1 0.819 on UNSW-NB15 (see `notebooks/`).

## Limitations and future work
- Live Monitoring replays UNSW-NB15 flows by default. Real capture is experimental: features are approximated from packets.
- Not done yet: Docker and cloud deployment, PostgreSQL, CICIDS2017, SIEM integrations, deep learning models.