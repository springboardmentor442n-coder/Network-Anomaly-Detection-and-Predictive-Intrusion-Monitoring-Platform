from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
import json
import joblib
import pandas as pd
import sqlite3
import io
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "netshield-secret-key-change-later"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

DB_PATH = "netshield.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Security Analyst',
            created_at TEXT NOT NULL
        )
    """)
    cursor.execute("SELECT username FROM users WHERE username = ?", ("analyst1",))
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO users (username, hashed_password, role, created_at) VALUES (?, ?, ?, ?)",
            ("analyst1", pwd_context.hash("password123"), "Security Analyst", datetime.utcnow().isoformat())
        )
    conn.commit()
    conn.close()

init_db()

class SignupRequest(BaseModel):
    username: EmailStr
    password: str

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@app.get('/')
def read_root():
    return {'message': 'NetShield AI backend is running'}

@app.post('/signup')
def signup(request: SignupRequest):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT username FROM users WHERE username = ?", (request.username,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    hashed = pwd_context.hash(request.password)
    cursor.execute(
        "INSERT INTO users (username, hashed_password, role, created_at) VALUES (?, ?, ?, ?)",
        (request.username, hashed, "Security Analyst", datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()

    access_token = create_access_token(data={"sub": request.username, "role": "Security Analyst"})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post('/login')
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT username, hashed_password, role FROM users WHERE username = ?", (form_data.username,))
    user = cursor.fetchone()
    conn.close()

    if not user or not verify_password(form_data.password, user[1]):
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    access_token = create_access_token(data={"sub": user[0], "role": user[2]})
    return {"access_token": access_token, "token_type": "bearer"}

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        role = payload.get("role")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"username": username, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get('/dashboard')
def dashboard(current_user: dict = Depends(get_current_user)):
    return {
        "message": f"Welcome {current_user['username']}, role: {current_user['role']}",
        "username": current_user['username']
    }

@app.get('/traffic-stats')
def traffic_stats(current_user: dict = Depends(get_current_user)):
    with open('traffic_summary.json') as f:
        data = json.load(f)
    return data

# ---- Dual-model setup ----
model_rf = joblib.load('model_rf.pkl')
model_xgb = joblib.load('model_xgb.pkl')
label_encoder = joblib.load('label_encoder.pkl')
model_features = joblib.load('model_features.pkl')
sample_traffic = pd.read_csv('sample_traffic.csv')
traffic_index = 0

def predict_with_model(sk_model, features, is_xgb=False):
    probs = sk_model.predict_proba(features)
    if is_xgb:
        pred_indices = probs.argmax(axis=1)
        predicted_classes = label_encoder.inverse_transform(pred_indices)
    else:
        predicted_classes = sk_model.classes_[probs.argmax(axis=1)]
    confidences = probs.max(axis=1)
    return predicted_classes, confidences

SEVERITY_TABLE = {
    "BENIGN": 0,
    "Portscan": 30,
    "Infiltration - Portscan": 35,
    "FTP-Patator": 45,
    "SSH-Patator": 45,
    "Web Attack - Brute Force": 50,
    "Web Attack - XSS": 55,
    "DoS Slowloris": 60,
    "DoS Slowhttptest": 60,
    "DoS Hulk": 70,
    "DoS GoldenEye": 70,
    "Web Attack - SQL Injection": 75,
    "Botnet": 80,
    "Infiltration": 85,
    "DDoS": 90,
    "Heartbleed": 95,
}

def compute_risk_score(predicted_class: str, confidence: float) -> dict:
    base_severity = SEVERITY_TABLE.get(predicted_class, 50)
    score = base_severity * confidence
    score = min(round(score), 100)

    if score <= 25:
        label = "Low"
    elif score <= 50:
        label = "Medium"
    elif score <= 75:
        label = "High"
    else:
        label = "Critical"

    return {"risk_score": score, "risk_label": label}

def normalize_col_name(name):
    name = str(name).strip().lower()
    name = re.sub(r'[^a-z0-9]+', '', name)
    return name

KNOWN_ALIASES = {
    "Avg Fwd Segment Size": "Fwd Segment Size Avg",
    "Avg Bwd Segment Size": "Bwd Segment Size Avg",
    "Max Packet Length": "Packet Length Max",
    "Min Packet Length": "Packet Length Min",
}

def build_canonical_lookup(required_columns):
    lookup = {}
    for col in required_columns:
        lookup[normalize_col_name(col)] = col
    for alias, canonical in KNOWN_ALIASES.items():
        if canonical in required_columns:
            lookup[normalize_col_name(alias)] = canonical
    return lookup

CANONICAL_LOOKUP = build_canonical_lookup(model_features)

def match_uploaded_columns(uploaded_columns):
    rename_map = {}
    matched_required = set()
    for col in uploaded_columns:
        norm = normalize_col_name(col)
        if norm in CANONICAL_LOOKUP:
            canonical = CANONICAL_LOOKUP[norm]
            rename_map[col] = canonical
            matched_required.add(canonical)
    missing = [c for c in model_features if c not in matched_required]
    return rename_map, missing

@app.get('/predict-next')
def predict_next(current_user: dict = Depends(get_current_user)):
    global traffic_index
    row = sample_traffic.iloc[traffic_index % len(sample_traffic)]
    traffic_index += 1

    features = row[model_features].values.reshape(1, -1)

    rf_classes, rf_conf = predict_with_model(model_rf, features, is_xgb=False)
    xgb_classes, xgb_conf = predict_with_model(model_xgb, features, is_xgb=True)

    rf_predicted = rf_classes[0]
    rf_confidence = float(rf_conf[0])
    xgb_predicted = xgb_classes[0]
    xgb_confidence = float(xgb_conf[0])

    rf_risk = compute_risk_score(rf_predicted, rf_confidence)
    xgb_risk = compute_risk_score(xgb_predicted, xgb_confidence)

    return {
        "row_number": traffic_index,
        "true_label": row['Label'],
        "models_agree": rf_predicted == xgb_predicted,
        "random_forest": {
            "predicted_class": rf_predicted,
            "prediction": "BENIGN" if rf_predicted == "BENIGN" else "ATTACK",
            "confidence": round(rf_confidence, 4),
            "risk_score": rf_risk["risk_score"],
            "risk_label": rf_risk["risk_label"]
        },
        "xgboost": {
            "predicted_class": xgb_predicted,
            "prediction": "BENIGN" if xgb_predicted == "BENIGN" else "ATTACK",
            "confidence": round(xgb_confidence, 4),
            "risk_score": xgb_risk["risk_score"],
            "risk_label": xgb_risk["risk_label"]
        }
    }

@app.get('/generate-report')
def generate_report(current_user: dict = Depends(get_current_user)):
    with open('traffic_summary.json') as f:
        traffic_summary = json.load(f)

    with open('model_performance.json') as f:
        model_performance = json.load(f)

    risk_distribution = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    for _, row in sample_traffic.iterrows():
        features = row[model_features].values.reshape(1, -1)
        rf_classes, rf_conf = predict_with_model(model_rf, features, is_xgb=False)
        risk = compute_risk_score(rf_classes[0], float(rf_conf[0]))
        risk_distribution[risk["risk_label"]] += 1

    return {
        "generated_by": current_user["username"],
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        "total_flows": traffic_summary["total_flows"],
        "benign_count": traffic_summary["benign_count"],
        "attack_count": traffic_summary["attack_count"],
        "top_attack_types": traffic_summary["top_attack_types"],
        "model_performance": model_performance,
        "risk_distribution": risk_distribution
    }

@app.post('/analyze-upload')
async def analyze_upload(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    contents = await file.read()
    try:
        uploaded_df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read this file as a CSV.")

    rename_map, missing_cols = match_uploaded_columns(uploaded_df.columns.tolist())
    if missing_cols:
        raise HTTPException(
            status_code=400,
            detail=(
                "This CSV doesn't contain the network flow features NetShield AI needs "
                f"(missing: {', '.join(missing_cols[:5])}{'...' if len(missing_cols) > 5 else ''}). "
                "NetShield AI works with CICFlowMeter-style flow exports (packet timing, flag "
                "counts, packet length statistics). Files from different tools may use a "
                "different feature set."
            )
        )

    uploaded_df = uploaded_df.rename(columns=rename_map)

    max_rows = 500
    working_df = uploaded_df.head(max_rows).copy()

    X_upload = working_df[model_features].apply(pd.to_numeric, errors='coerce')
    X_upload = X_upload.replace([float('inf'), float('-inf')], None).fillna(0)
    X_values = X_upload.values

    rf_classes, rf_confidences = predict_with_model(model_rf, X_values, is_xgb=False)
    xgb_classes, xgb_confidences = predict_with_model(model_xgb, X_values, is_xgb=True)

    results = []
    attack_type_counts = {}
    risk_distribution = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    benign_count = 0
    attack_count = 0
    agreement_count = 0

    for i in range(len(working_df)):
        rf_pred = rf_classes[i]
        rf_conf = float(rf_confidences[i])
        xgb_pred = xgb_classes[i]
        xgb_conf = float(xgb_confidences[i])

        rf_risk = compute_risk_score(rf_pred, rf_conf)
        agree = rf_pred == xgb_pred
        if agree:
            agreement_count += 1

        risk_distribution[rf_risk["risk_label"]] += 1

        if rf_pred == "BENIGN":
            benign_count += 1
        else:
            attack_count += 1
            attack_type_counts[rf_pred] = attack_type_counts.get(rf_pred, 0) + 1

        if i < 100:
            xgb_risk = compute_risk_score(xgb_pred, xgb_conf)
            results.append({
                "row_number": i + 1,
                "random_forest": {
                    "predicted_class": rf_pred,
                    "prediction": "BENIGN" if rf_pred == "BENIGN" else "ATTACK",
                    "confidence": round(rf_conf, 4),
                    "risk_score": rf_risk["risk_score"],
                    "risk_label": rf_risk["risk_label"]
                },
                "xgboost": {
                    "predicted_class": xgb_pred,
                    "prediction": "BENIGN" if xgb_pred == "BENIGN" else "ATTACK",
                    "confidence": round(xgb_conf, 4),
                    "risk_score": xgb_risk["risk_score"],
                    "risk_label": xgb_risk["risk_label"]
                },
                "models_agree": agree
            })

    top_attack_types = dict(sorted(attack_type_counts.items(), key=lambda x: x[1], reverse=True)[:5])
    agreement_rate = round((agreement_count / len(working_df)) * 100, 1) if len(working_df) else 0

    return {
        "filename": file.filename,
        "total_flows": len(working_df),
        "benign_count": benign_count,
        "attack_count": attack_count,
        "top_attack_types": top_attack_types,
        "risk_distribution": risk_distribution,
        "model_agreement_rate": agreement_rate,
        "results": results
    }