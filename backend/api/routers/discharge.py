from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.responses import HTMLResponse

from backend.schemas.discharge import DischargeRefusalRequest
from backend.schemas.discharge_workflow import (
    WorkflowActionRequest,
    WorkflowTemplateGenerateRequest,
    WorkflowTemplatePreviewRequest,
    WorkflowValidationRequest,
)
from backend.core.discharge_service import create_discharge_refusal
from backend.core.discharge_workflow_service import (
    get_document_record,
    get_workflow_snapshot,
    list_case_documents,
    preview_workflow_document,
    run_workflow_action,
    validate_workflow_generation,
)
from backend.legal.evidence_bundle import generate_evidence_bundle
from backend.api.deps import get_current_user, require_roles
from backend.core.discharge_query_service import (
    list_discharge_cases_for_tenant,
    get_discharge_case_detail,
    list_audit_logs_for_case,
    list_bundles,
)

router = APIRouter(prefix="/api/discharge", tags=["Discharge"])

@router.post("/refusal")
def create_refusal(
    payload: DischargeRefusalRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor"))
):
    try:
        return create_discharge_refusal(
            tenant_code=current_user["tenant_code"],
            user_email=current_user["email"],
            patient_mrn=payload.patient_mrn,
            patient_name=payload.patient_name,
            refusal_reason=payload.refusal_reason,
            signer_name=payload.signer_name,
            signer_role=payload.signer_role,
            signature_text=payload.signature_text,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/cases")
def get_cases(current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer"))):
    return list_discharge_cases_for_tenant(current_user["tenant_id"])

@router.get("/cases/{case_id}")
def get_case(case_id: str, current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer"))):
    result = get_discharge_case_detail(current_user["tenant_id"], case_id)
    if not result:
        raise HTTPException(status_code=404, detail="Case not found")
    return result


@router.get("/cases/{case_id}/workflow")
def get_case_workflow(
    case_id: str,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer")),
):
    try:
        return get_workflow_snapshot(tenant_id=current_user["tenant_id"], case_id=case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/cases/{case_id}/workflow/actions")
def run_case_workflow_action(
    case_id: str,
    payload: WorkflowActionRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    try:
        return run_workflow_action(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            action=payload.action,
            payload=payload.payload,
            current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/cases/{case_id}/workflow/preview")
def preview_case_workflow_document(
    case_id: str,
    payload: WorkflowTemplatePreviewRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer")),
):
    try:
        return preview_workflow_document(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            template_key=payload.template_key,
            payload=payload.payload,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/workflow/validate")
def validate_case_workflow_document(
    case_id: str,
    payload: WorkflowValidationRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer")),
):
    try:
        return validate_workflow_generation(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            template_key=payload.template_key,
            payload=payload.payload,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/workflow/generate")
def generate_case_workflow_document(
    case_id: str,
    payload: WorkflowTemplateGenerateRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    action = {
        "discharge_refusal_form": "generate_refusal_form",
        "financial_responsibility_notice": "generate_financial_notice",
    }.get(payload.template_key)

    if not action:
        raise HTTPException(status_code=400, detail="Unsupported template key")

    try:
        return run_workflow_action(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            action=action,
            payload=payload.payload,
            current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/cases/{case_id}/documents")
def get_case_documents(
    case_id: str,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer")),
):
    try:
        return list_case_documents(tenant_id=current_user["tenant_id"], case_id=case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/documents/{document_id}/view", response_class=HTMLResponse)
def view_case_document(
    document_id: str,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer")),
):
    try:
        document = get_document_record(tenant_id=current_user["tenant_id"], document_id=document_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return HTMLResponse(content=document.html_content)


@router.get("/documents/{document_id}/download")
def download_case_document(
    document_id: str,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer")),
):
    try:
        document = get_document_record(tenant_id=current_user["tenant_id"], document_id=document_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    path = Path(document.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Document file not found")

    return FileResponse(path=str(path), filename=document.file_name, media_type="text/html")

@router.get("/audit/{case_id}")
def get_case_audit(case_id: str, current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer"))):
    result = list_audit_logs_for_case(current_user["tenant_id"], case_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return result

@router.get("/bundles")
def get_bundles(current_user=Depends(require_roles("tenant_admin", "legal_admin"))):
    return list_bundles()

@router.get("/pdf/{filename}")
def get_pdf(filename: str, current_user=Depends(get_current_user)):
    file_path = Path("backend/generated") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found")
    return FileResponse(path=str(file_path), filename=filename, media_type="application/pdf")

@router.post("/evidence-bundle/{discharge_case_id}")
def build_evidence_bundle(
    discharge_case_id: str,
    current_user=Depends(require_roles("tenant_admin", "legal_admin"))
):
    try:
        return generate_evidence_bundle(discharge_case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/evidence-bundle/download/{filename}")
def download_evidence_bundle(
    filename: str,
    current_user=Depends(require_roles("tenant_admin", "legal_admin"))
):
    file_path = Path("backend/generated/bundles") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Evidence bundle not found")
    return FileResponse(path=str(file_path), filename=filename, media_type="application/zip")
