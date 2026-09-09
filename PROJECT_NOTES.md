# NetShield AI - Individual Submission (Milestone 1)
**Author:** Mansi Gaikwad
**Dataset used:** CICIDS2017 (improved labeling version, CNS2022 release by Engelen et al.)

## 1. Objective
Build a working anomaly detection pipeline and application that can flag
malicious network traffic (Benign vs Attack), with a focus on F1 score
as the primary evaluation metric.

## 2. Architecture

Dataset (CICIDS2017 improved)
    -> Notebook (exploration.ipynb): cleaning, preprocessing, model training
    -> traffic_summary.json (exported summary stats)
    -> Backend (FastAPI - backend/main.py):
         - /login          -> authenticates user, issues JWT token
         - /dashboard       -> protected welcome route
         - /traffic-stats   -> protected route, serves traffic summary
    -> Frontend (plain HTML/JS - frontend/):
         - login.html      -> username/password form, calls /login
         - dashboard.html  -> calls /dashboard + /traffic-stats, displays results

## 3. Wireframe (described)

**Login page:** Title, username field, password field, Login button, error message area.

**Dashboard page:** Title, welcome message (username + role), traffic summary
section showing total flows analyzed, benign count, attack count, and a
list of the top 5 attack types with their counts.

## 4. Dataset preparation
- Combined all 5 daily CICIDS2017 (improved) CSV files into one dataset.
- Relabeled "Attempted" flows as BENIGN per the dataset authors' documented
  guidance (Attempted Category != -1 -> BENIGN), rather than treating
  attempted attacks as their own class.
- Cleaned infinite/missing values (common in Flow Bytes/s and Flow Packets/s
  columns when flow duration is 0).
- Created a binary target: is_attack (0 = Benign, 1 = Attack).

## 5. Model & F1 results
- Baseline model: Random Forest Classifier (100 trees).
- Initial F1 score: ~0.9999 (near-perfect).
- Investigated this result rather than accepting it at face value:
  confirmed no duplicate rows, and removing Src/Dst Port as features did
  not meaningfully change the score.
- Deeper analysis (per-attack-type breakdown) showed the model performs
  near-perfectly on high-volume attacks (PortScan, DDoS, DoS Hulk) but
  has much weaker recall on rare attack types (e.g. Infiltration, SQL
  Injection), which had very few training examples.
- Conclusion: the high aggregate F1 score is real but misleading on its
  own - it is driven by class imbalance. CICIDS2017 is also a
  documented "easy" benchmark for high-volume attacks in published
  research. Next step (optional): address class imbalance via
  class_weight='balanced' or oversampling (e.g. SMOTE) to improve
  detection of rare attack types.

## 6. Authentication
Implemented JWT-based login with a role field (Security Analyst),
protecting the dashboard and traffic-stats endpoints from unauthenticated
access.

## 7. How to run
1. cd backend, activate venv, run: uvicorn main:app --reload
2. Open frontend/login.html with VS Code's Live Server
3. Log in with analyst1 / password123