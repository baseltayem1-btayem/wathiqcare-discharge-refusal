from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, Request
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
from backend.core.rbac import (
    filter_case_summaries,
    log_privileged_document_download,
    require_any_permission,
    require_case_access,
    require_permission,
)
from backend.forms.medical_legal_forms_library import FORMS_LIBRARY, render_form_by_key
from backend.core.discharge_query_service import (
    list_discharge_cases_for_tenant,
    get_discharge_case_detail,
    list_audit_logs_for_case,
    list_bundles,
    bundle_belongs_to_tenant,
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
from backend.legal.legal_artifact_service import (
    create_legal_artifact_case,
    finalize_legal_artifact,
    generate_legal_artifact_pdf,
    get_legal_artifact_status,
    record_legal_signature,
    upsert_legal_artifact_screen,
)
from backend.schemas.legal_artifact import (
    LegalArtifactCreateCaseRequest,
    LegalArtifactFinalizeRequest,
    LegalArtifactSignatureRequest,
    LegalArtifactUpsertRequest,
)
from backend.core.database import SessionLocal
from backend.modules.discharge_legal_workflow.legal_orchestration_service import (
    ActorContext,
    LegalOrchestrationService,
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


class DecisionEventUpsertRequest(BaseModel):
    payload: dict = Field(default_factory=dict)


class LegalStateTransitionRequest(BaseModel):
    target_state: str
    reason: str | None = None


class MasterDocumentGenerateRequest(BaseModel):
    payload: dict = Field(default_factory=dict)


class NoticePresentationRequest(BaseModel):
    payload: dict = Field(default_factory=dict)


class PatientResponseRecordRequest(BaseModel):
    payload: dict = Field(default_factory=dict)


class FinancialAcknowledgmentRequest(BaseModel):
    payload: dict = Field(default_factory=dict)


class PromissoryNoteRequest(BaseModel):
    payload: dict = Field(default_factory=dict)


class HomeHealthcareAgreementRequest(BaseModel):
    payload: dict = Field(default_factory=dict)


class EquipmentLeaseRequest(BaseModel):
    payload: dict = Field(default_factory=dict)


class LegalUndertakingRequest(BaseModel):
    payload: dict = Field(default_factory=dict)


class EscalationEventCreateRequest(BaseModel):
    payload: dict = Field(default_factory=dict)


def _legal_actor(current_user: dict) -> ActorContext:
    return ActorContext(
        user_id=current_user.get("id"),
        tenant_id=current_user["tenant_id"],
        user_name=current_user.get("email", "unknown"),
    )


def _get_db():
    """Yield a SQLAlchemy session and close it when done (proper DI pattern)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _with_legal_service(fn):
    """Compatibility wrapper — creates its own scoped session for non-DI routes."""
    db = SessionLocal()
    try:
        service = LegalOrchestrationService(db)
        return fn(service)
    finally:
        db.close()

@router.post("/refusal")
def create_refusal(
    payload: DischargeRefusalRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor"))
):
    require_permission(current_user, "cases.create")
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
    except Exception:
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي في الخادم")

@router.get("/cases")
def get_cases(current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW))):
    require_any_permission(current_user, ("cases.read.all", "cases.read.tenant", "cases.read.assigned"))
    results = list_discharge_cases_for_tenant(current_user["tenant_id"])
    return filter_case_summaries(current_user, results)

@router.get("/cases/{case_id}")
def get_case(case_id: str, current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW))):
    require_any_permission(current_user, ("cases.read.all", "cases.read.tenant", "cases.read.assigned"))
    require_case_access(current_user, case_id)
    result = get_discharge_case_detail(current_user["tenant_id"], case_id)
    if not result:
        raise HTTPException(status_code=404, detail="الحالة غير موجودة")
    return result


@router.post("/cases/legal-artifact/create")
def create_legal_artifact_case_endpoint(
    payload: LegalArtifactCreateCaseRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    try:
        return create_legal_artifact_case(
            tenant_id=current_user["tenant_id"],
            actor_user_id=current_user["id"],
            payload=payload.model_dump(),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/cases/{case_id}/legal-artifact")
def get_legal_artifact_case_status(
    case_id: str,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW)),
):
    require_permission(current_user, "legal.review")
    require_case_access(current_user, case_id)
    try:
        return get_legal_artifact_status(tenant_id=current_user["tenant_id"], case_id=case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/cases/{case_id}/legal-artifact")
def upsert_legal_artifact_case_screen(
    case_id: str,
    payload: LegalArtifactUpsertRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    require_permission(current_user, "legal.review")
    require_case_access(current_user, case_id)
    try:
        return upsert_legal_artifact_screen(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            screen=payload.screen,
            payload=payload.payload,
            actor_user_id=current_user["id"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal-artifact/sign")
def sign_legal_artifact_case(
    case_id: str,
    payload: LegalArtifactSignatureRequest,
    request: Request,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    try:
        client_ip = payload.ip_address or (request.client.host if request.client else "unknown")
        return record_legal_signature(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            role=payload.role,
            signature_value=payload.signature_value,
            signer_name=payload.signer_name,
            signer_role=payload.signer_role,
            ip_address=client_ip,
            actor_user_id=current_user["id"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal-artifact/finalize")
def finalize_legal_artifact_case(
    case_id: str,
    payload: LegalArtifactFinalizeRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    require_permission(current_user, "legal.approve.readiness")
    require_case_access(current_user, case_id)
    try:
        return finalize_legal_artifact(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            actor_user_id=current_user["id"],
            confirm_all_sections_complete=payload.confirm_all_sections_complete,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal-artifact/pdf")
def generate_legal_artifact_case_pdf(
    case_id: str,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW)),
):
    require_permission(current_user, "documents.generate_pdf")
    require_case_access(current_user, case_id)
    try:
        return generate_legal_artifact_pdf(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/cases/{case_id}/workflow")
def get_case_workflow(
    case_id: str,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW)),
):
    require_any_permission(current_user, ("cases.read.all", "cases.read.tenant", "cases.read.assigned"))
    require_case_access(current_user, case_id)
    try:
        return get_workflow_snapshot(tenant_id=current_user["tenant_id"], case_id=case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/cases/{case_id}/readiness")
def get_case_readiness(
    case_id: str,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW)),
):
    require_any_permission(current_user, ("cases.read.all", "cases.read.tenant", "cases.read.assigned"))
    require_case_access(current_user, case_id)
    try:
        snapshot = get_workflow_snapshot(tenant_id=current_user["tenant_id"], case_id=case_id)
        readiness = snapshot.get("readiness") if isinstance(snapshot, dict) else None
        if not isinstance(readiness, dict):
            raise ValueError("Readiness data is unavailable")
        return readiness
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/cases/{case_id}/workflow/actions")
def run_case_workflow_action(
    case_id: str,
    payload: WorkflowActionRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    require_permission(current_user, "cases.submit.legal_review")
    require_case_access(current_user, case_id)
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
    except Exception:
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي في الخادم")


@router.get("/cases/legal-escalation")
def get_legal_escalation_cases(
    current_user=Depends(require_roles("tenant_admin", ROLE_LEGAL, ROLE_COMPLIANCE, ROLE_QUALITY)),
):
    return list_escalation_cases(tenant_id=current_user["tenant_id"])


@router.get("/cases/{case_id}/legal-escalation")
def get_legal_escalation_case(
    case_id: str,
    current_user=Depends(require_roles("tenant_admin", ROLE_LEGAL, ROLE_COMPLIANCE, ROLE_QUALITY)),
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
    require_any_permission(current_user, ("cases.read.all", "cases.read.tenant", "cases.read.assigned"))
    require_case_access(current_user, case_id)
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
    require_any_permission(current_user, ("cases.read.all", "cases.read.tenant", "cases.read.assigned"))
    require_case_access(current_user, case_id)
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
    require_permission(current_user, "documents.generate_pdf")
    require_case_access(current_user, case_id)
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
    except Exception:
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي في الخادم")


@router.get("/cases/{case_id}/documents")
def get_case_documents(
    case_id: str,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW)),
):
    require_any_permission(current_user, ("cases.read.all", "cases.read.tenant", "cases.read.assigned"))
    require_case_access(current_user, case_id)
    try:
        return list_case_documents(tenant_id=current_user["tenant_id"], case_id=case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/documents/{document_id}/view", response_class=HTMLResponse)
def view_case_document(
    document_id: str,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW)),
):
    require_permission(current_user, "documents.download.final")
    try:
        document = get_document_record(tenant_id=current_user["tenant_id"], document_id=document_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    path = Path(document.file_path)
    if path.exists() and path.suffix.lower() == ".pdf":
        return FileResponse(path=str(path), filename=document.file_name, media_type="application/pdf")

    return HTMLResponse(content=document.html_content)


@router.get("/documents/{document_id}/download")
def download_case_document(
    document_id: str,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW)),
):
    require_permission(current_user, "documents.download.final")
    try:
        document = get_document_record(tenant_id=current_user["tenant_id"], document_id=document_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    log_privileged_document_download(current_user, document_id)

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

    media_type = "application/pdf" if path.suffix.lower() == ".pdf" else "text/html"
    return FileResponse(path=str(path), filename=document.file_name, media_type=media_type)

@router.get("/audit/{case_id}")
def get_case_audit(case_id: str, current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer"))):
    require_permission(current_user, "audit.read")
    require_case_access(current_user, case_id)
    result = list_audit_logs_for_case(current_user["tenant_id"], case_id)
    if result is None:
        raise HTTPException(status_code=404, detail="الحالة غير موجودة")
    return result

@router.get("/bundles")
def get_bundles(current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW))):
    return list_bundles(current_user["tenant_id"])


@router.post("/cases/{case_id}/legal/decision-event")
def upsert_legal_decision_event(
    case_id: str,
    payload: DecisionEventUpsertRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    try:
        event = _with_legal_service(
            lambda svc: svc.create_or_update_decision_event(
                tenant_id=current_user["tenant_id"],
                case_id=case_id,
                payload=payload.payload,
                actor=_legal_actor(current_user),
            )
        )
        return {"event_id": event.id, "legal_state": event.legal_state, "notification_state": event.notification_state}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal/state-transition")
def transition_legal_decision_state(
    case_id: str,
    payload: LegalStateTransitionRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    try:
        event = _with_legal_service(
            lambda svc: svc.transition_state(
                tenant_id=current_user["tenant_id"],
                case_id=case_id,
                target_state=payload.target_state,
                actor=_legal_actor(current_user),
                reason=payload.reason,
            )
        )
        return {"event_id": event.id, "legal_state": event.legal_state, "state_history": event.state_history}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal/master-document")
def generate_legal_master_document(
    case_id: str,
    payload: MasterDocumentGenerateRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    try:
        document = _with_legal_service(
            lambda svc: svc.generate_master_document(
                tenant_id=current_user["tenant_id"],
                case_id=case_id,
                payload=payload.payload,
                actor=_legal_actor(current_user),
            )
        )
        return {
            "document_id": document.id,
            "status": document.status,
            "verification_code": document.verification_code,
            "document_hash": document.document_hash,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal/notice-presentation")
def record_legal_notice_presentation(
    case_id: str,
    payload: NoticePresentationRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    try:
        presentation = _with_legal_service(
            lambda svc: svc.record_notice_presentation(
                tenant_id=current_user["tenant_id"],
                case_id=case_id,
                payload=payload.payload,
                actor=_legal_actor(current_user),
            )
        )
        return {"presentation_id": presentation.id, "status": presentation.status, "mode": presentation.mode}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal/patient-response")
def record_legal_patient_response(
    case_id: str,
    payload: PatientResponseRecordRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    try:
        response = _with_legal_service(
            lambda svc: svc.record_patient_response(
                tenant_id=current_user["tenant_id"],
                case_id=case_id,
                payload=payload.payload,
                actor=_legal_actor(current_user),
            )
        )
        return {"response_id": response.id, "response_type": response.response_type, "status": response.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal/financial-acknowledgment")
def generate_financial_acknowledgment(
    case_id: str,
    payload: FinancialAcknowledgmentRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    try:
        ack = _with_legal_service(
            lambda svc: svc.create_financial_acknowledgment(
                tenant_id=current_user["tenant_id"],
                case_id=case_id,
                payload=payload.payload,
                actor=_legal_actor(current_user),
            )
        )
        return {"ack_id": ack.id, "status": ack.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal/promissory-note")
def generate_promissory_note(
    case_id: str,
    payload: PromissoryNoteRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    try:
        note = _with_legal_service(
            lambda svc: svc.create_promissory_note(
                tenant_id=current_user["tenant_id"],
                case_id=case_id,
                payload=payload.payload,
                actor=_legal_actor(current_user),
            )
        )
        return {
            "promissory_note_id": note.id,
            "status": note.status,
            "amount_numeric": note.amount_numeric,
            "amount_text_ar": note.amount_text_ar,
            "verification_code": note.verification_code,
            "document_hash": note.document_hash,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal/home-healthcare-agreement")
def generate_home_healthcare_agreement(
    case_id: str,
    payload: HomeHealthcareAgreementRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    try:
        agreement = _with_legal_service(
            lambda svc: svc.create_home_healthcare_agreement(
                tenant_id=current_user["tenant_id"],
                case_id=case_id,
                payload=payload.payload,
                actor=_legal_actor(current_user),
            )
        )
        return {"agreement_id": agreement.id, "status": agreement.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal/equipment-lease")
def generate_equipment_lease(
    case_id: str,
    payload: EquipmentLeaseRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    try:
        lease = _with_legal_service(
            lambda svc: svc.create_equipment_lease(
                tenant_id=current_user["tenant_id"],
                case_id=case_id,
                payload=payload.payload,
                actor=_legal_actor(current_user),
            )
        )
        return {"lease_id": lease.id, "status": lease.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal/undertaking")
def generate_legal_undertaking(
    case_id: str,
    payload: LegalUndertakingRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    try:
        undertaking = _with_legal_service(
            lambda svc: svc.create_legal_undertaking(
                tenant_id=current_user["tenant_id"],
                case_id=case_id,
                payload=payload.payload,
                actor=_legal_actor(current_user),
            )
        )
        return {"undertaking_id": undertaking.id, "status": undertaking.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal/escalation-event")
def create_legal_escalation_event(
    case_id: str,
    payload: EscalationEventCreateRequest,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    try:
        escalation_event = _with_legal_service(
            lambda svc: svc.create_escalation_event(
                tenant_id=current_user["tenant_id"],
                case_id=case_id,
                payload=payload.payload,
                actor=_legal_actor(current_user),
            )
        )
        return {
            "escalation_event_id": escalation_event.id,
            "escalation_level": escalation_event.escalation_level,
            "status": escalation_event.status,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/legal/evidence-package")
def generate_legal_evidence_package(
    case_id: str,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_EDIT)),
):
    try:
        evidence = _with_legal_service(
            lambda svc: svc.build_evidence_package(
                tenant_id=current_user["tenant_id"],
                case_id=case_id,
                actor=_legal_actor(current_user),
            )
        )
        return {
            "evidence_package_id": evidence.id,
            "package_reference": evidence.package_reference,
            "status": evidence.status,
            "generated_at": evidence.generated_at,
            "package_index": evidence.package_index_json,
            "verification": evidence.verification_metadata_json,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/cases/{case_id}/legal/summary")
def get_legal_orchestration_summary(
    case_id: str,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW)),
):
    return _with_legal_service(
        lambda svc: svc.get_case_legal_summary(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
        )
    )


@router.get("/reports/legal-control-dashboard")
def legal_control_dashboard(
    current_user=Depends(require_roles("tenant_admin", ROLE_QUALITY, ROLE_COMPLIANCE, ROLE_LEGAL, "viewer")),
):
    require_permission(current_user, "reports.read")
    return _with_legal_service(
        lambda svc: svc.get_tenant_legal_control_metrics(
            tenant_id=current_user["tenant_id"],
        )
    )


@router.get("/reports/refusal-quality")
def refusal_quality_dashboard(
    current_user=Depends(require_roles("tenant_admin", ROLE_QUALITY, ROLE_COMPLIANCE, ROLE_LEGAL)),
):
    require_permission(current_user, "compliance.review")
    return get_refusal_quality_metrics(current_user["tenant_id"])


@router.get("/reports/compliance-dashboard")
def compliance_dashboard(
    current_user=Depends(require_roles("tenant_admin", ROLE_QUALITY, ROLE_COMPLIANCE, ROLE_LEGAL, "viewer")),
):
    require_permission(current_user, "compliance.review")
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
    require_permission(current_user, "documents.download.final")
    file_path = Path("backend/generated") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="ملف PDF غير موجود")
    return FileResponse(path=str(file_path), filename=filename, media_type="application/pdf")

@router.post("/evidence-bundle/{discharge_case_id}")
def build_evidence_bundle(
    discharge_case_id: str,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", ROLE_COMPLIANCE))
):
    require_permission(current_user, "legal.approve.readiness")
    require_case_access(current_user, discharge_case_id)
    try:
        return generate_evidence_bundle(
            discharge_case_id,
            tenant_id=current_user["tenant_id"],
            actor_user_id=current_user["id"],
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي في الخادم")

@router.get("/evidence-bundle/download/{filename}")
def download_evidence_bundle(
    filename: str,
    current_user=Depends(require_roles(*ROLE_WORKFLOW_VIEW))
):
    require_permission(current_user, "documents.download.final")
    file_path = Path("backend/generated/bundles") / filename
    if not file_path.exists() or not bundle_belongs_to_tenant(file_path, current_user["tenant_id"]):
        raise HTTPException(status_code=404, detail="حزمة الأدلة غير موجودة")
    return FileResponse(path=str(file_path), filename=filename, media_type="application/zip")
