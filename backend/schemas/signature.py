from typing import Any, Dict

from pydantic import BaseModel, Field



class PresentationRecord(BaseModel):
    case_id: str
    presented_at: str
    presented_by: str
    presented_to_name: str
    presented_to_type: str  # patient / guardian / representative
    language: str
    interpreter_used: bool
    notice_method: str
    document_type: str
    viewed_duration_seconds: int
    acknowledged_view: bool
    identity_verified: bool

class SignatureOutcomeRecord(BaseModel):
    case_id: str
    signer_name: str
    signer_role: str
    signed_at: str
    outcome: str  # signed / refused_to_sign / unable_to_sign / witness_signed
    reason: str = ""

class WitnessRecord(BaseModel):
    case_id: str
    witness_name: str
    witness_role: str
    witness_signed_at: str

class ArtifactMetadata(BaseModel):
    case_id: str
    source_mode: str
    document_version: str
    hash: str
    captured_by: str

class StartAcknowledgmentRequest(BaseModel):
    document_type: str = Field(
        ...,
        description="discharge_refusal_form | financial_responsibility_notice | informed_consent | home_healthcare_agreement",
    )
    method: str = Field(..., description="sms_otp | nafath | tablet_signature")
    payload: Dict[str, Any] = Field(default_factory=dict)


class VerifyAcknowledgmentRequest(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict)

class ReadinessState(BaseModel):
    case_id: str
    ready_for_legal: bool
    reason: str = ""
