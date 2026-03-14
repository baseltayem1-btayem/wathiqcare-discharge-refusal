from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, model_validator


class DischargeFormCreate(BaseModel):
    """Request body for creating a new discharge form (status: draft)."""

    patient_id: str
    first_name: str
    last_name: str
    patient_identifier: str  # National ID or Iqama
    date_of_admission: date
    date_of_discharge: date
    diagnosis: str
    treatment_summary: str
    discharge_instructions: str
    follow_up_appointment_date: Optional[date] = None
    physician_first_name: str
    physician_last_name: str
    patient_guardian_signature: Optional[str] = None

    @model_validator(mode="after")
    def validate_dates(self) -> "DischargeFormCreate":
        if self.date_of_discharge < self.date_of_admission:
            raise ValueError(
                "discharge date cannot be earlier than admission date"
            )
        if (
            self.follow_up_appointment_date is not None
            and self.follow_up_appointment_date < self.date_of_discharge
        ):
            raise ValueError(
                "follow-up appointment date should not be earlier than discharge date"
            )
        return self


class DischargeFormUpdate(BaseModel):
    """Partial update — only draft forms may be updated."""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    patient_identifier: Optional[str] = None
    date_of_admission: Optional[date] = None
    date_of_discharge: Optional[date] = None
    diagnosis: Optional[str] = None
    treatment_summary: Optional[str] = None
    discharge_instructions: Optional[str] = None
    follow_up_appointment_date: Optional[date] = None
    physician_first_name: Optional[str] = None
    physician_last_name: Optional[str] = None
    patient_guardian_signature: Optional[str] = None


class DischargeFormOut(BaseModel):
    """Full response schema for a persisted discharge form instance."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    first_name: str
    last_name: str
    patient_identifier: str
    date_of_admission: date
    date_of_discharge: date
    diagnosis: str
    treatment_summary: str
    discharge_instructions: str
    follow_up_appointment_date: Optional[date] = None
    physician_first_name: str
    physician_last_name: str
    patient_guardian_signature: Optional[str] = None
    status: str
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
