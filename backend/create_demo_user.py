from passlib.context import CryptContext

from database import get_db
from models import User

# One demo account per role. Re-running this resets the passwords and roles.
ACCOUNTS = [
    ("demo@threatradar.com", "ThreatRadar@123", "Admin"),
    ("analyst@threatradar.com", "Analyst@123", "Analyst"),
    ("viewer@threatradar.com", "Viewer@123", "Viewer"),
]

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = next(get_db())

for email, password, role in ACCOUNTS:
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.hashed_password = pwd.hash(password)
        user.role = role
        status = "updated"
    else:
        db.add(User(email=email, hashed_password=pwd.hash(password), role=role))
        status = "created"
    print(f"{status:8} {role:8} {email}  /  {password}")

db.commit()