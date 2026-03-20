from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from backend.core.database import Base


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=True)
    recipient_email = Column(Text, nullable=False)
    cc = Column(Text, nullable=True)
    subject = Column(String, nullable=False)
    template_name = Column(String, nullable=True)
    status = Column(String, nullable=False)
    provider = Column(String, nullable=False, default="microsoft_graph")
    sent_at = Column(DateTime, nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    error_message = Column(Text, nullable=True)
    attachment_metadata = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    tenant = relationship("Tenant")
    case = relationship("DischargeCase")
    patient = relationship("Patient")
    user = relationship("User")
