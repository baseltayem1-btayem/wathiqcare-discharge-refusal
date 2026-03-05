from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PatientCreate(BaseModel):
    national_id: str
    full_name: str
    date_of_birth: date
    gender: str
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    national_id: str
    full_name: str
    date_of_birth: date
    gender: str
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    registered_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
