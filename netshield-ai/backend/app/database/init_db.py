"""Database initialization - creates tables and seeds default data."""
import logging
from sqlalchemy.orm import Session
from app.database.session import engine, SessionLocal
from app.database import models as db_models
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)


async def init_db():
    """Initialize database tables and seed default data."""
    # Create all tables
    try:
        db_models.Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.warning(f"Database table creation notice: {e}")
    logger.info("Database tables initialized")

    # Seed default admin user
    db = SessionLocal()
    try:
        _seed_default_data(db)
    finally:
        db.close()


def _seed_default_data(db: Session):
    """Seed default roles and admin user."""
    from app.database.models import User
    
    users_data = [
        ("admin", "admin@netshield.ai", "System Administrator", "NetShield@Admin123", "ADMIN"),
        ("analyst", "analyst@netshield.ai", "Security Analyst", "NetShield@Analyst123", "ANALYST"),
        ("operator", "operator@netshield.ai", "SOC Operator", "NetShield@Operator123", "SOC_OPERATOR"),
    ]

    for username, email, full_name, raw_password, role in users_data:
        user = db.query(User).filter(User.username == username).first()
        hashed = get_password_hash(raw_password)
        if user:
            user.hashed_password = hashed
            user.is_active = True
        else:
            new_user = User(
                username=username,
                email=email,
                full_name=full_name,
                hashed_password=hashed,
                role=role,
                is_active=True,
            )
            db.add(new_user)

    db.commit()
    logger.info("Default users seeded/updated: admin, analyst, operator")
