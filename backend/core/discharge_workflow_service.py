from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
import json
from pathlib import Path
import textwrap
from typing import Any, Dict, List, Optional, Tuple

from backend.core.database import SessionLocal
from backend.forms.medical_legal_forms_library import get_form_template_metadata
from backend.forms.workflow_templates import WORKFLOW_TEMPLATES
from backend.models.audit_log import AuditLog
from backend.models.discharge_case import DischargeCase
from backend.models.discharge_workflow import DischargeRefusalWorkflow
from backend.models.patient import Patient
from backend.models.user import User
from backend.models.workflow_document import DischargeWorkflowDocument
from backend.models.workflow_case_documentation import DischargeWorkflowCaseDocumentation


WORKFLOW_STAGES = [
    "medical_discharge_decision",
    "initial_communication",
    "support_and_intervention",
    "refusal_form",
    "official_notification",
    "escalation",
    "closed",
]

STAGE_LABELS = {
    "medical_discharge_decision": "Medical Discharge Decision",
    "initial_communication": "Initial Communication",
    "support_and_intervention": "Support and Intervention",
    "refusal_form": "Refusal Form",
    "official_notification": "Official Notification",
    "escalation": "Escalation",
    "closed": "Closed",
}

POLICY_CASE_STATUSES = {
    "draft": "Draft",
    "decision_issued": "Discharge Decision Issued",
    "accepted": "Patient Accepted Discharge",
    "refusal_reported": "Refusal Reported",
    "initial_communication_done": "Initial Communication Completed",
    "social_intervention_ongoing": "Social Services Intervention Ongoing",
    "form_pending_signature": "Refusal Form Pending Signature",
    "form_signed": "Refusal Form Signed",
    "witnessed_refusal_recorded": "Witnessed Refusal Recorded",
    "financial_notice_issued": "Financial Liability Notice Issued",
    "escalated_compliance": "Escalated to Compliance",
    "escalated_legal": "Escalated to Legal",
    "under_review": "Under Review",
    "signed_or_verified": "Signed or Verified",
    "archived": "Archived",
    "closed_discharged": "Closed - Patient Discharged",
    "closed_admin_legal": "Closed - Administrative / Legal Action",
}

CANONICAL_CASE_LIFECYCLE = [
    "CASE_CREATED",
    "DISCHARGE_DECISION_RECORDED",
    "REFUSAL_WORKFLOW_STARTED",
    "COUNSELING_COMPLETED",
    "SOCIAL_SERVICE_REFERRED",
    "REFUSAL_FORM_GENERATED",
    "FINANCIAL_NOTICE_GENERATED",
    "SIGNED_OR_VERIFIED",
    "LEGAL_ESCALATED",
    "ARCHIVED",
]

WORKFLOW_FIELD_NAMES = {
    "patient_name",
    "patient_id_number",
    "medical_record_number",
    "room_number",
    "attending_physician",
    "refusal_reason",
    "discussion_summary",
    "insurance_coverage_status",
    "responsible_department",
    "responsible_person",
    "next_action",
    "patient_id",
    "mrn",
    "nursing_notes",
    "patient_affairs_notes",
    "social_services_notes",
    "quality_notes",
    "compliance_notes",
    "legal_notes",
    "financial_notice_issued",
    "financial_notice_acknowledged",
    "refusal_form_signed",
    "patient_signature",
    "representative_signature",
    "witness_mode",
    "witness1_name",
    "witness1_role",
    "witness1_signature",
    "witness2_name",
    "witness2_role",
    "witness2_signature",
}

CASE_DOCUMENTATION_FIELD_NAMES = {
    "social_administrative_interventions",
}

POLICY_REQUIRED_CASE_DOCUMENTATION = [
    ("discharge_decision_at", "Date/time of discharge decision"),
    ("discussion_summary", "Summary of discussions with patient/family"),
    ("refusal_reason", "Reasons for refusal"),
    ("forms_issued", "Forms issued"),
    ("social_administrative_interventions", "Social / administrative interventions"),
]

GENERATED_DOCS_DIR = Path("backend/generated/case_documents")
GENERATED_DOCS_DIR.mkdir(parents=True, exist_ok=True)
SIGNATURE_METADATA_DIR = Path("backend/generated/document_signature")
SIGNATURE_METADATA_DIR.mkdir(parents=True, exist_ok=True)
OTP_METADATA_DIR = Path("backend/generated/document_otp")
OTP_METADATA_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class CaseBundle:
    discharge_case: DischargeCase
    patient: Patient
    workflow: DischargeRefusalWorkflow
    case_documentation: DischargeWorkflowCaseDocumentation


def _utc_now() -> datetime:
    return datetime.utcnow()


def _parse_datetime(raw: Optional[str]) -> Optional[datetime]:
    if not raw:
        return None

    try:
        normalized = raw.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized).replace(tzinfo=None)
    except Exception:
        return None


def _iso(value: Optional[datetime]) -> Optional[str]:
    if not value:
        return None
    return value.isoformat()


def _log_audit(
    db,
    *,
    tenant_id: str,
    user_id: str,
    case_id: str,
    action: str,
    details: str,
) -> None:
    log = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        entity_type="discharge_case",
        entity_id=case_id,
        action=action,
        details=details,
        created_at=_utc_now(),
    )
    db.add(log)


def _log_generation_failure_audit(
    *,
    tenant_id: str,
    user_id: str,
    case_id: str,
    action: str,
    reason: str,
) -> None:
    db = SessionLocal()
    try:
        _log_audit(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            case_id=case_id,
            action=f"{action}_failed",
            details=(
                "Document generation failed. "
                "Please verify required data and retry. "
                f"Reason: {reason}"
            ),
        )
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def _normalize_text(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        trimmed = value.strip()
        return trimmed or None
    return str(value)


def _signature_metadata_path(document_id: str) -> Path:
    return SIGNATURE_METADATA_DIR / f"{document_id}.json"


def _otp_metadata_path(document_id: str) -> Path:
    return OTP_METADATA_DIR / f"{document_id}.json"


def _load_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _load_signature_metadata(document_id: str) -> Dict[str, Any]:
    return _load_json(_signature_metadata_path(document_id))


def _load_otp_metadata(document_id: str) -> Dict[str, Any]:
    return _load_json(_otp_metadata_path(document_id))


def _canonical_case_lifecycle_status(bundle: CaseBundle) -> str:
    current = (bundle.discharge_case.status or "").strip().upper()
    if current in CANONICAL_CASE_LIFECYCLE:
        return current

    workflow = bundle.workflow
    documents = workflow.documents or []

    if workflow.closed_at:
        return "ARCHIVED"
    if workflow.escalated_at:
        return "LEGAL_ESCALATED"

    for document in documents:
        signature_meta = _load_signature_metadata(document.id)
        otp_meta = _load_otp_metadata(document.id)
        if signature_meta.get("archivedStatus"):
            return "ARCHIVED"
        if document.signed_at or signature_meta.get("otpVerified") or otp_meta.get("verified"):
            return "SIGNED_OR_VERIFIED"

    if workflow.financial_notice_generated_at:
        return "FINANCIAL_NOTICE_GENERATED"
    if workflow.refusal_form_generated_at:
        return "REFUSAL_FORM_GENERATED"
    if workflow.social_services_referred_at or workflow.support_and_intervention_at:
        return "SOCIAL_SERVICE_REFERRED"
    if workflow.initial_communication_at:
        return "COUNSELING_COMPLETED"
    if workflow.refusal_started_at:
        return "REFUSAL_WORKFLOW_STARTED"
    if workflow.discharge_decision_at:
        return "DISCHARGE_DECISION_RECORDED"
    return "CASE_CREATED"


def _set_case_lifecycle_status(bundle: CaseBundle, lifecycle_status: str) -> None:
    bundle.discharge_case.status = lifecycle_status


def _apply_payload_to_workflow(workflow: DischargeRefusalWorkflow, payload: Dict[str, Any]) -> None:
    for key in WORKFLOW_FIELD_NAMES:
        if key in payload:
            if key in {
                "financial_notice_issued",
                "financial_notice_acknowledged",
                "refusal_form_signed",
                "witness_mode",
            }:
                value = bool(payload.get(key))
            else:
                value = _normalize_text(payload.get(key))
            setattr(workflow, key, value)


def _apply_payload_to_case_documentation(
    case_documentation: DischargeWorkflowCaseDocumentation,
    payload: Dict[str, Any],
) -> None:
    for key in CASE_DOCUMENTATION_FIELD_NAMES:
        if key in payload:
            value = _normalize_text(payload.get(key))
            setattr(case_documentation, key, value)

    if "discussion_summary" in payload:
        case_documentation.discussion_summary = _normalize_text(payload.get("discussion_summary"))

    if "refusal_reason" in payload:
        case_documentation.refusal_reasons = _normalize_text(payload.get("refusal_reason"))

    if "discharge_decision_at" in payload:
        parsed = _parse_datetime(payload.get("discharge_decision_at"))
        if parsed:
            case_documentation.decision_recorded_at = parsed


def _build_forms_issued_text(workflow: DischargeRefusalWorkflow) -> str:
    titles: List[str] = []
    for item in workflow.documents:
        title = (item.title or "").strip()
        if not title or title in titles:
            continue
        titles.append(title)
    return "; ".join(titles)


def _upsert_workflow(
    db,
    *,
    discharge_case: DischargeCase,
    patient: Patient,
    payload: Optional[Dict[str, Any]] = None,
) -> DischargeRefusalWorkflow:
    workflow = (
        db.query(DischargeRefusalWorkflow)
        .filter(DischargeRefusalWorkflow.case_id == discharge_case.id)
        .first()
    )

    if not workflow:
        workflow = DischargeRefusalWorkflow(
            case_id=discharge_case.id,
            tenant_id=discharge_case.tenant_id,
            patient_name=patient.full_name,
            medical_record_number=patient.mrn,
            refusal_reason=discharge_case.refusal_reason,
            current_stage="medical_discharge_decision",
            status="draft",
            case_status=POLICY_CASE_STATUSES["draft"],
            responsible_department="Attending Physician",
            next_action="Record discharge decision details.",
        )
        db.add(workflow)
        db.flush()

    normalized_case_status = (discharge_case.status or "").strip().upper()
    if normalized_case_status not in CANONICAL_CASE_LIFECYCLE:
        discharge_case.status = "CASE_CREATED"

    if payload:
        _apply_payload_to_workflow(workflow, payload)

    workflow.updated_at = _utc_now()
    db.flush()
    return workflow


def _upsert_case_documentation(
    db,
    *,
    workflow: DischargeRefusalWorkflow,
    discharge_case: DischargeCase,
) -> DischargeWorkflowCaseDocumentation:
    case_documentation = (
        db.query(DischargeWorkflowCaseDocumentation)
        .filter(DischargeWorkflowCaseDocumentation.workflow_id == workflow.id)
        .first()
    )

    if not case_documentation:
        case_documentation = DischargeWorkflowCaseDocumentation(
            workflow_id=workflow.id,
            case_id=discharge_case.id,
            tenant_id=discharge_case.tenant_id,
            decision_recorded_at=workflow.discharge_decision_at,
            discussion_summary=workflow.discussion_summary,
            refusal_reasons=workflow.refusal_reason or discharge_case.refusal_reason,
            forms_issued=_build_forms_issued_text(workflow) or None,
        )
        db.add(case_documentation)
        db.flush()

    return case_documentation


def _sync_case_documentation(bundle: CaseBundle) -> None:
    workflow = bundle.workflow
    case_documentation = bundle.case_documentation

    if workflow.discharge_decision_at:
        case_documentation.decision_recorded_at = workflow.discharge_decision_at

    if workflow.discussion_summary:
        case_documentation.discussion_summary = workflow.discussion_summary

    if workflow.refusal_reason:
        case_documentation.refusal_reasons = workflow.refusal_reason

    forms_issued = _build_forms_issued_text(workflow)
    case_documentation.forms_issued = forms_issued or None

    case_documentation.updated_at = _utc_now()


def _get_case_bundle(db, *, tenant_id: str, case_id: str) -> CaseBundle:
    row = (
        db.query(DischargeCase, Patient)
        .join(Patient, Patient.id == DischargeCase.patient_id)
        .filter(DischargeCase.tenant_id == tenant_id, DischargeCase.id == case_id)
        .first()
    )

    if not row:
        raise ValueError("Case not found")

    discharge_case, patient = row
    workflow = _upsert_workflow(db, discharge_case=discharge_case, patient=patient)
    case_documentation = _upsert_case_documentation(
        db,
        workflow=workflow,
        discharge_case=discharge_case,
    )
    return CaseBundle(
        discharge_case=discharge_case,
        patient=patient,
        workflow=workflow,
        case_documentation=case_documentation,
    )


def _is_escalation_required(workflow: DischargeRefusalWorkflow) -> bool:
    if workflow.escalated_at:
        return False

    # Escalation applies only after a refusal workflow has actually started.
    if not workflow.refusal_started_at:
        return False

    if workflow.status not in {"active", "refusal_active"}:
        return False

    if not workflow.discharge_decision_at:
        return False

    due_at = workflow.escalation_due_at or (workflow.discharge_decision_at + timedelta(hours=24))
    return _utc_now() >= due_at


def _stage_timestamps(workflow: DischargeRefusalWorkflow) -> Dict[str, Optional[datetime]]:
    return {
        "medical_discharge_decision": workflow.discharge_decision_at,
        "initial_communication": workflow.initial_communication_at or workflow.refusal_started_at,
        "support_and_intervention": workflow.support_and_intervention_at or workflow.social_services_referred_at,
        "refusal_form": workflow.refusal_form_generated_at,
        "official_notification": workflow.financial_notice_generated_at,
        "escalation": workflow.escalated_at,
    }


def _serialize_document(document: DischargeWorkflowDocument) -> Dict[str, Any]:
    preview_route = f"/api/discharge/documents/{document.id}/view"
    view_route = preview_route
    download_route = f"/api/discharge/documents/{document.id}/download"
    signature_meta = _load_signature_metadata(document.id)
    otp_meta = _load_otp_metadata(document.id)
    template_meta = get_form_template_metadata(document.template_key)
    archived_status = bool(signature_meta.get("archivedStatus", False))
    signed_status = bool(document.signed_at)
    verified_status = bool(signature_meta.get("otpVerified") or otp_meta.get("verified"))

    generation_status = "generated"
    if archived_status:
        generation_status = "archived"
    elif signed_status:
        generation_status = "signed"
    elif verified_status:
        generation_status = "verified"

    return {
        "document_id": document.id,
        "id": document.id,
        "case_id": document.case_id,
        "caseId": document.case_id,
        "form_type": document.template_key,
        "formType": document.template_key,
        "template_key": document.template_key,
        "templateKey": document.template_key,
        "document_code": document.document_code,
        "documentCode": document.document_code,
        "title": document.title,
        "file_name": document.file_name,
        "fileName": document.file_name,
        "view_route": view_route,
        "viewRoute": view_route,
        "generation_status": generation_status,
        "generationStatus": generation_status,
        "status": generation_status,
        "documentStatus": generation_status,
        "locale": document.locale,
        "templateVersion": document.template_version,
        "template_version": document.template_version,
        "locked_template": document.locked_template,
        "templateMarker": str(template_meta["template_marker"]),
        "templateSource": str(template_meta["source"]),
        "canonicalTemplateKey": str(template_meta["key"]),
        "preview_route": preview_route,
        "previewRoute": preview_route,
        "download_route": download_route,
        "downloadRoute": download_route,
        "attachment_group": document.attachment_group,
        "signed_at": _iso(document.signed_at),
        "signedStatus": signed_status,
        "verifiedStatus": verified_status,
        "signed_by": document.signed_by,
        "archivedStatus": archived_status,
        "archivedAt": signature_meta.get("archivedAt"),
        "archivedBy": signature_meta.get("archivedBy"),
        "filePath": document.file_path,
        "generated_at": _iso(document.generated_at),
        "createdAt": _iso(document.generated_at),
        "createdBy": document.generated_by,
        "view_url": preview_route,
        "download_url": download_route,
        "signatureMetadata": signature_meta,
        "otpMetadata": otp_meta,
    }


def serialize_document_record(document: DischargeWorkflowDocument) -> Dict[str, Any]:
    return _serialize_document(document)


def _documentation_values(bundle: CaseBundle, context: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    context = context or {}
    workflow = bundle.workflow
    case_documentation = bundle.case_documentation

    forms_issued_from_docs = _build_forms_issued_text(workflow)

    return {
        "discharge_decision_at": str(
            context.get("discharge_decision_at")
            or _iso(case_documentation.decision_recorded_at or workflow.discharge_decision_at)
            or ""
        ),
        "discussion_summary": str(
            context.get("discussion_summary")
            or case_documentation.discussion_summary
            or workflow.discussion_summary
            or ""
        ),
        "refusal_reason": str(
            context.get("refusal_reason")
            or case_documentation.refusal_reasons
            or workflow.refusal_reason
            or bundle.discharge_case.refusal_reason
            or ""
        ),
        "forms_issued": str(context.get("forms_issued") or forms_issued_from_docs or case_documentation.forms_issued or ""),
        "social_administrative_interventions": str(
            context.get("social_administrative_interventions")
            or case_documentation.social_administrative_interventions
            or ""
        ),
    }


def _required_field_missing(context: Dict[str, str], field_name: str) -> bool:
    if field_name == "refusal_reason_or_summary":
        refusal_reason = (context.get("refusal_reason") or "").strip()
        discussion_summary = (context.get("discussion_summary") or "").strip()
        return not refusal_reason and not discussion_summary

    value = (context.get(field_name) or "").strip()
    return not value


def _validate_required_fields(context: Dict[str, str], required_fields: List[str]) -> List[str]:
    missing: List[str] = []
    for field_name in required_fields:
        if _required_field_missing(context, field_name):
            missing.append(field_name)
    return missing


def _build_policy_validation(
    bundle: CaseBundle,
    *,
    required_fields: Optional[List[str]] = None,
    context: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    validation_context = _documentation_values(bundle, context)
    required = required_fields or [key for key, _ in POLICY_REQUIRED_CASE_DOCUMENTATION]

    requirements: List[Dict[str, Any]] = []
    missing_fields: List[str] = []

    for key, label in POLICY_REQUIRED_CASE_DOCUMENTATION:
        value_present = not _required_field_missing(validation_context, key)
        required_for_action = key in required
        if required_for_action and not value_present:
            missing_fields.append(key)

        requirements.append(
            {
                "key": key,
                "label": label,
                "value_present": value_present,
                "required_for_current_action": required_for_action,
            }
        )

    return {
        "required_fields": required,
        "missing_fields": missing_fields,
        "can_generate": len(missing_fields) == 0,
        "requirements": requirements,
        "validated_at": _iso(_utc_now()),
    }


def _serialize_workflow(bundle: CaseBundle) -> Dict[str, Any]:
    workflow = bundle.workflow
    case_documentation = bundle.case_documentation
    stage_times = _stage_timestamps(workflow)
    current_stage = workflow.current_stage or "medical_discharge_decision"
    escalation_required = _is_escalation_required(workflow)

    timeline = []
    for stage in WORKFLOW_STAGES:
        timestamp = stage_times.get(stage)
        status = "upcoming"
        if timestamp:
            status = "completed"
        elif stage == current_stage:
            status = "current"

        timeline.append(
            {
                "key": stage,
                "label": STAGE_LABELS[stage],
                "timestamp": _iso(timestamp),
                "status": status,
            }
        )

    if escalation_required and current_stage != "escalation":
        current_stage = "official_notification" if workflow.financial_notice_generated_at else current_stage

    documents = [_serialize_document(item) for item in workflow.documents]
    policy_validation = _build_policy_validation(bundle)
    lifecycle_status = _canonical_case_lifecycle_status(bundle)

    return {
        "id": workflow.id,
        "case_id": workflow.case_id,
        "workflow_type": workflow.workflow_type,
        "status": workflow.status,
        "lifecycle_status": lifecycle_status,
        "current_stage": current_stage,
        "current_stage_label": STAGE_LABELS.get(current_stage, current_stage),
        "escalation_required": escalation_required,
        "discharge_decision_at": _iso(workflow.discharge_decision_at),
        "refusal_started_at": _iso(workflow.refusal_started_at),
        "initial_communication_at": _iso(workflow.initial_communication_at),
        "support_and_intervention_at": _iso(workflow.support_and_intervention_at),
        "social_services_referred_at": _iso(workflow.social_services_referred_at),
        "refusal_form_generated_at": _iso(workflow.refusal_form_generated_at),
        "financial_notice_generated_at": _iso(workflow.financial_notice_generated_at),
        "escalation_due_at": _iso(workflow.escalation_due_at),
        "escalated_at": _iso(workflow.escalated_at),
        "closed_at": _iso(workflow.closed_at),
        "case_status": workflow.case_status,
        "case_record_status": bundle.discharge_case.status,
        "patient_name": workflow.patient_name,
        "patient_id": workflow.patient_id,
        "mrn": workflow.mrn,
        "patient_id_number": workflow.patient_id_number,
        "medical_record_number": workflow.medical_record_number,
        "room_number": workflow.room_number,
        "attending_physician": workflow.attending_physician,
        "refusal_reason": workflow.refusal_reason,
        "discussion_summary": workflow.discussion_summary,
        "nursing_notes": workflow.nursing_notes,
        "patient_affairs_notes": workflow.patient_affairs_notes,
        "social_services_notes": workflow.social_services_notes,
        "quality_notes": workflow.quality_notes,
        "compliance_notes": workflow.compliance_notes,
        "legal_notes": workflow.legal_notes,
        "financial_notice_issued": workflow.financial_notice_issued,
        "financial_notice_acknowledged": workflow.financial_notice_acknowledged,
        "refusal_form_signed": workflow.refusal_form_signed,
        "patient_signature": workflow.patient_signature,
        "representative_signature": workflow.representative_signature,
        "witness_mode": workflow.witness_mode,
        "witness1_name": workflow.witness1_name,
        "witness1_role": workflow.witness1_role,
        "witness1_signature": workflow.witness1_signature,
        "witness2_name": workflow.witness2_name,
        "witness2_role": workflow.witness2_role,
        "witness2_signature": workflow.witness2_signature,
        "social_administrative_interventions": case_documentation.social_administrative_interventions,
        "forms_issued": case_documentation.forms_issued,
        "insurance_coverage_status": workflow.insurance_coverage_status,
        "responsible_department": workflow.responsible_department,
        "responsible_person": workflow.responsible_person,
        "next_action": workflow.next_action,
        "policy_validation": policy_validation,
        "timeline": timeline,
        "documents": documents,
    }


def _build_template_context(
    bundle: CaseBundle,
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, str]:
    payload = payload or {}
    workflow = bundle.workflow
    patient = bundle.patient
    case = bundle.discharge_case
    case_documentation = bundle.case_documentation

    discharge_decision_from_payload = _parse_datetime(payload.get("discharge_decision_at"))
    forms_issued = _build_forms_issued_text(workflow)

    context = {
        "case_id": case.id,
        "patient_name": str(payload.get("patient_name") or workflow.patient_name or patient.full_name or ""),
        "patient_name_or_guardian": str(payload.get("patient_name_or_guardian") or payload.get("patient_name") or workflow.patient_name or patient.full_name or ""),
        "patient_id_number": str(payload.get("patient_id_number") or workflow.patient_id_number or ""),
        "medical_record_number": str(
            payload.get("medical_record_number")
            or workflow.medical_record_number
            or patient.mrn
            or ""
        ),
        "room_number": str(payload.get("room_number") or workflow.room_number or ""),
        "department": str(payload.get("department") or payload.get("ward") or ""),
        "attending_physician": str(payload.get("attending_physician") or workflow.attending_physician or ""),
        "nurse_name": str(payload.get("nurse_name") or ""),
        "witness_1_name": str(payload.get("witness_1_name") or workflow.witness1_name or ""),
        "witness_2_name": str(payload.get("witness_2_name") or workflow.witness2_name or ""),
        "witness1_role": str(payload.get("witness1_role") or workflow.witness1_role or ""),
        "witness2_role": str(payload.get("witness2_role") or workflow.witness2_role or ""),
        "witness1_signature": str(payload.get("witness1_signature") or workflow.witness1_signature or ""),
        "witness2_signature": str(payload.get("witness2_signature") or workflow.witness2_signature or ""),
        "relationship": str(payload.get("relationship") or ""),
        "time": str(payload.get("time") or _utc_now().strftime("%H:%M")),
        "representative_name": str(payload.get("representative_name") or workflow.responsible_person or ""),
        "patient_signature": str(payload.get("patient_signature") or workflow.patient_signature or ""),
        "representative_signature": str(payload.get("representative_signature") or workflow.representative_signature or ""),
        "attending_physician_signature": str(payload.get("attending_physician_signature") or ""),
        "nurse_signature": str(payload.get("nurse_signature") or ""),
        "staff_name": str(payload.get("staff_name") or workflow.responsible_person or ""),
        "support_provided": str(payload.get("support_provided") or case_documentation.social_administrative_interventions or ""),
        "official_stamp": str(payload.get("official_stamp") or ""),
        "refusal_reason": str(payload.get("refusal_reason") or workflow.refusal_reason or case.refusal_reason or ""),
        "discussion_summary": str(payload.get("discussion_summary") or workflow.discussion_summary or ""),
        "insurance_coverage_status": str(
            payload.get("insurance_coverage_status") or workflow.insurance_coverage_status or ""
        ),
        "social_administrative_interventions": str(
            payload.get("social_administrative_interventions")
            or case_documentation.social_administrative_interventions
            or ""
        ),
        "forms_issued": str(forms_issued or case_documentation.forms_issued or ""),
        "discharge_decision_at": _iso(discharge_decision_from_payload or workflow.discharge_decision_at),
        "financial_notice_generated_at": _iso(workflow.financial_notice_generated_at),
        "generated_at": _iso(_utc_now()),
        "reference_number": f"IMC-REF-{case.id[:8]}-{_utc_now().strftime('%Y%m%d%H%M')}",
    }

    return context


def _write_document_file(case_id: str, template_key: str, html_content: str) -> Tuple[str, str]:
    case_dir = GENERATED_DOCS_DIR / case_id
    case_dir.mkdir(parents=True, exist_ok=True)

    timestamp = _utc_now().strftime("%Y%m%d%H%M%S")
    file_name = f"{template_key}_{timestamp}.html"
    file_path = case_dir / file_name
    file_path.write_text(html_content, encoding="utf-8")
    return file_name, str(file_path)


def _write_document_pdf(case_id: str, template_key: str, html_content: str) -> Optional[Tuple[str, str]]:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
    except Exception:
        return None

    case_dir = GENERATED_DOCS_DIR / case_id
    case_dir.mkdir(parents=True, exist_ok=True)

    timestamp = _utc_now().strftime("%Y%m%d%H%M%S")
    file_name = f"{template_key}_{timestamp}.pdf"
    file_path = case_dir / file_name

    text_only = " ".join(part.strip() for part in html_content.replace("<", " <").split(">") if "<" not in part)
    text_only = " ".join(text_only.split())

    c = canvas.Canvas(str(file_path), pagesize=A4)
    width, height = A4
    x = 40
    y = height - 40
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x, y, "WathiqCare - Medical Legal Forms Library")
    y -= 22
    c.setFont("Helvetica", 9)
    for line in textwrap.wrap(text_only, width=110):
        if y < 40:
            c.showPage()
            c.setFont("Helvetica", 9)
            y = height - 40
        c.drawString(x, y, line)
        y -= 12

    c.save()
    return file_name, str(file_path)


def get_workflow_snapshot(*, tenant_id: str, case_id: str) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        bundle = _get_case_bundle(db, tenant_id=tenant_id, case_id=case_id)
        _sync_case_documentation(bundle)
        db.flush()
        db.refresh(bundle.workflow)
        return _serialize_workflow(bundle)
    finally:
        db.close()


def list_case_documents(*, tenant_id: str, case_id: str) -> List[Dict[str, Any]]:
    db = SessionLocal()
    try:
        bundle = _get_case_bundle(db, tenant_id=tenant_id, case_id=case_id)
        return [_serialize_document(item) for item in bundle.workflow.documents]
    finally:
        db.close()


def validate_workflow_generation(
    *,
    tenant_id: str,
    case_id: str,
    template_key: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    db = SessionLocal()
    payload = payload or {}

    try:
        if template_key and template_key not in WORKFLOW_TEMPLATES:
            raise ValueError("Unknown template key")

        bundle = _get_case_bundle(db, tenant_id=tenant_id, case_id=case_id)
        _apply_payload_to_workflow(bundle.workflow, payload)
        _apply_payload_to_case_documentation(bundle.case_documentation, payload)
        _sync_case_documentation(bundle)

        context = _build_template_context(bundle, payload)
        required_fields = (
            WORKFLOW_TEMPLATES[template_key].required_fields
            if template_key
            else [key for key, _ in POLICY_REQUIRED_CASE_DOCUMENTATION]
        )

        missing_fields = _validate_required_fields(context, required_fields)
        policy_validation = _build_policy_validation(
            bundle,
            required_fields=required_fields,
            context=context,
        )

        bundle.case_documentation.last_validated_at = _utc_now()
        bundle.case_documentation.last_validation_status = "ready" if len(missing_fields) == 0 else "missing_fields"
        db.flush()
        db.commit()

        return {
            "template_key": template_key,
            "missing_fields": missing_fields,
            "can_generate": len(missing_fields) == 0,
            "policy_validation": policy_validation,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def preview_workflow_document(
    *,
    tenant_id: str,
    case_id: str,
    template_key: str,
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        if template_key not in WORKFLOW_TEMPLATES:
            raise ValueError("Unknown template key")

        bundle = _get_case_bundle(db, tenant_id=tenant_id, case_id=case_id)
        _apply_payload_to_workflow(bundle.workflow, payload or {})
        _apply_payload_to_case_documentation(bundle.case_documentation, payload or {})
        _sync_case_documentation(bundle)
        template = WORKFLOW_TEMPLATES[template_key]
        context = _build_template_context(bundle, payload)
        missing_fields = _validate_required_fields(context, template.required_fields)
        policy_validation = _build_policy_validation(
            bundle,
            required_fields=template.required_fields,
            context=context,
        )
        html_content = template.renderer(context)

        bundle.case_documentation.last_validated_at = _utc_now()
        bundle.case_documentation.last_validation_status = "ready" if len(missing_fields) == 0 else "missing_fields"
        db.flush()
        db.commit()

        return {
            "template_key": template.key,
            "title": template.title,
            "document_code": template.document_code,
            "missing_fields": missing_fields,
            "can_generate": len(missing_fields) == 0,
            "policy_validation": policy_validation,
            "html_content": html_content,
            "context": context,
        }
    finally:
        db.close()


def _generate_document(
    db,
    *,
    bundle: CaseBundle,
    template_key: str,
    payload: Optional[Dict[str, Any]],
    current_user: Dict[str, Any],
) -> Dict[str, Any]:
    if template_key not in WORKFLOW_TEMPLATES:
        raise ValueError("Unknown template key")

    template = WORKFLOW_TEMPLATES[template_key]
    _apply_payload_to_workflow(bundle.workflow, payload or {})
    _apply_payload_to_case_documentation(bundle.case_documentation, payload or {})

    discharge_decision_raw = (payload or {}).get("discharge_decision_at")
    parsed_discharge_decision = _parse_datetime(discharge_decision_raw)
    if parsed_discharge_decision:
        bundle.workflow.discharge_decision_at = parsed_discharge_decision
        bundle.workflow.escalation_due_at = parsed_discharge_decision + timedelta(hours=24)

    context = _build_template_context(bundle, payload)
    missing_fields = _validate_required_fields(context, template.required_fields)
    policy_validation = _build_policy_validation(
        bundle,
        required_fields=template.required_fields,
        context=context,
    )
    if missing_fields:
        raise ValueError(
            "Cannot generate document. Missing required fields: " + ", ".join(missing_fields)
        )

    html_content = template.renderer(context)
    template_meta = get_form_template_metadata(template_key)

    file_name, file_path = _write_document_file(bundle.discharge_case.id, template_key, html_content)
    pdf_result = _write_document_pdf(bundle.discharge_case.id, template_key, html_content)
    if pdf_result:
        file_name, file_path = pdf_result

    document = DischargeWorkflowDocument(
        workflow_id=bundle.workflow.id,
        case_id=bundle.discharge_case.id,
        tenant_id=bundle.discharge_case.tenant_id,
        generated_by=current_user["id"],
        template_key=template_key,
        document_code=template.document_code,
        title=template.title,
        file_name=file_name,
        file_path=file_path,
        html_content=html_content,
        locale=str((payload or {}).get("locale") or "en"),
        template_version=str(template_meta["version"]),
        locked_template=bool(template_meta["locked_template"]),
        attachment_group=bundle.discharge_case.id,
        generated_at=_utc_now(),
    )
    db.add(document)
    db.flush()

    _sync_case_documentation(bundle)
    bundle.case_documentation.last_validated_at = _utc_now()
    bundle.case_documentation.last_validation_status = "ready"

    return {
        "generated_document": _serialize_document(document),
        "policy_validation": policy_validation,
    }


def run_workflow_action(
    *,
    tenant_id: str,
    case_id: str,
    action: str,
    payload: Optional[Dict[str, Any]],
    current_user: Dict[str, Any],
) -> Dict[str, Any]:
    payload = payload or {}
    db = SessionLocal()

    try:
        bundle = _get_case_bundle(db, tenant_id=tenant_id, case_id=case_id)
        workflow = bundle.workflow
        case_documentation = bundle.case_documentation
        now = _utc_now()

        actor = (
            db.query(User)
            .filter(User.id == current_user["id"])
            .first()
        )
        actor_name = actor.full_name if actor else current_user["email"]

        _apply_payload_to_workflow(workflow, payload)
        _apply_payload_to_case_documentation(case_documentation, payload)

        generated_document: Optional[Dict[str, Any]] = None

        def _latest_generated_document(template_key: str) -> Optional[Dict[str, Any]]:
            matched = [
                item
                for item in (workflow.documents or [])
                if item.template_key == template_key
            ]
            if not matched:
                return None
            latest = max(matched, key=lambda item: item.generated_at or datetime.min)
            return _serialize_document(latest)

        def _require_started_refusal() -> None:
            if not workflow.refusal_started_at:
                raise ValueError("Start refusal workflow before this action")

        def _require_open_case() -> None:
            if workflow.closed_at or workflow.status == "closed" or workflow.current_stage == "closed":
                raise ValueError("Case is already closed")

        if action not in {"record_compliance_review", "record_legal_review", "close_under_review", "mark_patient_accepted_discharge"}:
            _require_open_case()

        if action in {
            "record_discharge_decision",
            "start_refusal_workflow",
            "mark_patient_counseled",
            "refer_social_services",
            "generate_refusal_form",
            "generate_financial_notice",
        } and workflow.escalated_at:
            raise ValueError("Case is already escalated; continue with review or closure actions")

        if action == "record_discharge_decision":
            parsed_decision_at = _parse_datetime(payload.get("discharge_decision_at"))
            if payload.get("discharge_decision_at") and not parsed_decision_at:
                raise ValueError("Invalid discharge decision datetime. Use ISO datetime format.")

            decision_at = parsed_decision_at or workflow.discharge_decision_at
            if not decision_at:
                raise ValueError("A valid discharge decision datetime is required.")

            attending_physician = _normalize_text(payload.get("attending_physician") or workflow.attending_physician)
            if not attending_physician:
                raise ValueError("Attending physician is required before recording medical discharge decision.")

            workflow.discharge_decision_at = decision_at
            workflow.escalation_due_at = decision_at + timedelta(hours=24)
            workflow.current_stage = "initial_communication"
            workflow.status = "active"
            workflow.case_status = POLICY_CASE_STATUSES["decision_issued"]
            workflow.responsible_department = "Attending Physician"
            workflow.responsible_person = attending_physician
            workflow.next_action = "If discharge is refused, start refusal workflow."
            _set_case_lifecycle_status(bundle, "DISCHARGE_DECISION_RECORDED")

            case_documentation.decision_recorded_at = decision_at

            _log_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=case_id,
                action="record_discharge_decision",
                details="Medical discharge decision recorded.",
            )

        elif action == "start_refusal_workflow":
            if not workflow.discharge_decision_at:
                raise ValueError("Record discharge decision before starting refusal workflow")

            workflow.refusal_started_at = now
            workflow.current_stage = "initial_communication"
            workflow.status = "refusal_active"
            workflow.case_status = POLICY_CASE_STATUSES["refusal_reported"]
            workflow.responsible_department = "Nursing"
            workflow.responsible_person = actor_name
            workflow.next_action = "Document communication and counseling details."
            _set_case_lifecycle_status(bundle, "REFUSAL_WORKFLOW_STARTED")

            _log_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=case_id,
                action="start_refusal_workflow",
                details="Refusal workflow started after patient/legal representative refused discharge.",
            )

        elif action == "mark_patient_counseled":
            _require_started_refusal()
            workflow.initial_communication_at = now
            workflow.current_stage = "support_and_intervention"
            workflow.status = "refusal_active"
            workflow.case_status = POLICY_CASE_STATUSES["initial_communication_done"]
            workflow.responsible_department = "Patient Affairs"
            workflow.responsible_person = actor_name
            workflow.next_action = "Coordinate support and social intervention."
            _set_case_lifecycle_status(bundle, "COUNSELING_COMPLETED")

            _log_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=case_id,
                action="mark_patient_counseled",
                details="Patient/family counseling documented.",
            )

        elif action == "refer_social_services":
            _require_started_refusal()
            if not workflow.initial_communication_at:
                raise ValueError("Document initial communication before support and intervention")

            workflow.social_services_referred_at = now
            workflow.support_and_intervention_at = now
            workflow.current_stage = "refusal_form"
            workflow.status = "refusal_active"
            workflow.case_status = POLICY_CASE_STATUSES["social_intervention_ongoing"]
            workflow.responsible_department = "Patient Affairs / Social Services"
            workflow.responsible_person = actor_name
            workflow.next_action = "Issue required policy forms and notices."
            _set_case_lifecycle_status(bundle, "SOCIAL_SERVICE_REFERRED")

            _log_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=case_id,
                action="refer_social_services",
                details="Case referred to Social Services / Patient Affairs.",
            )

        elif action == "generate_refusal_form":
            _require_started_refusal()
            if not workflow.support_and_intervention_at:
                raise ValueError("Complete support and intervention before generating refusal form")

            existing_refusal = _latest_generated_document("discharge_refusal_form")
            if existing_refusal:
                generated_document = existing_refusal
                _sync_case_documentation(bundle)
                workflow.updated_at = now
                _set_case_lifecycle_status(bundle, "REFUSAL_FORM_GENERATED")
                db.flush()
                db.refresh(workflow)
                db.commit()
                snapshot = _serialize_workflow(bundle)
                return {
                    "workflow": snapshot,
                    "generated_document": generated_document,
                }

            generation_result = _generate_document(
                db,
                bundle=bundle,
                template_key="discharge_refusal_form",
                payload=payload,
                current_user=current_user,
            )
            generated_document = generation_result["generated_document"]
            workflow.refusal_form_generated_at = now
            workflow.current_stage = "official_notification"
            workflow.status = "refusal_active"
            workflow.case_status = POLICY_CASE_STATUSES["form_pending_signature"]
            workflow.witness_mode = bool(payload.get("witness_mode"))
            workflow.witness1_name = _normalize_text(payload.get("witness1_name") or payload.get("witness_1_name"))
            workflow.witness1_role = _normalize_text(payload.get("witness1_role") or payload.get("witness_1_role"))
            workflow.witness1_signature = _normalize_text(payload.get("witness1_signature"))
            workflow.witness2_name = _normalize_text(payload.get("witness2_name") or payload.get("witness_2_name"))
            workflow.witness2_role = _normalize_text(payload.get("witness2_role") or payload.get("witness_2_role"))
            workflow.witness2_signature = _normalize_text(payload.get("witness2_signature"))
            workflow.refusal_form_signed = bool(payload.get("refusal_form_signed"))
            workflow.patient_signature = _normalize_text(payload.get("patient_signature"))
            workflow.representative_signature = _normalize_text(payload.get("representative_signature"))

            if workflow.refusal_form_signed:
                workflow.case_status = POLICY_CASE_STATUSES["form_signed"]
            if workflow.witness_mode:
                workflow.case_status = POLICY_CASE_STATUSES["witnessed_refusal_recorded"]
            workflow.responsible_department = "Nursing / Patient Affairs"
            workflow.responsible_person = actor_name
            workflow.next_action = "Generate and communicate financial responsibility notice."
            _set_case_lifecycle_status(bundle, "REFUSAL_FORM_GENERATED")

            _log_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=case_id,
                action="generate_refusal_form",
                details=(
                    f"Medical Discharge Refusal Form generated (IMC-PAT-DIS-REF-01) "
                    f"for case {case_id} using canonical template version {generated_document.get('templateVersion', '1.0')} "
                    f"document {generated_document.get('id')}"
                ),
            )

        elif action == "generate_financial_notice":
            _require_started_refusal()
            if not workflow.refusal_form_generated_at:
                raise ValueError("Generate refusal form before issuing official financial notice")

            existing_financial_notice = _latest_generated_document("financial_responsibility_notice")
            if existing_financial_notice:
                generated_document = existing_financial_notice
                _sync_case_documentation(bundle)
                workflow.updated_at = now
                _set_case_lifecycle_status(bundle, "FINANCIAL_NOTICE_GENERATED")
                db.flush()
                db.refresh(workflow)
                db.commit()
                snapshot = _serialize_workflow(bundle)
                return {
                    "workflow": snapshot,
                    "generated_document": generated_document,
                }

            generation_result = _generate_document(
                db,
                bundle=bundle,
                template_key="financial_responsibility_notice",
                payload=payload,
                current_user=current_user,
            )
            generated_document = generation_result["generated_document"]
            workflow.financial_notice_generated_at = now
            workflow.current_stage = "escalation"
            workflow.status = "refusal_active"
            workflow.financial_notice_issued = True
            workflow.financial_notice_acknowledged = bool(payload.get("financial_notice_acknowledged"))
            workflow.case_status = POLICY_CASE_STATUSES["financial_notice_issued"]
            workflow.responsible_department = "Patient Affairs"
            workflow.responsible_person = actor_name
            workflow.next_action = "Escalate to Legal / Compliance if refusal persists beyond 24h."
            _set_case_lifecycle_status(bundle, "FINANCIAL_NOTICE_GENERATED")

            _log_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=case_id,
                action="generate_financial_notice",
                details=(
                    f"Financial responsibility notification generated for case {case_id} "
                    f"using canonical template version {generated_document.get('templateVersion', '1.0')} "
                    f"document {generated_document.get('id')}"
                ),
            )

        elif action == "escalate_legal_compliance":
            if not workflow.financial_notice_generated_at:
                raise ValueError("Generate official financial notice before escalation")
            if not _is_escalation_required(workflow):
                raise ValueError("Escalation is available only when refusal persists beyond 24 hours")

            workflow.escalated_at = now
            workflow.escalation_timestamp = now
            workflow.current_stage = "escalation"
            workflow.status = "escalated"
            workflow.case_status = POLICY_CASE_STATUSES["escalated_legal"]
            workflow.responsible_department = "Legal / Compliance"
            workflow.responsible_person = actor_name
            workflow.next_action = "Legal and compliance follow-up is in progress."
            _set_case_lifecycle_status(bundle, "LEGAL_ESCALATED")

            _log_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=case_id,
                action="escalate_legal_compliance",
                details="Case escalated to Legal and Compliance.",
            )

        elif action == "record_compliance_review":
            if not workflow.escalated_at:
                raise ValueError("Compliance review requires escalation")

            workflow.compliance_notes = _normalize_text(payload.get("compliance_notes")) or workflow.compliance_notes
            workflow.case_status = POLICY_CASE_STATUSES["escalated_compliance"]
            workflow.status = "escalated"
            workflow.current_stage = "escalation"
            workflow.responsible_department = "Compliance"
            workflow.responsible_person = actor_name
            workflow.next_action = "Legal department review and final disposition."

            _log_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=case_id,
                action="record_compliance_review",
                details="Compliance review recorded.",
            )

        elif action == "record_legal_review":
            if not workflow.escalated_at:
                raise ValueError("Legal review requires escalation")

            workflow.legal_notes = _normalize_text(payload.get("legal_notes")) or workflow.legal_notes
            workflow.case_status = POLICY_CASE_STATUSES["under_review"]
            workflow.status = "escalated"
            workflow.current_stage = "escalation"
            workflow.responsible_department = "Legal"
            workflow.responsible_person = actor_name
            workflow.next_action = "Close case once legal disposition is complete."

            _log_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=case_id,
                action="record_legal_review",
                details="Legal review recorded.",
            )

        elif action == "mark_patient_accepted_discharge":
            workflow.current_stage = "closed"
            workflow.status = "closed"
            workflow.case_status = POLICY_CASE_STATUSES["closed_discharged"]
            workflow.closed_at = now
            workflow.responsible_department = "Attending Physician"
            workflow.responsible_person = actor_name
            workflow.next_action = "Case closed as patient discharged."
            _set_case_lifecycle_status(bundle, "ARCHIVED")

            _log_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=case_id,
                action="mark_patient_accepted_discharge",
                details="Patient accepted discharge and case was closed.",
            )

        elif action == "close_under_review":
            workflow.current_stage = "closed"
            workflow.status = "closed"
            workflow.case_status = POLICY_CASE_STATUSES["closed_admin_legal"]
            workflow.closed_at = now
            workflow.responsible_department = "Legal / Compliance"
            workflow.responsible_person = actor_name
            workflow.next_action = "Case closed after review."
            _set_case_lifecycle_status(bundle, "ARCHIVED")

            _log_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=case_id,
                action="close_under_review",
                details="Case closed with administrative/legal action.",
            )

        else:
            raise ValueError("Unsupported workflow action")

        _sync_case_documentation(bundle)
        workflow.updated_at = now
        db.flush()
        db.refresh(workflow)
        db.commit()

        snapshot = _serialize_workflow(bundle)
        return {
            "workflow": snapshot,
            "generated_document": generated_document,
        }

    except Exception as exc:
        db.rollback()
        if action in {"generate_refusal_form", "generate_financial_notice"}:
            _log_generation_failure_audit(
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=case_id,
                action=action,
                reason=str(exc),
            )
        raise

    finally:
        db.close()


def generate_document_record(
    *,
    tenant_id: str,
    case_id: str,
    template_key: str,
    payload: Optional[Dict[str, Any]],
    current_user: Dict[str, Any],
) -> Dict[str, Any]:
    payload = payload or {}
    db = SessionLocal()

    try:
        bundle = _get_case_bundle(db, tenant_id=tenant_id, case_id=case_id)
        now = _utc_now()

        generation_result = _generate_document(
            db,
            bundle=bundle,
            template_key=template_key,
            payload=payload,
            current_user=current_user,
        )
        generated_document = generation_result["generated_document"]

        if template_key == "discharge_refusal_form":
            bundle.workflow.refusal_form_generated_at = now
            bundle.workflow.current_stage = "official_notification"
            _set_case_lifecycle_status(bundle, "REFUSAL_FORM_GENERATED")
        elif template_key == "financial_responsibility_notice":
            bundle.workflow.financial_notice_generated_at = now
            bundle.workflow.current_stage = "escalation"
            _set_case_lifecycle_status(bundle, "FINANCIAL_NOTICE_GENERATED")

        bundle.workflow.updated_at = now
        _log_audit(
            db,
            tenant_id=tenant_id,
            user_id=current_user["id"],
            case_id=case_id,
            action=f"generate_{template_key}",
            details=f"Generated document for template: {template_key}",
        )

        db.flush()
        db.refresh(bundle.workflow)
        db.commit()

        return {
            "workflow": _serialize_workflow(bundle),
            "generated_document": generated_document,
            "policy_validation": generation_result.get("policy_validation"),
        }

    except Exception as exc:
        db.rollback()
        _log_generation_failure_audit(
            tenant_id=tenant_id,
            user_id=current_user["id"],
            case_id=case_id,
            action=f"generate_{template_key}",
            reason=str(exc),
        )
        raise

    finally:
        db.close()


def get_document_record(*, tenant_id: str, document_id: str) -> DischargeWorkflowDocument:
    db = SessionLocal()
    try:
        document = (
            db.query(DischargeWorkflowDocument)
            .filter(
                DischargeWorkflowDocument.id == document_id,
                DischargeWorkflowDocument.tenant_id == tenant_id,
            )
            .first()
        )

        if not document:
            raise ValueError("Document not found")

        db.expunge(document)
        return document
    finally:
        db.close()
