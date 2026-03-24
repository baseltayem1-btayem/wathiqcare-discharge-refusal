from __future__ import annotations

from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field


LegalArtifactScreen = Literal[
    "create_case",
    "clinical_decision",
    "risk_disclosure",
    "patient_interaction",
    "refusal_confirmation",
    "final_review",
]

SignerRole = Literal["patient", "physician", "witness", "guardian"]


class LegalArtifactCreateCaseRequest(BaseModel):
    patient_mrn: str
    patient_name: str
    refusal_reason: str
    attending_physician_name: str
    tenant_header: Dict[str, str] = Field(default_factory=dict)
    legal_footer_text: str = Field(default="")


class LegalArtifactUpsertRequest(BaseModel):
    screen: LegalArtifactScreen
    payload: Dict[str, Any] = Field(default_factory=dict)


class LegalArtifactSignatureRequest(BaseModel):
    role: SignerRole
    signature_value: str
    signer_name: str
    signer_role: Optional[str] = None
    ip_address: Optional[str] = None


class LegalArtifactFinalizeRequest(BaseModel):
    confirm_all_sections_complete: bool = False


class LegalArtifactStatusResponse(BaseModel):
    case_id: str
    status: str
    stage: str
    artifact_version: int
    immutable_lock: bool
    finalized_at: Optional[str] = None
    escalation_state: str
    compliance_frameworks: list[str]
    missing_requirements: list[str]
    screens: Dict[str, Dict[str, Any]]
    signatures: Dict[str, Dict[str, Any]]
    tenant_header: Dict[str, str]
    legal_footer_text: str
