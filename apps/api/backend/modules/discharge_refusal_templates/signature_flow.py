from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass(frozen=True)
class SignatureFlowBlueprint:
    flow_name: str
    steps: List[str]
    required_evidence: List[str]


SIGNATURE_READY_BLUEPRINT = SignatureFlowBlueprint(
    flow_name="sms_secure_link_otp_signature",
    steps=[
        "create_signature_request",
        "send_sms_secure_link",
        "verify_otp",
        "render_document_for_signing",
        "capture_patient_signature",
        "persist_signed_copy",
        "persist_document_hash",
        "persist_signature_timestamp",
        "persist_audit_evidence",
        "mark_document_signed",
    ],
    required_evidence=[
        "secure_link_token",
        "otp_challenge_id",
        "otp_verified_at",
        "signature_hash",
        "signed_at",
        "ip_address",
        "device_metadata",
    ],
)


def build_signature_request(*, case_id: str, document_id: str, phone_number: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "case_id": case_id,
        "document_id": document_id,
        "phone_number": phone_number,
        "signature_status": "pending",
        "flow": SIGNATURE_READY_BLUEPRINT.flow_name,
        "steps": SIGNATURE_READY_BLUEPRINT.steps,
        "required_evidence": SIGNATURE_READY_BLUEPRINT.required_evidence,
        "otp_required": True,
        "secure_link_required": True,
        "payload": payload,
    }
