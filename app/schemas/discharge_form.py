from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, model_validator


class DischargeFormCreate(BaseModel):
    """
    Request body for creating a new Hospital Discharge Form (status: draft).

    Sections
    --------
    1. Basic Information
    2. Pre-discharge checklist
    3. Medical Information
    4. Completion / Signature
    """

    # ── Association ──────────────────────────────────────────────────────────
    patient_id: str

    # ── Section 1: Basic Information ─────────────────────────────────────────
    patient_first_name: str
    patient_last_name: str
    patient_phone_number: Optional[str] = None
    attending_physician_first_name: str
    attending_physician_last_name: str
    facility_name: Optional[str] = None
    date_services_should_end: date

    # ── Section 2: Pre-discharge checklist ───────────────────────────────────
    physician_note_reflecting_readiness_for_discharge: bool = False
    discharge_plan_discussed_with_member_family: bool = False
    discharge_plan_discussed_with_attending_provider: bool = False
    description_of_discharge_plan_in_place: bool = False
    therapy_notes_if_applicable: bool = False
    other_checkbox: bool = False
    other_text: Optional[str] = None

    # ── Section 3: Medical Information ───────────────────────────────────────
    admission_date: date
    admission_symptoms: Optional[str] = None
    diagnosis: str
    treatment: Optional[str] = None
    tests_and_results: Optional[str] = None
    evaluated_by: Optional[str] = None
    current_status: Optional[str] = None
    safe_care_setting: Optional[str] = None
    discharge_plan_follow_up: Optional[str] = None

    # ── Section 4: Completion / Signature ────────────────────────────────────
    completed_by_first_name: Optional[str] = None
    completed_by_last_name: Optional[str] = None
    completed_by_phone_number: Optional[str] = None
    completion_date: Optional[date] = None
    completed_by_signature: Optional[str] = None

    @model_validator(mode="after")
    def validate_form(self) -> "DischargeFormCreate":
        if self.date_services_should_end < self.admission_date:
            raise ValueError(
                "date_services_should_end cannot be earlier than admission_date"
            )
        if self.other_checkbox and not self.other_text:
            raise ValueError(
                "other_text is required when other_checkbox is selected"
            )
        return self


class DischargeFormUpdate(BaseModel):
    """Partial update — only draft forms may be updated."""

    # Section 1
    patient_first_name: Optional[str] = None
    patient_last_name: Optional[str] = None
    patient_phone_number: Optional[str] = None
    attending_physician_first_name: Optional[str] = None
    attending_physician_last_name: Optional[str] = None
    facility_name: Optional[str] = None
    date_services_should_end: Optional[date] = None

    # Section 2
    physician_note_reflecting_readiness_for_discharge: Optional[bool] = None
    discharge_plan_discussed_with_member_family: Optional[bool] = None
    discharge_plan_discussed_with_attending_provider: Optional[bool] = None
    description_of_discharge_plan_in_place: Optional[bool] = None
    therapy_notes_if_applicable: Optional[bool] = None
    other_checkbox: Optional[bool] = None
    other_text: Optional[str] = None

    # Section 3
    admission_date: Optional[date] = None
    admission_symptoms: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    tests_and_results: Optional[str] = None
    evaluated_by: Optional[str] = None
    current_status: Optional[str] = None
    safe_care_setting: Optional[str] = None
    discharge_plan_follow_up: Optional[str] = None

    # Section 4
    completed_by_first_name: Optional[str] = None
    completed_by_last_name: Optional[str] = None
    completed_by_phone_number: Optional[str] = None
    completion_date: Optional[date] = None
    completed_by_signature: Optional[str] = None


class DischargeFormOut(BaseModel):
    """Full response schema for a persisted Hospital Discharge Form instance."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str

    # Section 1
    patient_first_name: str
    patient_last_name: str
    patient_phone_number: Optional[str] = None
    attending_physician_first_name: str
    attending_physician_last_name: str
    facility_name: Optional[str] = None
    date_services_should_end: date

    # Section 2
    physician_note_reflecting_readiness_for_discharge: bool
    discharge_plan_discussed_with_member_family: bool
    discharge_plan_discussed_with_attending_provider: bool
    description_of_discharge_plan_in_place: bool
    therapy_notes_if_applicable: bool
    other_checkbox: bool
    other_text: Optional[str] = None

    # Section 3
    admission_date: date
    admission_symptoms: Optional[str] = None
    diagnosis: str
    treatment: Optional[str] = None
    tests_and_results: Optional[str] = None
    evaluated_by: Optional[str] = None
    current_status: Optional[str] = None
    safe_care_setting: Optional[str] = None
    discharge_plan_follow_up: Optional[str] = None

    # Section 4
    completed_by_first_name: Optional[str] = None
    completed_by_last_name: Optional[str] = None
    completed_by_phone_number: Optional[str] = None
    completion_date: Optional[date] = None
    completed_by_signature: Optional[str] = None

    # Lifecycle
    status: str
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
