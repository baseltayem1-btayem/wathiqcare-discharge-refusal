from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


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

    class Config:
        from_attributes = True
