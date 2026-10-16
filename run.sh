#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/backend"
[ -d .venv ] || python3 -m venv .venv
source .venv/bin/activate
pip install -q -r requirements.txt
[ -f data/sample_traffic.csv ] || [ -f data/cicids2017_cleaned.csv ] || python generate_sample_data.py
[ -f models/xgboost_model.joblib ] || python train.py
echo ">>> Open http://localhost:8000  (admin/admin123 or analyst/analyst123)"
uvicorn app.main:app --host 0.0.0.0 --port 8000
