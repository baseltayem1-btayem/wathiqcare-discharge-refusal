from pydantic import BaseModel
from typing import Optional, List


class DischargeCaseListItem(BaseModel):
    id: str
    patient_mrn: str
    patient_name: str
    status: str
    refusal_reason: Optional[str] = None
    signer_name: Optional[str] = None
    signer_role: Optional[str] = None
    pdf_file: Optional[str] = None
    created_at: Optional[str] = None


class DischargeCaseDetail(BaseModel):
    id: str
    tenant_id: str
    patient_id: str
    created_by: str
    patient_mrn: str
    patient_name: str
    status: str
    refusal_reason: Optional[str] = None
    signer_name: Optional[str] = None
    signer_role: Optional[str] = None
    signature_text: Optional[str] = None
    signed_at: Optional[str] = None
    pdf_file: Optional[str] = None
    created_at: Optional[str] = None


class AuditLogItem(BaseModel):
    id: str
    action: str
    details: Optional[str] = None
    created_at: Optional[str] = None


class BundleItem(BaseModel):
    name: str
    path: str
