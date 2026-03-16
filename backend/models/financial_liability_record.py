from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, JSON, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from backend.core.database import Base


class FinancialLiabilityRecord(Base):
    __tablename__ = "financial_liability_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    admission_id = Column(String, ForeignKey("admissions.id"), nullable=True, index=True)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=True, index=True)
    amount = Column(Numeric(12, 2), nullable=True)
    currency = Column(String, nullable=False, default="SAR")
    reason = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="open", index=True)
    metadata_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
