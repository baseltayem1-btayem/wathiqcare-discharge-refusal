from typing import Any, Dict

from pydantic import BaseModel, Field


class StartAcknowledgmentRequest(BaseModel):
    document_type: str = Field(..., description="discharge_refusal_form | financial_responsibility_notice")
    method: str = Field(..., description="SMS_OTP | NAFATH | TABLET_SIGNATURE")
    payload: Dict[str, Any] = Field(default_factory=dict)


class VerifyAcknowledgmentRequest(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict)
