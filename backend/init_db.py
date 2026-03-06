from backend.core.database import engine, Base
from backend.models.tenant import Tenant
from backend.models.user import User
from backend.models.patient import Patient
from backend.models.discharge_case import DischargeCase
from backend.models.audit_log import AuditLog

Base.metadata.create_all(bind=engine)

print("Database tables created successfully")
