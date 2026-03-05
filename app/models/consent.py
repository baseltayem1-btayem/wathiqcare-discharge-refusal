import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum

from app.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Consent(Base):
    __tablename__ = "consents"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    consent_type = Column(
        SAEnum("treatment", "discharge", "procedure", "data_sharing", name="consent_type"),
        nullable=False,
    )
    status = Column(
        SAEnum(
            "pending", "granted", "refused", "escalated", "withdrawn", name="consent_status"
        ),
        nullable=False,
        default="pending",
    )
    icd11_codes = Column(JSON, default=list)
    procedure_description = Column(Text)
    consented_by = Column(String, ForeignKey("users.id"), nullable=False)
    witnessed_by = Column(String, ForeignKey("users.id"), nullable=True)
    signed_at = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    refusal_reason = Column(Text, nullable=True)
    is_escalated = Column(Boolean, default=False)
    escalated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)
