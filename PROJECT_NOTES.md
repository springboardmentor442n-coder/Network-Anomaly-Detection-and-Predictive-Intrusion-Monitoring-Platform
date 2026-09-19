# NetShield AI - Individual Submission (Milestone 1 & 2)
**Author:** Mansi Gaikwad
**Dataset used:** CICIDS2017 (improved labeling version, CNS2022 release by Engelen et al.)

## 1. Objective
Build a working anomaly detection pipeline and application that can flag
malicious network traffic (Benign vs Attack, plus specific attack type),
with a focus on F1 score as the primary evaluation metric.

## 2. Architecture

Dataset (CICIDS2017 improved)
    -> Notebook (exploration.ipynb): cleaning, preprocessing, model training,
       feature importance analysis, multi-class model + sample data export,
       model performance export
    -> traffic_summary.json / model_performance.json (exported summaries)
    -> model.pkl / model_features.pkl (multi-class model + top 15 features)
    -> sample_traffic.csv (302-row sample for real-time demo replay)
    -> Backend (FastAPI - backend/main.py):
         - /login            -> authenticates user, issues JWT token
         - /dashboard         -> protected welcome route
         - /traffic-stats     -> protected route, serves traffic summary
         - /predict-next      -> protected route, live prediction + risk score
         - /generate-report   -> protected route, compiles full report data
    -> Frontend (plain HTML/JS - frontend/):
         - login.html        -> username/password form, calls /login
         - dashboard.html    -> dark SOC-style dashboard: live monitor,
                                 traffic stats, and a printable report modal

## 3. Wireframe (described)

**Login page:** Dark themed card, username field, password field, Login button.

**Dashboard page:** Dark navbar, welcome message, traffic summary cards,
top attack types list, Live Threat Monitor (Start/Stop button, live feed
showing predicted attack type + risk badge + confidence, color-coded),
and a "Generate Report" button opening a light, paper-styled printable
report (traffic summary, model performance table, risk distribution bars,
top attack types).

## 4. Dataset preparation
- Combined all 5 daily CICIDS2017 (improved) CSV files into one dataset.
- Relabeled "Attempted" flows as BENIGN per the dataset authors' documented
  guidance (Attempted Category != -1 -> BENIGN).
- Cleaned infinite/missing values (common in Flow Bytes/s and Flow Packets/s
  columns when flow duration is 0).
- Created a binary target: is_attack (0 = Benign, 1 = Attack), later
  extended to a full multi-class Label target for risk scoring.

## 5. Model & F1 results
- Baseline model: Random Forest Classifier (100 trees), all 84 features,
  binary target. Initial F1: ~0.9999.
- Investigated this result rather than accepting it at face value:
  confirmed no duplicate rows, and removing Src/Dst Port as features did
  not meaningfully change the score.
- Per-attack-type breakdown showed near-perfect performance on high-volume
  attacks (PortScan, DDoS, DoS Hulk) but weaker recall on rare types
  (Infiltration, SQL Injection) due to class imbalance.
- Feature reduction: used feature_importances_ to select the top 15 of 84
  features. Retrained binary model on these 15 - F1 only dropped to 0.9986,
  confirming a small feature set retains nearly all predictive power.
- Final model: retrained as multi-class (predicts specific attack type,
  not just Benign/Attack) on the same 15 features, for use in risk scoring.
  Weighted F1: 0.9927, accuracy 0.9928. SQL Injection recall dropped to
  0.33 on only 3 test examples - consistent with the documented class
  imbalance finding.

## 6. Authentication
JWT-based login with a role field (Security Analyst), protecting the
dashboard, traffic-stats, predict-next, and generate-report endpoints.

## 7. Feature Reduction (Mentor Feedback)
Mentor feedback: 84 features is too many for a lightweight, demoable
model. Reduced to the top 15 by importance with negligible F1 loss
(see Section 5).

## 8. Real-Time Prediction Demo
- Saved the trained model (model.pkl) and its feature list
  (model_features.pkl) via joblib for instant backend loading.
- Created sample_traffic.csv: up to 20 real example rows per traffic
  type (302 rows, Benign + 13+ attack types) to simulate live traffic.
- /predict-next serves one sample row at a time with the model's
  prediction, cycling continuously for a live demo.
- Live Threat Monitor on the dashboard polls this every 1.5s via a
  Start/Stop button, showing color-coded live results.

## 9. Risk Scoring
- Implemented per the mentor-shared guide: classifier confidence
  (predict_proba) x a hand-written severity table (0-100 per attack
  type, based on real-world danger assessment), capped at 100, mapped
  to Low (0-25) / Medium (26-50) / High (51-75) / Critical (76-100).
- Optional guide extensions (unsupervised anomaly score, repeated-alert
  escalation) intentionally skipped as marked optional in the guide.
- Severity table covers all attack types present in the dataset (e.g.
  Heartbleed=95, DDoS=90, Infiltration=85, Botnet=80, down to
  Portscan=30, Benign=0).

## 10. Reporting (Milestone 2)
- /generate-report compiles traffic summary, real model performance
  metrics (accuracy/precision/recall/F1), a risk-level distribution
  across the full sample dataset, and top attack types into one payload.
- Frontend renders this as a clean modal styled like a formal document,
  with a "Print / Save as PDF" button using the browser's native print
  function - no extra libraries required.

## 11. UI Design
Dashboard uses a dark "SOC command center" theme (near-black background,
teal accent, monospace data values, glowing color-coded risk badges) -
chosen to match real-world security tools and make red/amber alerts
stand out clearly. The report modal intentionally stays light/paper-styled
to read as a formal, printable document distinct from the live dashboard.

## 12. How to run
1. cd backend, activate venv, run: uvicorn main:app --reload
2. Open frontend/login.html with VS Code's Live Server
3. Log in with analyst1 / password123
4. Click "Start Monitoring" for live predictions, or "Generate Report"
   for a full summary report