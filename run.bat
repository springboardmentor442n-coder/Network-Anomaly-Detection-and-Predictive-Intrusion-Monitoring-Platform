@echo off
cd /d "%~dp0backend"
if not exist .venv python -m venv .venv
call .venv\Scripts\activate
pip install -q -r requirements.txt
if not exist data\sample_traffic.csv if not exist data\cicids2017_cleaned.csv python generate_sample_data.py
if not exist models\xgboost_model.joblib python train.py
echo Open http://localhost:8000  (admin/admin123 or analyst/analyst123)
uvicorn app.main:app --host 0.0.0.0 --port 8000
