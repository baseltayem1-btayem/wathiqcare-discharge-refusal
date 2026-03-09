from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class EvidenceInput:
    consent_id: str | None
    document_id: str | None
    patient_id: str | None
    case_id: str | None
    method: str
    status: str
    provider_summary: dict


def build_evidence_bundle(payload: EvidenceInput) -> dict:
    return {
        "consent_id": payload.consent_id,
        "document_id": payload.document_id,
        "patient_id": payload.patient_id,
        "case_id": payload.case_id,
        "signature_method": payload.method,
        "status": payload.status,
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "provider_summary": payload.provider_summary,
    }
