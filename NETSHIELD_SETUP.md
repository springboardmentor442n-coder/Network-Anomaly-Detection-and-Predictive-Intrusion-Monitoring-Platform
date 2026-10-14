# NetShield AI real CICIDS release

Updated October 13, 2026. This release replaces the previous 302-row sample-trained models with models trained and evaluated on real CICIDS2017 CNS2022 data. Read `docs/CHANGELOG.md` and the separate Word change log for all improvements and challenges.

## Start on Windows

Extract the package into a new local folder such as `C:\Projects\netshield-ai`. Avoid a sync folder that reports Storage full. Keep your old project as a backup. This package contains complete files, not patches; keep its folders together.

Use Python 3.12. In the extracted project folder:

1. Run `py -3.12 -m venv .venv`.
2. Run `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`.
3. Run `.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1`.
4. Open http://127.0.0.1:8000 in Chrome. Create an Analyst account with a 10+ character password, then log in.
5. Select `cicids_demo_real_ips.csv` and click Scan. This is a small holdout-derived demonstration file with real dataset IP metadata. It is not a full-day scan or independent second evaluation.

No retraining is required for the first launch: the ready-trained bundle is included. Do not copy your old `netshield.db` over the new application's state database. No old usernames/passwords are bundled.

The one-command launcher `start.ps1` creates a venv, installs pinned requirements and starts the app. If PowerShell does not permit script execution, use the direct commands above rather than changing your global policy.

## Use your full daily CSVs

Your original daily files can remain under `data/` or `data/cicids/`. The backend finds nested CSVs. Put the five original files in one of these directories; do not put raw files into `backend/`.

Alternatively run `python setup_data.py --zip C:\path\CICIDS2017_improved.zip` to verify and extract the official archive. `python setup_data.py --download` downloads the inspected archive from the official DistriNet source. Extraction needs about 1.15 GB of free space plus room for scan results. The ZIP is excluded from the delivered package because you already have the dataset.

Every click starts a NEW reader at row one. Scan continues to end of the chosen file unless stopped or failed. Successful rows are saved to SQLite; results storage grows with scanned rows. A full scan can need substantial disk space. Default display window is 200 rows; it does not represent the full saved log.

## What the ML evidence means

All five source CSVs were inspected: 2,099,976 raw flows; 5 invalid selected-feature rows excluded; 2,099,971 valid selected-feature rows. Attempted Category != -1 was relabelled BENIGN according to the improved dataset guidance.

Models use 15 fixed numeric features recovered from your original RF. Actual fitting used 80,439 unique training examples; evaluation used 45,032 unique holdout examples. Per-class deterministic sample caps keep training manageable and preserve rare classes. A numeric-feature hash determines partitions, so identical feature vectors cannot appear in both training and holdout.

This is a retrospective feature-hash benchmark, not a host/session/day-disjoint evaluation. The fixed feature list came from earlier project work, not fresh fold-specific selection. Per-class caps change prevalence, and rare classes have very small holdout support. Weighted F1 is sample-weighted, not a full-population score. Read models/metrics.json for exact per-class evidence and limitations.

Three tuned classifiers: RF, XGBoost, Extra Trees. A benign-trained Isolation Forest adds unusual-behaviour review. Majority vote chooses consensus; three-way tie uses RF. Confidence is not calibrated. Risk is severity times confidence, a priority out of 100. It is not probability of compromise. Models can agree and still be wrong.

## Analyst workflow

- Monitor: streamed predictions, validated source/destination IPs, ports/protocols, priority bands and review flags.
- Explain: raw feature values, each model's prediction/confidence/severity, consensus formula and reasons for review.
- Model laboratory: measured macro/weighted F1, attack recall, FPR, latency, rare-class table, confusion matrix and global feature importance.
- Incidents: repeated review flows sharing source, destination and predicted class are grouped within a scan. Occurrences and maximum priority are retained; analyst notes and status remain editable.
- Analytics: risk/type distributions, top predicted attack sources, protocol counts and capture-hour attack buckets. These are model-predicted patterns, not an external reputation/intelligence feed.
- History/report: persisted scan summaries, full saved NDJSON export, printable human-readable report.
- Team/audit: Admin role management and recorded actions. Public signup always creates Analyst. Viewer cannot upload, start scans, edit incidents or delete results.

## Reproduce training

After the full daily files are available, stop the server and run:

`python prepare_cicids.py --data-dir data/cicids`

`python train_cicids.py --tune`

Then restart. Preparation reads 50,000-row chunks and retains bounded per-class samples; it never concatenates all 2.1 million rows in RAM. Training fits the retained sample, not the entire dataset. Search tests two parameter combinations/model using grouped two-fold CV inside training, then fits the selected configuration on the training sample. The holdout is not used for hyperparameter selection.

`exploration.ipynb` is a new walkthrough notebook for this release. The original notebook is preserved under docs/original-exploration.ipynb. Your earlier RF/XGB comparison is preserved under docs/original_model_comparison.json; those scores are historical and are not used as the new bundle's test results.

## Administration and testing

To create an Admin account run `python admin.py chosen_username`, enter a private password, then start/restart the server. Admin can change other users' roles. Credentials and JWT secret are generated locally.

Run `python -m pytest tests -q` for the regression suite. Read docs/VALIDATION.md for observed results and limits. Import docs/NetShield.postman_collection.json into Postman; set username/password/base_url. Login captures token; Create scan captures scan_id; Stream SSE/Poll/Report/Export/Update incident use these variables.

## Docker and deployment

Run `docker compose up --build` if Docker is installed. Compose uses one process and a persistent named data volume. Container copies the prepared real-IP demo and model bundle; full raw CSVs are added separately. Actual Docker/cloud deployment has not been completed here; see docs/DEPLOYMENT.md.

## File structure

backend/main.py - authentication, roles, scan lifecycle, persistence, incidents and API.
backend/engine.py - schema validation, numerical inference, risk and evidence.
backend/reports.py - escaped printable report.
frontend/index.html, app.js, style.css - primary browser interface.
frontend/login.html, signup.html, dashboard.html - compatibility entry pages that open the primary interface.
models/bundle.joblib - active authoritative model bundle.
models/metrics.json, data_manifest.json - measured results, scope and provenance.
backend/model_rf.pkl, model_xgb.pkl, model_extra_trees.pkl, model_features.pkl, label_encoder.pkl - complete exports corresponding to the active bundle.
setup_data.py, prepare_cicids.py, train_cicids.py - reproducible source extraction and ML workflow.
docs/CHANGELOG.md and separate DOCX - dated improvements, reasons, challenges and evidence.

## Current limits

This is a CSV flow-analysis application. It does not capture live packets, integrate UNSW-NB15, forecast future attacks, automatically block IPs or send external notifications. The optional LLM chatbot remains deferred. Protocol/attack metadata comes from supplied CSVs. Dashboard top sources are predicted attack sources, not confirmed attackers.

Only one worker process is supported; two scans can run at once. Scoring happens in a bounded thread pool. Stop prevents future chunks; an in-flight bounded inference can finish. Eight buffered display messages and a 200-row browser window bound display memory. A slow viewer may miss display events, but saved rows/reports remain authoritative. Source tracking is capped at 5,000 addresses and capture-time tracking at 512 buckets.

NDJSON is streamed by the API. The browser export button currently builds a download Blob; for multi-GB exports use Postman/curl-to-file. Authenticated DELETE /api/scans/{id} removes completed/stopped results and associated incidents while preserving the source CSV; SQLite may retain free pages until maintenance. No automatic retention deletion is enabled.
