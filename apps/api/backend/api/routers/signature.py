from fastapi import APIRouter, Depends, HTTPException

from backend.api.deps import require_roles
from backend.schemas.signature import StartAcknowledgmentRequest, VerifyAcknowledgmentRequest
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


@router.post("/cases/{case_id}/acknowledgment/start")
def start_acknowledgment(
    case_id: str,
    req: StartAcknowledgmentRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    try:
        return service.start_acknowledgment(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            document_type=req.document_type,
            method=req.method,
            payload=req.payload,
            current_user=current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي في الخادم")


@router.post("/cases/{case_id}/acknowledgment/{session_id}/verify")
def verify_acknowledgment(
    case_id: str,
    session_id: str,
    req: VerifyAcknowledgmentRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    try:
        return service.verify_acknowledgment(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            session_id=session_id,
            payload=req.payload,
            current_user=current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي في الخادم")


@router.get("/cases/{case_id}/acknowledgment/{session_id}")
def get_acknowledgment_session(
    case_id: str,
    session_id: str,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer")),
):
    try:
        session = service.get_session(session_id=session_id)
        if session.get("case_id") != case_id or session.get("tenant_id") != current_user["tenant_id"]:
            raise ValueError("جلسة الإقرار لا تطابق الحالة أو المستأجر")
        return session
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي في الخادم")
