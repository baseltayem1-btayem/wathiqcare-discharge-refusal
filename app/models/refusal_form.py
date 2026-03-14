import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum

from app.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class RefusalForm(Base):
    """Persisted refusal-form instance generated from a refused/escalated consent."""

    __tablename__ = "refusal_forms"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    consent_id = Column(String, ForeignKey("consents.id"), nullable=False, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    form_type = Column(
        SAEnum(
            "medical_discharge_refusal",
            "financial_responsibility_notice",
            "procedure_refusal",
            name="refusal_form_type",
        ),
        nullable=False,
    )
    # human-readable status for the form lifecycle
    status = Column(
        SAEnum("generated", "previewed", "downloaded", name="refusal_form_status"),
        nullable=False,
        default="generated",
    )
    form_data = Column(JSON, nullable=False)  # rendered form payload
    notes = Column(Text, nullable=True)
    generated_by = Column(String, ForeignKey("users.id"), nullable=False)
    generated_at = Column(DateTime, default=_utcnow)
    downloaded_at = Column(DateTime, nullable=True)
