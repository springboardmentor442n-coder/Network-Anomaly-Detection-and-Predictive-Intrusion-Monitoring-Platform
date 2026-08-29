from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, security
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


def log_action(db: Session, user_id: int | None, action: str, detail: str = ""):
    entry = models.AuditLog(user_id=user_id, action=action, detail=detail)
    db.add(entry)
    db.commit()


@router.post("/register", response_model=schemas.UserOut)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=security.hash_password(payload.password),
        role=payload.role,
        team=payload.team,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_action(db, user.id, "REGISTER", f"New {user.role.value} account created")
    return user


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not security.verify_password(payload.password, user.hashed_password):
        log_action(db, user.id if user else None, "LOGIN_FAILED", payload.email)
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    token = security.create_access_token(subject=user.email, role=user.role.value)
    log_action(db, user.id, "LOGIN", "Successful login")
    return schemas.Token(access_token=token)


@router.get("/me", response_model=schemas.UserOut)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    return current_user
