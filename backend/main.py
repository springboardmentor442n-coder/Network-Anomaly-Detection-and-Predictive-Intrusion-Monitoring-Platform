from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import json
import joblib
import pandas as pd

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

fake_users_db = {
    "analyst1": {
        "username": "analyst1",
        "hashed_password": pwd_context.hash("password123"),
        "role": "Security Analyst"
    }
}

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

@app.post('/login')
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = fake_users_db.get(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": user["username"], "role": user["role"]})
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
    return {"message": f"Welcome {current_user['username']}, role: {current_user['role']}"}

@app.get('/traffic-stats')
def traffic_stats(current_user: dict = Depends(get_current_user)):
    with open('traffic_summary.json') as f:
        data = json.load(f)
    return data

# ---- Real-time prediction + risk scoring setup ----
model = joblib.load('model.pkl')
model_features = joblib.load('model_features.pkl')
sample_traffic = pd.read_csv('sample_traffic.csv')
traffic_index = 0

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

@app.get('/predict-next')
def predict_next(current_user: dict = Depends(get_current_user)):
    global traffic_index
    row = sample_traffic.iloc[traffic_index % len(sample_traffic)]
    traffic_index += 1

    features = row[model_features].values.reshape(1, -1)
    probs = model.predict_proba(features)[0]
    predicted_class = model.classes_[probs.argmax()]
    confidence = float(probs.max())

    risk = compute_risk_score(predicted_class, confidence)

    return {
        "row_number": traffic_index,
        "true_label": row['Label'],
        "predicted_class": predicted_class,
        "prediction": "BENIGN" if predicted_class == "BENIGN" else "ATTACK",
        "confidence": round(confidence, 4),
        "risk_score": risk["risk_score"],
        "risk_label": risk["risk_label"]
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
        probs = model.predict_proba(features)[0]
        predicted_class = model.classes_[probs.argmax()]
        confidence = float(probs.max())
        risk = compute_risk_score(predicted_class, confidence)
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