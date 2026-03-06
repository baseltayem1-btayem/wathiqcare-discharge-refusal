from backend.core.database import engine, Base
from backend.models.tenant import Tenant

Base.metadata.create_all(bind=engine)

print("Database tables created successfully")
