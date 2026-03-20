from typing import Any, Dict

from pydantic import BaseModel, Field


class StartAcknowledgmentRequest(BaseModel):
    document_type: str = Field(
        ...,
        description="discharge_refusal_form | financial_responsibility_notice | informed_consent | home_healthcare_agreement",
    )
    method: str = Field(..., description="sms_otp | nafath | tablet_signature")
    payload: Dict[str, Any] = Field(default_factory=dict)


class VerifyAcknowledgmentRequest(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict)
