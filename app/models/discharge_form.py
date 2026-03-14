import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum

from app.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class DischargeForm(Base):
    """
    Hospital Discharge Form — persisted form instance linked to a patient record.

    Sections
    --------
    1. Basic Information
    2. Pre-discharge checklist (boolean flags + optional free-text "Other")
    3. Medical Information (narrative fields)
    4. Completion / Signature
    """

    __tablename__ = "discharge_forms"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)

    # ── Section 1: Basic Information ─────────────────────────────────────────
    patient_first_name = Column(String, nullable=False)
    patient_last_name = Column(String, nullable=False)
    patient_phone_number = Column(String, nullable=True)
    attending_physician_first_name = Column(String, nullable=False)
    attending_physician_last_name = Column(String, nullable=False)
    facility_name = Column(String, nullable=True)
    date_services_should_end = Column(Date, nullable=False)

    # ── Section 2: Pre-discharge checklist ───────────────────────────────────
    physician_note_reflecting_readiness_for_discharge = Column(Boolean, nullable=False, default=False)
    discharge_plan_discussed_with_member_family = Column(Boolean, nullable=False, default=False)
    discharge_plan_discussed_with_attending_provider = Column(Boolean, nullable=False, default=False)
    description_of_discharge_plan_in_place = Column(Boolean, nullable=False, default=False)
    therapy_notes_if_applicable = Column(Boolean, nullable=False, default=False)
    other_checkbox = Column(Boolean, nullable=False, default=False)
    other_text = Column(Text, nullable=True)  # Required when other_checkbox is True

    # ── Section 3: Medical Information (narrative) ────────────────────────────
    admission_date = Column(Date, nullable=False)
    admission_symptoms = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=False)
    treatment = Column(Text, nullable=True)
    tests_and_results = Column(Text, nullable=True)
    evaluated_by = Column(Text, nullable=True)
    current_status = Column(Text, nullable=True)
    safe_care_setting = Column(Text, nullable=True)
    discharge_plan_follow_up = Column(Text, nullable=True)

    # ── Section 4: Completion / Signature ────────────────────────────────────
    completed_by_first_name = Column(String, nullable=True)
    completed_by_last_name = Column(String, nullable=True)
    completed_by_phone_number = Column(String, nullable=True)
    completion_date = Column(Date, nullable=True)
    # Text placeholder — upgradeable to binary pad data in a future enhancement
    completed_by_signature = Column(Text, nullable=True)

    # ── Lifecycle ─────────────────────────────────────────────────────────────
    status = Column(
        SAEnum("draft", "submitted", "signed", name="discharge_form_status"),
        nullable=False,
        default="draft",
    )
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)
    submitted_at = Column(DateTime, nullable=True)
