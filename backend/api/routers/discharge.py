from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.responses import HTMLResponse
from fastapi.responses import Response

from backend.schemas.discharge import DischargeRefusalRequest
from backend.schemas.discharge_workflow import (
    WorkflowActionRequest,
    WorkflowTemplateGenerateRequest,
    WorkflowTemplatePreviewRequest,
    WorkflowValidationRequest,
)
from pydantic import BaseModel, Field
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
from backend.forms.medical_legal_forms_library import FORMS_LIBRARY, render_form_by_key
from backend.core.discharge_query_service import (
    list_discharge_cases_for_tenant,
    get_discharge_case_detail,
    list_audit_logs_for_case,
    list_bundles,
    get_refusal_quality_metrics,
    get_compliance_dashboard_data,
)
from backend.legal.escalation_case_service import (
    add_escalation_note,
    assign_escalation_case,
    get_escalation_case_detail,
    list_escalation_cases,
    resolve_escalation_case,
    update_escalation_priority,
)

router = APIRouter(prefix="/api/discharge", tags=["Discharge"])

ROLE_PHYSICIAN = "doctor"
ROLE_NURSING = "nursing"
ROLE_PATIENT_AFFAIRS = "patient_affairs"
ROLE_SOCIAL_SERVICES = "social_services"
ROLE_QUALITY = "quality"
ROLE_COMPLIANCE = "compliance"
ROLE_LEGAL = "legal_admin"

ROLE_WORKFLOW_VIEW = (
    "tenant_admin",
    ROLE_LEGAL,
    ROLE_PHYSICIAN,
    "viewer",
    ROLE_NURSING,
    ROLE_PATIENT_AFFAIRS,
    ROLE_SOCIAL_SERVICES,
    ROLE_QUALITY,
    ROLE_COMPLIANCE,
)

ROLE_WORKFLOW_EDIT = (
    "tenant_admin",
    ROLE_LEGAL,
    ROLE_PHYSICIAN,
    ROLE_NURSING,
    ROLE_PATIENT_AFFAIRS,
    ROLE_SOCIAL_SERVICES,
    ROLE_COMPLIANCE,
)

SENSITIVE_ACTION_ROLE_MAP = {
    "escalate_legal_compliance": ("tenant_admin", ROLE_LEGAL, ROLE_COMPLIANCE),
    "record_compliance_review": ("tenant_admin", ROLE_COMPLIANCE),
    "record_legal_review": ("tenant_admin", ROLE_LEGAL),
    "close_under_review": ("tenant_admin", ROLE_LEGAL),
}


class LegalEscalationAssignRequest(BaseModel):
    assigned_counsel: str
    follow_up_date: str | None = None


class LegalEscalationNoteRequest(BaseModel):
    note: str
    note_type: str = "general"


class LegalEscalationPriorityRequest(BaseModel):
    priority: str


class LegalEscalationResolveRequest(BaseModel):
    resolution_notes: str
    close_case: bool = False


def _enforce_sensitive_action_roles(action: str, current_user: dict) -> None:
    allowed_roles = SENSITIVE_ACTION_ROLE_MAP.get(action)
    if not allowed_roles:
        return
    if current_user.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="الصلاحيات غير كافية لهذا الإجراء")


class MedicalLegalFormsRenderRequest(BaseModel):
    template_key: str = Field(..., description="Template key from forms library")
    payload: dict[str, str] = Field(default_factory=dict)

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
        raise HTTPException(status_code=500, detail=f"خطأ داخلي في الخادم: {str(e)}")

@router.get("/cases")
def get_cases(current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW))):
    return list_discharge_cases_for_tenant(current_user["tenant_id"])

@router.get("/cases/{case_id}")
def get_case(case_id: str, current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW))):
    result = get_discharge_case_detail(current_user["tenant_id"], case_id)
    if not result:
        raise HTTPException(status_code=404, detail="الحالة غير موجودة")
    return result


@router.get("/cases/{case_id}/workflow")
def get_case_workflow(
    case_id: str,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW)),
):
    try:
        return get_workflow_snapshot(tenant_id=current_user["tenant_id"], case_id=case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/cases/{case_id}/workflow/actions")
def run_case_workflow_action(
    case_id: str,
    payload: WorkflowActionRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    try:
        _enforce_sensitive_action_roles(payload.action, current_user)
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
        raise HTTPException(status_code=500, detail=f"خطأ داخلي في الخادم: {str(e)}")


@router.get("/cases/legal-escalation")
def get_legal_escalation_cases(
    current_user=Depends(require_roles("tenant_admin", ROLE_LEGAL, ROLE_COMPLIANCE, ROLE_QUALITY, "viewer")),
):
    return list_escalation_cases(tenant_id=current_user["tenant_id"])


@router.get("/cases/{case_id}/legal-escalation")
def get_legal_escalation_case(
    case_id: str,
    current_user=Depends(require_roles("tenant_admin", ROLE_LEGAL, ROLE_COMPLIANCE, ROLE_QUALITY, "viewer")),
):
    try:
        return get_escalation_case_detail(tenant_id=current_user["tenant_id"], case_id=case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/cases/{case_id}/legal-escalation/assign")
def assign_legal_escalation_case(
    case_id: str,
    payload: LegalEscalationAssignRequest,
    current_user=Depends(require_roles("tenant_admin", ROLE_LEGAL)),
):
    try:
        return assign_escalation_case(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            assigned_counsel=payload.assigned_counsel,
            follow_up_date=payload.follow_up_date,
            current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal-escalation/notes")
def add_legal_escalation_case_note(
    case_id: str,
    payload: LegalEscalationNoteRequest,
    current_user=Depends(require_roles("tenant_admin", ROLE_LEGAL, ROLE_COMPLIANCE)),
):
    try:
        return add_escalation_note(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            note=payload.note,
            note_type=payload.note_type,
            current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal-escalation/priority")
def update_legal_escalation_case_priority(
    case_id: str,
    payload: LegalEscalationPriorityRequest,
    current_user=Depends(require_roles("tenant_admin", ROLE_LEGAL)),
):
    try:
        return update_escalation_priority(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            priority=payload.priority,
            current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal-escalation/resolve")
def resolve_legal_escalation_case(
    case_id: str,
    payload: LegalEscalationResolveRequest,
    current_user=Depends(require_roles("tenant_admin", ROLE_LEGAL)),
):
    try:
        return resolve_escalation_case(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            resolution_notes=payload.resolution_notes,
            close_case=payload.close_case,
            current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/workflow/preview")
def preview_case_workflow_document(
    case_id: str,
    payload: WorkflowTemplatePreviewRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW)),
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
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW)),
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
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    action = {
        "discharge_refusal_form": "generate_refusal_form",
        "financial_responsibility_notice": "generate_financial_notice",
    }.get(payload.template_key)

    if not action:
        raise HTTPException(status_code=400, detail="مفتاح النموذج غير مدعوم")

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
        raise HTTPException(status_code=500, detail=f"خطأ داخلي في الخادم: {str(e)}")


@router.get("/cases/{case_id}/documents")
def get_case_documents(
    case_id: str,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW)),
):
    try:
        return list_case_documents(tenant_id=current_user["tenant_id"], case_id=case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/documents/{document_id}/view", response_class=HTMLResponse)
def view_case_document(
    document_id: str,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW)),
):
    try:
        document = get_document_record(tenant_id=current_user["tenant_id"], document_id=document_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return HTMLResponse(content=document.html_content)


@router.get("/documents/{document_id}/download")
def download_case_document(
    document_id: str,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW)),
):
    try:
        document = get_document_record(tenant_id=current_user["tenant_id"], document_id=document_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    path = Path(document.file_path)
    if not path.exists():
        if document.html_content:
            return Response(
                content=document.html_content,
                media_type="text/html",
                headers={
                    "Content-Disposition": f'attachment; filename="{document.file_name}"',
                },
            )
        raise HTTPException(status_code=404, detail="ملف المستند غير موجود")

    return FileResponse(path=str(path), filename=document.file_name, media_type="text/html")

@router.get("/audit/{case_id}")
def get_case_audit(case_id: str, current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer"))):
    result = list_audit_logs_for_case(current_user["tenant_id"], case_id)
    if result is None:
        raise HTTPException(status_code=404, detail="الحالة غير موجودة")
    return result

@router.get("/bundles")
def get_bundles(current_user=Depends(require_roles("tenant_admin", "legal_admin"))):
    return list_bundles()


@router.get("/reports/refusal-quality")
def refusal_quality_dashboard(
    current_user=Depends(require_roles("tenant_admin", ROLE_QUALITY, ROLE_COMPLIANCE, ROLE_LEGAL)),
):
    return get_refusal_quality_metrics(current_user["tenant_id"])


@router.get("/reports/compliance-dashboard")
def compliance_dashboard(
    current_user=Depends(require_roles("tenant_admin", ROLE_QUALITY, ROLE_COMPLIANCE, ROLE_LEGAL, "viewer")),
):
    return get_compliance_dashboard_data(current_user["tenant_id"])


@router.get("/forms-library/medical-legal/templates")
def list_medical_legal_templates(
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW)),
):
    return {
        "library": "Forms Library - Medical Legal Forms",
        "templates": [
            {
                "key": item.key,
                "title": item.title,
                "code": item.code,
                "version": item.version,
                "locked_template": item.locked_template,
                "digitally_signable": True,
                "pdf_exportable": True,
                "case_attachable": True,
                "bilingual": item.bilingual,
            }
            for item in FORMS_LIBRARY.values()
        ],
    }


@router.post("/forms-library/medical-legal/render")
def render_medical_legal_template(
    request: MedicalLegalFormsRenderRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW)),
):
    if request.template_key not in FORMS_LIBRARY:
        raise HTTPException(status_code=400, detail="Template key is not registered in forms library")

    template = FORMS_LIBRARY[request.template_key]
    html_content = render_form_by_key(request.template_key, request.payload)
    return {
        "template": {
            "key": template.key,
            "title": template.title,
            "code": template.code,
            "version": template.version,
            "locked_template": template.locked_template,
        },
        "html_content": html_content,
    }

@router.get("/pdf/{filename}")
def get_pdf(filename: str, current_user=Depends(get_current_user)):
    file_path = Path("backend/generated") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="ملف PDF غير موجود")
    return FileResponse(path=str(file_path), filename=filename, media_type="application/pdf")

@router.post("/evidence-bundle/{discharge_case_id}")
def build_evidence_bundle(
    discharge_case_id: str,
    current_user=Depends(require_roles("tenant_admin", "legal_admin"))
):
    try:
        return generate_evidence_bundle(discharge_case_id, actor_user_id=current_user["id"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ داخلي في الخادم: {str(e)}")

@router.get("/evidence-bundle/download/{filename}")
def download_evidence_bundle(
    filename: str,
    current_user=Depends(require_roles("tenant_admin", "legal_admin"))
):
    file_path = Path("backend/generated/bundles") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="حزمة الأدلة غير موجودة")
    return FileResponse(path=str(file_path), filename=filename, media_type="application/zip")
