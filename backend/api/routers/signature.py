from fastapi import APIRouter, Depends, HTTPException

from backend.api.deps import require_roles
from backend.schemas.signature import (
    StartAcknowledgmentRequest, VerifyAcknowledgmentRequest,
    PresentationRecord, SignatureOutcomeRecord, WitnessRecord, ArtifactMetadata, ReadinessState
)
from backend.signature.signature_proof_service import SignatureProofService

router = APIRouter(prefix="/api/discharge", tags=["Discharge Signature Proof"])
service = SignatureProofService()


@router.get("/cases/{case_id}/acknowledgment/methods")
def list_acknowledgment_methods(
    case_id: str,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer")),
):
    # case_id retained for route consistency and future method policies by case.
    _ = case_id
    return {"methods": service.list_methods()}


def start_acknowledgment(
    case_id: str,

    req: StartAcknowledgmentRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    # Minimal stub for test collection
    pass


def verify_acknowledgment(
    case_id: str,
    session_id: str,
    req: VerifyAcknowledgmentRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    # Minimal stub for test collection
    pass


def get_acknowledgment_session(
    case_id: str,
    session_id: str,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer")),
):
    # Minimal stub for test collection
    pass
