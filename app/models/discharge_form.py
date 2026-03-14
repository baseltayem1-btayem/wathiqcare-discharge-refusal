import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum

from app.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class DischargeForm(Base):
    """Inpatient Care Discharge Form — persisted form instance linked to a patient record."""

    __tablename__ = "discharge_forms"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)

    # Patient name fields (provided at form creation time; may be pre-filled from patient record)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    patient_identifier = Column(String, nullable=False)  # National ID or Iqama number

    # Clinical dates
    date_of_admission = Column(Date, nullable=False)
    date_of_discharge = Column(Date, nullable=False)

    # Clinical content
    diagnosis = Column(Text, nullable=False)
    treatment_summary = Column(Text, nullable=False)
    discharge_instructions = Column(Text, nullable=False)
    follow_up_appointment_date = Column(Date, nullable=True)

    # Physician
    physician_first_name = Column(String, nullable=False)
    physician_last_name = Column(String, nullable=False)

    # Signature — text placeholder; upgradeable to binary pad data in a future enhancement
    patient_guardian_signature = Column(Text, nullable=True)

    # Lifecycle
    status = Column(
        SAEnum("draft", "submitted", "signed", name="discharge_form_status"),
        nullable=False,
        default="draft",
    )
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)
    submitted_at = Column(DateTime, nullable=True)
