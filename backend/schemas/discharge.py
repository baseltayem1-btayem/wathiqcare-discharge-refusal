from pydantic import BaseModel

class DischargeRefusalRequest(BaseModel):
    patient_mrn: str
    patient_name: str
    refusal_reason: str
    signer_name: str
    signer_role: str
    signature_text: str
