"""Database initialization - creates tables and seeds default data."""
import logging
from sqlalchemy import text
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

    # Migrate theme column if missing
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN theme VARCHAR(16) DEFAULT 'dark'"))
    except Exception:
        pass  # Column already exists

    # Seed default admin user
    db = SessionLocal()
    try:
        _seed_default_data(db)
    finally:
        db.close()


def _seed_default_data(db: Session):
    """Seed single primary admin profile."""
    from app.database.models import User
    from sqlalchemy import func
    
    # Clean up obsolete extra profiles if present
    db.query(User).filter(User.username.in_(["analyst", "operator"])).delete(synchronize_session=False)

    single_email = "madhurichowdary2007@gmail.com"
    default_pwd = "NetShield@Admin123"
    hashed = get_password_hash(default_pwd)

    # Seed or update primary user with email madhurichowdary2007@gmail.com
    user = db.query(User).filter(
        (func.lower(User.email) == single_email.lower()) | (func.lower(User.username) == "madhuri")
    ).first()

    if user:
        user.username = "madhuri"
        user.email = single_email
        user.full_name = "Madhuri Chowdary"
        user.hashed_password = hashed
        user.role = "ADMIN"
        user.is_active = True
    else:
        new_user = User(
            username="madhuri",
            email=single_email,
            full_name="Madhuri Chowdary",
            hashed_password=hashed,
            role="ADMIN",
            is_active=True,
        )
        db.add(new_user)

    # Also keep/ensure 'admin' user maps with same password for convenience
    admin_user = db.query(User).filter(User.username == "admin").first()
    if admin_user:
        admin_user.hashed_password = hashed
        admin_user.is_active = True
        admin_user.email = admin_user.email or single_email
    else:
        db.add(User(
            username="admin",
            email="admin@netshield.ai",
            full_name="Madhuri Chowdary (Admin)",
            hashed_password=hashed,
            role="ADMIN",
            is_active=True,
        ))

    db.commit()
    logger.info("Single primary profile configured: madhuri (%s)", single_email)
