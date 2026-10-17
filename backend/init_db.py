
from database import engine, Base
import models

Base.metadata.create_all(bind=engine)

print("ThreatRadar database initialized successfully!")
print("Tables created: users, past_runs")