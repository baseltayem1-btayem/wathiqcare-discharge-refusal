from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from backend.core.database import Base

class DischargeCase(Base):
    __tablename__ = "discharge_cases"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)

    status = Column(String, default="pending")
    refusal_reason = Column(Text)

    signer_name = Column(String, nullable=True)
    signer_role = Column(String, nullable=True)
    signature_text = Column(Text, nullable=True)
    signed_at = Column(DateTime, nullable=True)

    pdf_file = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient")
    user = relationship("User")
    tenant = relationship("Tenant")
