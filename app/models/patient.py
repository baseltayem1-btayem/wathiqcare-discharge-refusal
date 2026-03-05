import uuid
from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, String

from app.db.database import Base


class Patient(Base):
    __tablename__ = "patients"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    national_id = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String, nullable=False)
    contact_phone = Column(String)
    contact_email = Column(String)
    emergency_contact_name = Column(String)
    emergency_contact_phone = Column(String)
    registered_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
