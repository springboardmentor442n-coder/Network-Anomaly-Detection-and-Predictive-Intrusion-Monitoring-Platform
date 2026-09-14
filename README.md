NetShield AI
AI-Powered Network Anomaly Detection and Predictive Intrusion Monitoring Platform
NetShield AI is a network-security monitoring platform that combines live network traffic analysis with machine-learning-based attack detection, anomaly detection, risk scoring, attack classification, and security alert management.
---
1. Key Features
Live network packet capture using Scapy/Npcap
Network traffic and protocol analysis
Real-time flow feature extraction
Random Forest attack detection
Isolation Forest anomaly detection
Attack-type classification
Risk scoring from 0 to 100
Risk levels: LOW, MEDIUM, HIGH, CRITICAL
Automatic security-alert generation
Alert lifecycle management
JWT authentication
Role-based access control
SQLite database persistence
FastAPI backend
React/Vite frontend
Real-time monitoring dashboard
Automated pytest tests
End-to-end API and ML validation
---
2. System Architecture
```text
Network Traffic
       |
       v
Packet Capture
       |
       v
Packet Processing
       |
       v
Traffic Analytics
       |
       v
Real-Time Flow Feature Extraction
       |
       v
+-------------------------------+
|        ML Prediction          |
|                               |
| Random Forest Attack Detection|
| Isolation Forest Anomaly      |
| Attack-Type Classification    |
+---------------+---------------+
                |
                v
           Risk Scoring
                |
                v
          Alert Generation
                |
                v
        SQLite Persistence
                |
                v
        FastAPI Backend
                |
                v
        React Dashboard
```
Detailed architecture documentation is available at `docs/architecture/SYSTEM_ARCHITECTURE.md`.
---
3. Machine Learning
The ML pipeline uses CICIDS2017 for primary attack detection and attack-type classification and UNSW-NB15 as a secondary intrusion-detection dataset.
Implemented models include Random Forest binary attack detection, Isolation Forest anomaly detection, and Random Forest attack-type classification.
Detailed methodology and evaluation results are documented in `docs/reports/ML_METHODOLOGY_AND_RESULTS.md`.
Reported CICIDS2017 binary-classification results
Metric	Score
Accuracy	99.78%
Precision	99.68%
Recall	99.60%
F1-Score	99.64%
ROC-AUC	99.97%
These are evaluation results on the prepared dataset and should not be interpreted as guaranteed performance on unseen real-world traffic.
---
4. Risk Scoring
The current risk score combines 70% supervised attack probability and 30% anomaly indication.
Risk Score	Level
0–24.99	LOW
25–49.99	MEDIUM
50–74.99	HIGH
75–100	CRITICAL
---
5. Real-Time Monitoring
```text
Live Traffic
     |
     v
Flow Aggregation
     |
     v
Feature Extraction
     |
     v
ML Prediction
     |
     v
Anomaly Detection
     |
     v
Risk Calculation
     |
     v
Alert Generation
```
Monitoring endpoints:
`GET /monitoring/status`
`GET /monitoring/live`
---
6. Backend
The backend is implemented using FastAPI with authentication, prediction, alert management, monitoring, JWT authorization, role-based access control, and database persistence.
Important API endpoints
```text
GET  /
GET  /health
POST /auth/login
GET  /auth/me
GET  /auth/admin-test
POST /prediction
GET  /alerts
POST /alerts
PATCH /alerts/{alert_id}/status
GET  /monitoring/status
GET  /monitoring/live
```
Swagger/OpenAPI: `http://127.0.0.1:8000/docs`
---
7. Frontend
The frontend is implemented using React and Vite. It provides login, dashboard, live monitoring, traffic analytics, alert monitoring, alert status management, ML performance information, and user-management interfaces.
Start it from `frontend` with:
```cmd
npm install
npm run dev
```
Open the URL printed by Vite.
---
8. Project Structure
```text
Network-Anomaly-Detection-and-Predictive-Intrusion-Monitoring-Platform/
|
+-- backend/
|   +-- app/
|   +-- test_api.py
+-- database/
+-- docs/
+-- frontend/
+-- ml/
+-- network_monitoring/
+-- tests/
+-- requirements.txt
+-- README.md
+-- LICENSE
```
---
9. Development Setup
Create and activate a virtual environment:
```cmd
python -m venv .venv
.venv\Scripts\activate
```
Install dependencies:
```cmd
python -m pip install -r requirements.txt
```
The saved scikit-learn models require `scikit-learn==1.7.2`.
Start the backend from the project root:
```cmd
uvicorn backend.app.main:app --reload
```
Start the frontend in a second terminal:
```cmd
cd frontend
npm install
npm run dev
```
---
10. Testing
Automated tests are located in `tests/test_core.py`.
Run:
```cmd
python -m pytest -q
```
Validated M4 result:
```text
3 passed
```
The tests cover risk-level boundary logic and FastAPI health/root endpoints.
---
11. End-to-End ML Test
The project includes `backend/test_api.py` for authenticated end-to-end prediction validation.
Run:
```cmd
python backend\test_api.py
```
During M4 validation, benign traffic produced `BENIGN / LOW` and the tested attack flow produced `ATTACK / DDoS / CRITICAL`, with predictions stored successfully.
---
12. Alert Management
The current alert conditions are:
Prediction is `ATTACK`, or
Anomaly is `YES`, or
Risk level is `HIGH` or `CRITICAL`
Alert lifecycle:
```text
OPEN
  |
  v
ACKNOWLEDGED
  |
  v
RESOLVED
```
This lifecycle was successfully validated during M4.
---
13. Security
The backend implements:
JWT-based authentication
Role-based authorization
Protected alert endpoints
ADMIN-specific functionality
Salted PBKDF2-SHA256 password hashing
Unauthenticated access to protected endpoints is rejected.
---
14. Dataset and Large-File Policy
Large raw datasets are intentionally kept outside normal Git tracking. The project uses `.gitignore` for raw/processed large datasets and Git LFS for selected ML-ready datasets and model files.
Official dataset sources:
CICIDS2017: `https://www.unb.ca/cic/datasets/ids-2017.html`
UNSW-NB15: `https://research.unsw.edu.au/projects/unsw-nb15-dataset`
---
15. Documentation
Important project documentation:
```text
docs/architecture/SYSTEM_ARCHITECTURE.md
docs/architecture/UI_WIREFRAMES.md
docs/architecture/UI_WIREFRAMES.png
docs/reports/ML_METHODOLOGY_AND_RESULTS.md
docs/M1_COMPLETION_REPORT.md
docs/M4_FINAL_VALIDATION_REPORT.md
```
---
16. Current Milestone Status
Milestone	Status
M1 - Platform Foundation & Integration	Complete
M2 - ML Models & Prediction Engine	Complete
M3 - Real-Time Monitoring & Threat Detection	Complete
M4 - Final Validation & Finalization	Complete
---
Contributing Guidelines (For Interns / Collaborators)
All interns added as collaborators to this repository must follow the branch workflow below.
Direct commits or pushes to the `main` branch are not allowed.
1. Branch Naming
Use a personal branch named after yourself, such as `firstname-lastname`.
2. Create Your Branch
```bash
git clone https://github.com/springboardmentor442n-coder/Network-Anomaly-Detection-and-Predictive-Intrusion-Monitoring-Platform.git
cd Network-Anomaly-Detection-and-Predictive-Intrusion-Monitoring-Platform
git checkout -b your-name
git add .
git commit -m "Describe your change here"
git push origin your-name
```
3. Rules
Do not push directly to `main`.
Do not push to another intern's branch.
Push project work only to your assigned branch.
Commit changes regularly.
Pull requests are not required unless requested by project maintainers.
4. Summary
Action	Allowed?
Push directly to `main`	No
Create/use your own branch	Yes
Push to your own branch	Yes
Push to another intern's branch	No
Open a Pull Request	Not required
