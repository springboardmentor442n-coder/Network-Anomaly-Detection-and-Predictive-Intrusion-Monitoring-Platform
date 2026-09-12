from database.database import SessionLocal

from backend.app.core.password import hash_password
from backend.app.models.user import User


def initialize_users():
    db = SessionLocal()

    try:
        users = [
            {
                "username": "admin",
                "password": "admin123",
                "role": "ADMIN",
            },
            {
                "username": "analyst",
                "password": "analyst123",
                "role": "ANALYST",
            },
        ]

        for user_data in users:
            existing_user = (
                db.query(User)
                .filter(
                    User.username == user_data["username"]
                )
                .first()
            )

            if existing_user:
                print(
                    f"User '{user_data['username']}' already exists."
                )
                continue

            new_user = User(
                username=user_data["username"],
                password_hash=hash_password(
                    user_data["password"]
                ),
                role=user_data["role"],
                is_active=True,
            )

            db.add(new_user)

            print(
                f"Created user: "
                f"{user_data['username']} "
                f"({user_data['role']})"
            )

        db.commit()

        print("User initialization completed successfully.")

    finally:
        db.close()


if __name__ == "__main__":
    initialize_users()