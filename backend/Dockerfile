FROM python:3.11-slim
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY frontend/ /app/frontend/
RUN ([ -f data/sample_traffic.csv ] || [ -f data/cicids2017_cleaned.csv ] || python generate_sample_data.py) && ([ -f models/xgboost_model.joblib ] || python train.py)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
