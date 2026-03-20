from pydantic import BaseModel, Field
from typing import Optional, List


class WorkflowCaseDocumentItem(BaseModel):
    id: str
    template_key: str
    document_code: Optional[str] = None
    title: str
    file_name: str
    generated_at: Optional[str] = None


class PolicyDocumentationSnapshot(BaseModel):
    decision_recorded_at: Optional[str] = None
    discussion_summary: Optional[str] = None
    refusal_reasons: Optional[str] = None
    forms_issued: Optional[str] = None
    social_administrative_interventions: Optional[str] = None
    last_validated_at: Optional[str] = None
    last_validation_status: Optional[str] = None


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
    generated_documents: List[WorkflowCaseDocumentItem] = Field(default_factory=list)
    policy_documentation: Optional[PolicyDocumentationSnapshot] = None


class AuditLogItem(BaseModel):
    id: str
    action: str
    details: Optional[str] = None
    created_at: Optional[str] = None


class BundleItem(BaseModel):
    name: str
    path: str
