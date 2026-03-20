from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, validator


class RoutingFlags(BaseModel):
    standard: bool = True
    homeCare: bool = False
    equipment: bool = False
    refusal: bool = False


class EquipmentItemInput(BaseModel):
    itemName: str
    itemCode: Optional[str] = None
    quantity: float = 1.0
    trainingRequired: bool = False
    returnRequired: bool = False
    depositRequired: bool = False
    depositAmount: Optional[float] = None


class HomeCarePlanInput(BaseModel):
    providerName: str
    serviceSummary: str
    startDate: Optional[str] = None
    notes: Optional[str] = None


class InternalSessionCreateRequest(BaseModel):
    patientId: str
    encounterId: str
    phone: str
    email: Optional[str] = None
    flags: RoutingFlags
    paymentRequired: bool = False
    paymentAmount: float = 0.0
    equipmentItems: List[EquipmentItemInput] = Field(default_factory=list)
    homeCarePlan: Optional[HomeCarePlanInput] = None
    liabilityTerms: Optional[str] = None
    estimatedLiabilityAmount: Optional[float] = None
    oneTimeAccess: bool = False
    otpEnabled: bool = False


class OtpVerifyRequest(BaseModel):
    otp: str = Field(..., min_length=4, max_length=8)


class PublicFormSubmissionRequest(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict)


class SignatureSubmitRequest(BaseModel):
    signerName: str = Field(..., min_length=2)
    signerRole: Literal["patient", "guardian", "representative"]
    signatureDataUrl: str = Field(..., min_length=32)
    consentAccepted: bool
    deviceFingerprint: Optional[str] = None

    @validator("signatureDataUrl")
    def signature_data_url_must_be_data_url(cls, value: str) -> str:
        if not value.startswith("data:image"):
            raise ValueError("Invalid signature payload")
        return value


class PaymentCreateRequest(BaseModel):
    method: Literal["card"] = "card"


class PaymentWebhookPayload(BaseModel):
    providerReference: str
    status: str
    sessionId: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TemplatePatchRequest(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    version: Optional[str] = None
    isPublished: Optional[bool] = None
    status: Optional[str] = None


class EmrDischargeOrderIssuedRequest(BaseModel):
    sourceSystem: str = "emr"
    patientId: str
    encounterId: str
    phone: str
    email: Optional[str] = None
    flags: RoutingFlags
    paymentRequired: bool = False
    paymentAmount: float = 0.0
    equipmentItems: List[EquipmentItemInput] = Field(default_factory=list)
    homeCarePlan: Optional[HomeCarePlanInput] = None
    liabilityTerms: Optional[str] = None
    estimatedLiabilityAmount: Optional[float] = None


class EmrDischargeStatusSyncRequest(BaseModel):
    sessionId: str
    status: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
