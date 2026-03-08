from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, Field

from backend.api.deps import require_roles
from backend.core.database import SessionLocal
from backend.core.discharge_query_service import get_discharge_case_detail
from backend.core.discharge_workflow_service import (
    get_document_record,
    get_workflow_snapshot,
    run_workflow_action,
)
from backend.models.audit_log import AuditLog
from backend.models.discharge_workflow import DischargeRefusalWorkflow
from backend.models.user import User
from backend.models.workflow_document import DischargeWorkflowDocument

router = APIRouter(prefix="/api", tags=["Discharge Refusal Workflow"])


class WorkflowMutationRequest(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict)


def _iso(value: Optional[datetime]) -> Optional[str]:
    if not value:
        return None
    return value.isoformat()


def _titleize_action(action: str) -> str:
    return action.replace("_", " ").strip().title()


def _normalize_document_type(template_key: str) -> str:
    if template_key == "discharge_refusal_form":
        return "discharge_refusal_form"
    return "financial_responsibility_notice"


def _title_ar_for_template(template_key: str) -> Optional[str]:
    if template_key == "discharge_refusal_form":
        return "نموذج رفض الخروج الطبي"
    if template_key == "financial_responsibility_notice":
        return "خطاب إشعار وإقرار بتحمل التكاليف الناتجة عن رفض الخروج الطبي"
    return None


def _document_code_for_template(template_key: str, current: Optional[str]) -> Optional[str]:
    if current:
        return current
    if template_key == "discharge_refusal_form":
        return "IMC-PAT-DIS-REF-01"
    if template_key == "financial_responsibility_notice":
        return "IMC-PAT-DIS-NOT-01"
    return None


def _load_case_documents(*, tenant_id: str, case_id: str) -> List[Dict[str, Any]]:
    db = SessionLocal()
    try:
        rows = (
            db.query(DischargeWorkflowDocument)
            .join(DischargeRefusalWorkflow, DischargeRefusalWorkflow.id == DischargeWorkflowDocument.workflow_id)
            .filter(
                DischargeWorkflowDocument.tenant_id == tenant_id,
                DischargeWorkflowDocument.case_id == case_id,
            )
            .order_by(DischargeWorkflowDocument.generated_at.desc())
            .all()
        )

        results: List[Dict[str, Any]] = []
        for row in rows:
            template_key = row.template_key
            results.append(
                {
                    "id": row.id,
                    "caseId": row.case_id,
                    "workflowId": row.workflow_id,
                    "documentType": _normalize_document_type(template_key),
                    "documentCode": _document_code_for_template(template_key, row.document_code),
                    "titleEn": row.title,
                    "titleAr": _title_ar_for_template(template_key),
                    "templateKey": template_key,
                    "version": "1.0",
                    "fileName": row.file_name,
                    "mimeType": "text/html",
                    "storagePath": row.file_path,
                    "previewHtml": row.html_content,
                    "payloadJson": {},
                    "status": "generated",
                    "generatedBy": row.generated_by,
                    "generatedAt": _iso(row.generated_at),
                    "signedBy": None,
                    "signedAt": None,
                }
            )

        return results
    finally:
        db.close()


def _load_audit_trail(*, tenant_id: str, case_id: str) -> List[Dict[str, Any]]:
    db = SessionLocal()
    try:
        rows = (
            db.query(AuditLog, User)
            .outerjoin(User, User.id == AuditLog.user_id)
            .filter(
                AuditLog.tenant_id == tenant_id,
                AuditLog.entity_type == "discharge_case",
                AuditLog.entity_id == case_id,
            )
            .order_by(AuditLog.created_at.desc())
            .all()
        )

        results: List[Dict[str, Any]] = []
        for log, user in rows:
            action_name = (log.action or "").strip() or "unknown_action"
            actor_name = user.full_name if user and user.full_name else (user.email if user else "System")
            actor_role = user.role if user else None

            results.append(
                {
                    "id": log.id,
                    "caseId": case_id,
                    "workflowId": None,
                    "actionName": action_name,
                    "actionLabel": _titleize_action(action_name),
                    "actionStatus": "success",
                    "actorName": actor_name,
                    "actorId": log.user_id,
                    "actorRole": actor_role,
                    "notes": log.details,
                    "documentType": None,
                    "metadataJson": None,
                    "createdAt": _iso(log.created_at),
                }
            )

        return results
    finally:
        db.close()


def _map_status(snapshot: Dict[str, Any]) -> str:
    status = (snapshot.get("status") or "").strip().lower()
    if status == "escalated":
        return "escalated"
    if snapshot.get("escalation_required"):
        return "escalation_required"
    if snapshot.get("financial_notice_generated_at"):
        return "pending_notification"
    if status in {"active", "refusal_active"}:
        return "active"
    if status == "closed":
        return "closed"
    return "draft"


def _to_workflow_contract(
    *,
    case_id: str,
    snapshot: Dict[str, Any],
    documents: List[Dict[str, Any]],
    audit_trail: List[Dict[str, Any]],
    created_by: str,
    updated_by: Optional[str],
    created_at: Optional[str],
    updated_at: Optional[str],
) -> Dict[str, Any]:
    refusal_started_at = snapshot.get("refusal_started_at")
    escalated_at = snapshot.get("escalated_at")
    closed_at = snapshot.get("closed_at")
    refusal_persists = bool(refusal_started_at) and not escalated_at and not closed_at

    escalation_due_at = snapshot.get("escalation_due_at")
    escalation_required = bool(snapshot.get("escalation_required")) and refusal_persists

    return {
        "id": snapshot.get("id"),
        "caseId": case_id,
        "workflowType": "discharge_refusal",
        "status": _map_status(snapshot),
        "currentStage": snapshot.get("current_stage") or "medical_discharge_decision",
        "patientName": snapshot.get("patient_name") or "",
        "legalRepresentativeName": None,
        "patientIdNumber": snapshot.get("patient_id_number") or "",
        "patientIdType": None,
        "medicalRecordNumber": snapshot.get("medical_record_number") or "",
        "roomNumber": snapshot.get("room_number") or "",
        "attendingPhysicianName": snapshot.get("attending_physician") or "",
        "attendingPhysicianId": None,
        "caseManagerName": None,
        "dischargeDecisionAt": snapshot.get("discharge_decision_at"),
        "refusalStartedAt": refusal_started_at,
        "initialCommunicationAt": snapshot.get("initial_communication_at"),
        "supportInterventionAt": snapshot.get("support_and_intervention_at"),
        "socialServicesReferredAt": snapshot.get("social_services_referred_at"),
        "refusalFormGeneratedAt": snapshot.get("refusal_form_generated_at"),
        "financialNoticeGeneratedAt": snapshot.get("financial_notice_generated_at"),
        "escalationDueAt": escalation_due_at,
        "escalatedAt": escalated_at,
        "closedAt": closed_at,
        "dischargeDecisionSummary": snapshot.get("discussion_summary"),
        "discussionSummary": snapshot.get("discussion_summary"),
        "refusalReason": snapshot.get("refusal_reason"),
        "supportProvided": snapshot.get("social_administrative_interventions"),
        "insuranceCoverageStatus": (snapshot.get("insurance_coverage_status") or "unknown").lower(),
        "guarantorName": None,
        "refusalPersists": refusal_persists,
        "escalationRequired": escalation_required,
        "escalatedToLegal": bool(escalated_at),
        "escalatedToCompliance": bool(escalated_at),
        "patientAcknowledged": False,
        "patientSignedAt": None,
        "witness1Name": None,
        "witness1Title": None,
        "witness1SignedAt": None,
        "witness2Name": None,
        "witness2Title": None,
        "witness2SignedAt": None,
        "patientAffairsContacted": bool(snapshot.get("initial_communication_at") or snapshot.get("support_and_intervention_at")),
        "socialServicesContacted": bool(snapshot.get("social_services_referred_at")),
        "legalSensitiveCase": False,
        "documents": documents,
        "auditTrail": audit_trail,
        "createdBy": created_by,
        "updatedBy": updated_by,
        "createdAt": created_at or snapshot.get("discharge_decision_at") or _iso(datetime.utcnow()),
        "updatedAt": updated_at or _iso(datetime.utcnow()),
    }


def _workflow_metadata(*, tenant_id: str, case_id: str) -> Dict[str, Optional[str]]:
    db = SessionLocal()
    try:
        workflow = (
            db.query(DischargeRefusalWorkflow)
            .filter(
                DischargeRefusalWorkflow.tenant_id == tenant_id,
                DischargeRefusalWorkflow.case_id == case_id,
            )
            .first()
        )
        if not workflow:
            return {
                "createdAt": None,
                "updatedAt": None,
            }

        return {
            "createdAt": _iso(workflow.created_at),
            "updatedAt": _iso(workflow.updated_at),
        }
    finally:
        db.close()


def _build_contract_workflow(*, tenant_id: str, case_id: str) -> Dict[str, Any]:
    snapshot = get_workflow_snapshot(tenant_id=tenant_id, case_id=case_id)
    case_detail = get_discharge_case_detail(tenant_id=tenant_id, case_id=case_id)
    if not case_detail:
        raise ValueError("Case not found")

    documents = _load_case_documents(tenant_id=tenant_id, case_id=case_id)
    audit_trail = _load_audit_trail(tenant_id=tenant_id, case_id=case_id)
    workflow_meta = _workflow_metadata(tenant_id=tenant_id, case_id=case_id)

    return _to_workflow_contract(
        case_id=case_id,
        snapshot=snapshot,
        documents=documents,
        audit_trail=audit_trail,
        created_by=case_detail.get("created_by") or "",
        updated_by=None,
        created_at=workflow_meta.get("createdAt"),
        updated_at=workflow_meta.get("updatedAt"),
    )


def _run_action_and_build(
    *,
    tenant_id: str,
    case_id: str,
    action: str,
    payload: Dict[str, Any],
    current_user: Dict[str, Any],
) -> Dict[str, Any]:
    action_result = run_workflow_action(
        tenant_id=tenant_id,
        case_id=case_id,
        action=action,
        payload=payload,
        current_user=current_user,
    )

    workflow = _build_contract_workflow(tenant_id=tenant_id, case_id=case_id)

    generated_document_id = None
    generated_document = action_result.get("generated_document") if isinstance(action_result, dict) else None
    if isinstance(generated_document, dict):
        generated_document_id = generated_document.get("id")

    generated_document_payload = None
    if generated_document_id:
        matching = [item for item in workflow.get("documents", []) if item.get("id") == generated_document_id]
        generated_document_payload = matching[0] if matching else None

    return {
        "workflow": workflow,
        "generatedDocument": generated_document_payload,
    }


@router.get("/cases/{case_id}/discharge-refusal-workflow")
def get_discharge_refusal_workflow(
    case_id: str,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer")),
):
    try:
        return _build_contract_workflow(tenant_id=current_user["tenant_id"], case_id=case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/cases/{case_id}/discharge-refusal-workflow/start")
def start_discharge_refusal_workflow(
    case_id: str,
    request: WorkflowMutationRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    try:
        return _run_action_and_build(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            action="start_refusal_workflow",
            payload=request.payload,
            current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/discharge-refusal-workflow/record-discharge-decision")
def record_discharge_decision(
    case_id: str,
    request: WorkflowMutationRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    try:
        return _run_action_and_build(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            action="record_discharge_decision",
            payload=request.payload,
            current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/discharge-refusal-workflow/mark-refusal")
def mark_refusal(
    case_id: str,
    request: WorkflowMutationRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    try:
        return _run_action_and_build(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            action="start_refusal_workflow",
            payload=request.payload,
            current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/discharge-refusal-workflow/record-initial-communication")
def record_initial_communication(
    case_id: str,
    request: WorkflowMutationRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    try:
        return _run_action_and_build(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            action="mark_patient_counseled",
            payload=request.payload,
            current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/discharge-refusal-workflow/refer-social-services")
def refer_social_services(
    case_id: str,
    request: WorkflowMutationRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    try:
        return _run_action_and_build(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            action="refer_social_services",
            payload=request.payload,
            current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/discharge-refusal-workflow/generate-refusal-form")
def generate_refusal_form(
    case_id: str,
    request: WorkflowMutationRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    try:
        return _run_action_and_build(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            action="generate_refusal_form",
            payload=request.payload,
            current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/discharge-refusal-workflow/generate-financial-notice")
def generate_financial_notice(
    case_id: str,
    request: WorkflowMutationRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    try:
        return _run_action_and_build(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            action="generate_financial_notice",
            payload=request.payload,
            current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/discharge-refusal-workflow/escalate")
def escalate_discharge_refusal_case(
    case_id: str,
    request: WorkflowMutationRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    try:
        return _run_action_and_build(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            action="escalate_legal_compliance",
            payload=request.payload,
            current_user=current_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/cases/{case_id}/documents")
def get_case_documents_v2(
    case_id: str,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer")),
):
    try:
        # Verifies the case exists in the same tenant scope.
        get_workflow_snapshot(tenant_id=current_user["tenant_id"], case_id=case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return _load_case_documents(tenant_id=current_user["tenant_id"], case_id=case_id)


@router.get("/documents/{document_id}/preview", response_class=HTMLResponse)
def preview_document_v2(
    document_id: str,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor", "viewer")),
):
    try:
        document = get_document_record(tenant_id=current_user["tenant_id"], document_id=document_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return HTMLResponse(content=document.html_content)


@router.get("/documents/{document_id}/download")
def download_document_v2(
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


@router.post("/cases/{case_id}/discharge-refusal-workflow/close")
def close_workflow_todo(
    case_id: str,
    request: WorkflowMutationRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    # Safe abstraction placeholder to avoid breaking clients before close-state server logic is finalized.
    return {
        "success": False,
        "message": "Close workflow endpoint is not yet connected.",
        "todo": "Wire close-state transition in backend workflow service.",
        "caseId": case_id,
    }
