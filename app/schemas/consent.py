from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class ConsentCreate(BaseModel):
    patient_id: str
    consent_type: str
    icd11_codes: Optional[List[str]] = []
    procedure_description: Optional[str] = None
    witnessed_by: Optional[str] = None
    valid_until: Optional[datetime] = None


class ConsentUpdate(BaseModel):
    status: Optional[str] = None
    refusal_reason: Optional[str] = None
    witnessed_by: Optional[str] = None


class ConsentOut(BaseModel):
    id: str
    patient_id: str
    consent_type: str
    status: str
    icd11_codes: Optional[List[str]] = []
    procedure_description: Optional[str] = None
    consented_by: str
    witnessed_by: Optional[str] = None
    signed_at: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    refusal_reason: Optional[str] = None
    is_escalated: bool
    escalated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
