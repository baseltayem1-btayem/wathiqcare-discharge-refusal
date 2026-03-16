from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, JSON, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB

from backend.core.database import Base


class FinancialGuarantee(Base):
    __tablename__ = "financial_guarantees"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    admission_id = Column(String, ForeignKey("admissions.id"), nullable=True, index=True)
    refusal_case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=True, index=True)
    financial_liability_record_id = Column(
        String,
        ForeignKey("financial_liability_records.id"),
        nullable=True,
        index=True,
    )
    guarantee_type = Column(String, nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String, nullable=False, default="SAR")
    issue_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    issuing_authority = Column(String, nullable=True)
    obligor = Column(String, nullable=True)
    status = Column(String, nullable=False, default="draft", index=True)
    reference_number = Column(String, nullable=True, index=True)
    metadata_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
