# NetShield AI - Individual Submission (Milestone 1)
**Author:** Mansi Gaikwad
**Dataset used:** CICIDS2017 (improved labeling version, CNS2022 release by Engelen et al.)

## 1. Objective
Build a working anomaly detection pipeline and application that can flag
malicious network traffic (Benign vs Attack), with a focus on F1 score
as the primary evaluation metric.

## 2. Architecture

Dataset (CICIDS2017 improved)
    -> Notebook (exploration.ipynb): cleaning, preprocessing, model training,
       feature importance analysis, model + sample data export
    -> traffic_summary.json (exported summary stats)
    -> model.pkl / model_features.pkl (saved lightweight model + top 15 features)
    -> sample_traffic.csv (302-row sample for real-time demo replay)
    -> Backend (FastAPI - backend/main.py):
         - /login          -> authenticates user, issues JWT token
         - /dashboard       -> protected welcome route
         - /traffic-stats   -> protected route, serves traffic summary
         - /predict-next    -> protected route, serves live model predictions
                               one sample row at a time (cycles continuously)
    -> Frontend (plain HTML/JS - frontend/):
         - login.html      -> username/password form, calls /login
         - dashboard.html  -> calls /dashboard + /traffic-stats + /predict-next,
                               displays results including a live-updating feed

## 3. Wireframe (described)

**Login page:** Title, username field, password field, Login button, error message area.

**Dashboard page:** Title, welcome message (username + role), traffic summary
cards (total flows, benign count, attack count), a list of the top 5 attack
types, and a Live Threat Monitor section with a Start/Stop Monitoring button
and a live, color-coded feed of real-time predictions (green = Benign,
red = Attack) with confidence scores.

## 4. Dataset preparation
- Combined all 5 daily CICIDS2017 (improved) CSV files into one dataset.
- Relabeled "Attempted" flows as BENIGN per the dataset authors' documented
  guidance (Attempted Category != -1 -> BENIGN), rather than treating
  attempted attacks as their own class.
- Cleaned infinite/missing values (common in Flow Bytes/s and Flow Packets/s
  columns when flow duration is 0).
- Created a binary target: is_attack (0 = Benign, 1 = Attack).

## 5. Model & F1 results
- Baseline model: Random Forest Classifier (100 trees), all 84 features.
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
  research.

## 6. Authentication
Implemented JWT-based login with a role field (Security Analyst),
protecting the dashboard, traffic-stats, and predict-next endpoints from
unauthenticated access.

## 7. Feature Reduction (Mentor Feedback)
- Mentor feedback: 84 features is too many for a lightweight, demoable model.
- Used the trained Random Forest's feature_importances_ to rank all 84
  features and selected the top 15 (e.g. RST Flag Count, Bwd Packet
  Length Std, Packet Length Std, Flow Duration).
- Retrained a new Random Forest using only these 15 features.
- Result: F1 score barely changed (0.9999 -> 0.9986), confirming that a
  small, well-chosen feature set retains nearly all predictive power -
  directly addressing the mentor's feedback.

## 8. Real-Time Prediction Demo
- Saved the 15-feature model (model.pkl) and its feature list
  (model_features.pkl) using joblib, so the backend can load a trained
  model instantly without retraining.
- Created sample_traffic.csv: up to 20 real example rows per traffic
  type (302 rows total, covering Benign + 13+ attack types) to simulate
  live traffic without needing an actual live network feed.
- Added a /predict-next endpoint: each call returns the next sample row's
  true label, the model's predicted class (Benign/Attack), and its
  confidence score, cycling back to the start once all rows are used.
- Built a "Live Threat Monitor" on the dashboard that polls this endpoint
  every 1.5 seconds via a Start/Stop Monitoring button, displaying each
  result as a color-coded entry (green = Benign, red = Attack) in a
  live-updating feed - demoable via screen share.

## 9. UI Design
The dashboard uses a light, off-white background with emerald green
accents for readability and a calm, professional look. Key stats are
shown as individual cards, attack types are listed with a green accent
border, and the live feed uses green/red accents to make predictions
instantly scannable.

## 10. How to run
1. cd backend, activate venv, run: uvicorn main:app --reload
2. Open frontend/login.html with VS Code's Live Server
3. Log in with analyst1 / password123
4. On the dashboard, click "Start Monitoring" to see live predictions