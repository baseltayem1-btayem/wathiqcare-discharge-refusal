from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String

from backend.core.database import Base


class Admission(Base):
    __tablename__ = "admissions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    admission_number = Column(String, nullable=True, index=True)
    department_code = Column(String, ForeignKey("departments.code"), nullable=True, index=True)
    admitted_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    discharged_at = Column(DateTime, nullable=True)
    status = Column(String, nullable=False, default="active", index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
