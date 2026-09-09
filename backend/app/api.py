from collections import Counter
from pathlib import Path
import json

import pandas as pd
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .core.config import settings
from .core.security import create_access_token, decode_access_token, hash_password, verify_password
from .database import get_db
from .ml.data_loader import discover_dataset_files, iter_dataset_chunks, find_label_column
from .ml.service import DetectionService
from .models import AuditLog, Detection, User
from .schemas import Credentials, PredictionRequest, TokenResponse


router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)
detector = DetectionService(settings.model_root)


def current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = decode_access_token(credentials.credentials)
        user = db.query(User).filter(User.email == payload["sub"], User.is_active.is_(True)).first()
    except (jwt.PyJWTError, KeyError):
        user = None
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")
    return user


def admin_user(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator role required")
    return user


@router.post("/auth/register", response_model=TokenResponse)
def register(credentials: Credentials, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == credentials.email).first():
        raise HTTPException(status_code=409, detail="Email is already registered")
    user = User(email=credentials.email.lower(), password_hash=hash_password(credentials.password), role="analyst")
    db.add(user)
    db.commit()
    return TokenResponse(access_token=create_access_token(user.email, user.role))


@router.post("/auth/login", response_model=TokenResponse)
def login(credentials: Credentials, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email.lower()).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return TokenResponse(access_token=create_access_token(user.email, user.role))


@router.get("/ml/model-info")
def model_info(_: User = Depends(current_user)):
    return detector.metadata()


@router.get("/ml/metrics")
def metrics(_: User = Depends(current_user)):
    return detector.metadata().get("metrics", {})


@router.post("/ml/predict")
def predict(request: PredictionRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        result = detector.predict(request.features)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    db.add(Detection(prediction=result["prediction"], confidence=result["confidence"], risk_score=result["risk_score"], severity=result["severity"], is_anomaly=result["is_anomaly"], features_json=json.dumps(request.features, default=str)))
    db.add(AuditLog(user_email=user.email, action="prediction", details=json.dumps(result)))
    db.commit()
    return result


@router.get("/traffic/analytics")
def analytics(_: User = Depends(current_user)):
    files = discover_dataset_files(settings.data_root)
    if not files:
        return {"dataset": "cicids2017", "status": "not_found", "total_records": 0}
    labels: Counter = Counter()
    protocols: Counter = Counter()
    sources: Counter = Counter()
    destinations: Counter = Counter()
    total = 0
    for chunk in iter_dataset_chunks(files, 50_000):
        label = find_label_column(chunk.columns.tolist())
        labels.update(chunk[label].astype(str).str.strip())
        protocol_column = next((column for column in chunk.columns if column.casefold() == "protocol"), None)
        if protocol_column:
            protocols.update(chunk[protocol_column].astype(str))
        for column, counter in [("Src IP", sources), ("Source IP", sources), ("Dst IP", destinations), ("Destination IP", destinations)]:
            if column in chunk.columns:
                counter.update(chunk[column].astype(str))
        total += len(chunk)
        if total >= 250_000:
            break
    normal = sum(count for label, count in labels.items() if label.casefold() in {"benign", "normal"})
    return {"dataset": "cicids2017", "status": "ready", "total_records_sampled": total, "normal_records": normal, "anomalous_records": total - normal, "attack_distribution": labels.most_common(12), "protocol_distribution": protocols.most_common(12), "top_sources": sources.most_common(8), "top_destinations": destinations.most_common(8), "model_ready": detector.ready}


@router.get("/admin/users")
def users(_: User = Depends(admin_user), db: Session = Depends(get_db)):
    return [{"email": user.email, "role": user.role, "active": user.is_active} for user in db.query(User).all()]
