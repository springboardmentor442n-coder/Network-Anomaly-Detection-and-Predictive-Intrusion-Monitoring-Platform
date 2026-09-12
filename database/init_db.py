from database.database import Base, engine

# Import all models so SQLAlchemy registers their tables.
from backend.app.models import (
    Alert,
    NetworkTraffic,
    Prediction,
    User,
)


def initialize_database():
    Base.metadata.create_all(bind=engine)

    print("Database initialized successfully.")
    print(f"Database URL: {engine.url}")
    print("Tables created:")
    
    for table_name in Base.metadata.tables:
        print(f" - {table_name}")


if __name__ == "__main__":
    initialize_database()