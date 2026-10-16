<<<<<<< HEAD
## Contributing Guidelines (For Interns / Collaborators)

All interns added as collaborators to this repository must follow the branch workflow below. **Direct commits or pushes to the `main` branch are not allowed.**

> Note: `main` only contains the `LICENSE` and `README.md` — it is not used for active development. There is no need to pull the latest `main` into your branch at any point.

### 1. Branch Naming

- Every intern must create their own branch off `main`, named after themselves.
- Suggested naming convention: `firstname-lastname` (all lowercase, hyphen-separated).
  - Example: `john-doe`, `aisha-khan`

### 2. How to Create Your Branch

**Option A — Clone and push (recommended)**

```bash
# Clone the repository
git clone https://github.com/springboardmentor442n-coder/Network-Anomaly-Detection-and-Predictive-Intrusion-Monitoring-Platform.git

# Move into the project folder
cd Network-Anomaly-Detection-and-Predictive-Intrusion-Monitoring-Platform

# Create and switch to your own branch (off main)
git checkout -b your-name

# ... make your changes ...

# Stage, commit, and push your changes to YOUR branch only
git add .
git commit -m "Describe your change here"
git push origin your-name
```

**Option B — GitHub UI upload**

1. Go to the repository on GitHub.
2. Switch the branch dropdown from `main` to your own branch (create it first via **Branch: main → View all branches → New branch**, named after yourself).
3. Once on your branch, use **Add file → Upload files** to upload your code.
4. Commit directly to your branch (not `main`).

### 3. Rules

- ❌ Do **not** push or upload code directly to `main`.
- ❌ Do **not** push code to another intern's branch.
- ✅ Only push/upload code to the branch that carries your own name.
- Keep uploading/pushing your code to your branch regularly as you make progress. No pull requests are required — your branch itself is the deliverable.

### 4. Summary

| Action | Allowed? |
|---|---|
| Push to `main` directly | ❌ No |
| Create your own branch from `main` | ✅ Yes |
| Push/upload code to your own branch | ✅ Yes |
| Push/upload code to someone else's branch | ❌ No |
| Open a Pull Request | Not required |
=======
# NetShield AI — Network Anomaly Detection & Predictive Intrusion Monitoring

**Run:** `./run.sh` (Linux/Mac) or double-click `run.bat` (Windows), then open http://localhost:8000
First run installs packages, generates sample data and trains the models (~1-2 min). Needs Python 3.10+ and internet for pip.
Logins: `admin/admin123` (also sees the audit log) · `analyst/analyst123`.
Docker alternative: `docker compose up --build`.

## What's inside
- XGBoost multi-class classifier (predict_proba -> confidence) + Isolation Forest anomaly score (trained on normal traffic only)
- Risk scoring (`backend/app/risk.py`): severity table x confidence + 0.3 x anomaly, capped at 100, +15 escalation for 3+ alerts from one IP in 10 min, Low/Medium/High/Critical labels
- SSE streaming `/api/stream/scan`: fixed 250-row chunks from row 1 on every scan (no cursor), scoring in a worker thread, increasing message IDs, 20 s heartbeat, JWT in the URL, stops on disconnect, no silent auto-restart
- JWT auth + role-based access, SQLite incident queue (open/investigating/resolved) and audit log
- Dashboard `frontend/index.html` (no build step): KPIs, live feed capped at 200 rows, attack distribution, incidents

## Use the real CICIDS2017 data
1. Put `cicids2017_cleaned.csv` (Kaggle: ericanacletoribeiro/cicids2017-cleaned-and-preprocessed) in `backend/data/`
2. `cd backend && python train.py` (samples 300k rows; add `--max-rows 2000000` for more)
3. Restart the server. It auto-prefers the real CSV over the sample.

## Tests
`cd backend && pytest` runs the 5 risk-scoring cases from the guide.

## Notes
- CICIDS2017-cleaned has no IP columns, so IPs are simulated (attack flows come from a small attacker pool) to demonstrate escalation; real `Source IP` columns are used when present.
- For production: set `JWT_SECRET`, replace demo users with a DB, move to PostgreSQL/MongoDB (SQLite keeps this zero-setup), and use Redis for shared escalation state across multiple workers.
>>>>>>> 3946e5c (Completed NetShield AI project implementation)
