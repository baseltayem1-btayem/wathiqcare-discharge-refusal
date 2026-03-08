from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from backend.core.database import SessionLocal
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
]

STAGE_LABELS = {
    "medical_discharge_decision": "Medical Discharge Decision",
    "initial_communication": "Initial Communication",
    "support_and_intervention": "Support and Intervention",
    "refusal_form": "Refusal Form",
    "official_notification": "Official Notification",
    "escalation": "Escalation",
}

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


def _normalize_text(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        trimmed = value.strip()
        return trimmed or None
    return str(value)


def _apply_payload_to_workflow(workflow: DischargeRefusalWorkflow, payload: Dict[str, Any]) -> None:
    for key in WORKFLOW_FIELD_NAMES:
        if key in payload:
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
            status="active",
            responsible_department="Attending Physician",
            next_action="Record discharge decision details.",
        )
        db.add(workflow)
        db.flush()

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
    return {
        "id": document.id,
        "template_key": document.template_key,
        "document_code": document.document_code,
        "title": document.title,
        "file_name": document.file_name,
        "generated_at": _iso(document.generated_at),
        "view_url": f"/api/discharge/documents/{document.id}/view",
        "download_url": f"/api/discharge/documents/{document.id}/download",
    }


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

    return {
        "id": workflow.id,
        "case_id": workflow.case_id,
        "workflow_type": workflow.workflow_type,
        "status": workflow.status,
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
        "patient_name": workflow.patient_name,
        "patient_id_number": workflow.patient_id_number,
        "medical_record_number": workflow.medical_record_number,
        "room_number": workflow.room_number,
        "attending_physician": workflow.attending_physician,
        "refusal_reason": workflow.refusal_reason,
        "discussion_summary": workflow.discussion_summary,
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
        "patient_id_number": str(payload.get("patient_id_number") or workflow.patient_id_number or ""),
        "medical_record_number": str(
            payload.get("medical_record_number")
            or workflow.medical_record_number
            or patient.mrn
            or ""
        ),
        "room_number": str(payload.get("room_number") or workflow.room_number or ""),
        "attending_physician": str(payload.get("attending_physician") or workflow.attending_physician or ""),
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

    # TODO: Add PDF conversion using a stable renderer once deployment environment supports it.
    file_name, file_path = _write_document_file(bundle.discharge_case.id, template_key, html_content)

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

        def _require_started_refusal() -> None:
            if not workflow.refusal_started_at:
                raise ValueError("Start refusal workflow before this action")

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
            workflow.responsible_department = "Attending Physician"
            workflow.responsible_person = attending_physician
            workflow.next_action = "If discharge is refused, start refusal workflow."

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
            workflow.responsible_department = "Nursing"
            workflow.responsible_person = actor_name
            workflow.next_action = "Document communication and counseling details."

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
            workflow.responsible_department = "Patient Affairs"
            workflow.responsible_person = actor_name
            workflow.next_action = "Coordinate support and social intervention."

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
            workflow.responsible_department = "Patient Affairs / Social Services"
            workflow.responsible_person = actor_name
            workflow.next_action = "Issue required policy forms and notices."

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
            workflow.responsible_department = "Nursing / Patient Affairs"
            workflow.responsible_person = actor_name
            workflow.next_action = "Generate and communicate financial responsibility notice."

            _log_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=case_id,
                action="generate_refusal_form",
                details="Medical Discharge Refusal Form generated (IMC-PAT-DIS-REF-01).",
            )

        elif action == "generate_financial_notice":
            _require_started_refusal()
            if not workflow.refusal_form_generated_at:
                raise ValueError("Generate refusal form before issuing official financial notice")

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
            workflow.responsible_department = "Patient Affairs"
            workflow.responsible_person = actor_name
            workflow.next_action = "Escalate to Legal / Compliance if refusal persists beyond 24h."

            _log_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=case_id,
                action="generate_financial_notice",
                details="Financial responsibility notification generated.",
            )

        elif action == "escalate_legal_compliance":
            if not workflow.financial_notice_generated_at:
                raise ValueError("Generate official financial notice before escalation")
            if not _is_escalation_required(workflow):
                raise ValueError("Escalation is available only when refusal persists beyond 24 hours")

            workflow.escalated_at = now
            workflow.current_stage = "escalation"
            workflow.status = "escalated"
            workflow.responsible_department = "Legal / Compliance"
            workflow.responsible_person = actor_name
            workflow.next_action = "Legal and compliance follow-up is in progress."

            _log_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=case_id,
                action="escalate_legal_compliance",
                details="Case escalated to Legal and Compliance.",
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

    except Exception:
        db.rollback()
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
