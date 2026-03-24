from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Optional

from backend.core.database import SessionLocal
from backend.core.pdf_renderer import render_html_to_pdf
from backend.models.audit_log import AuditLog
from backend.models.discharge_case import DischargeCase
from backend.models.discharge_workflow import DischargeRefusalWorkflow
from backend.models.patient import Patient
from backend.models.tenant import Tenant
from backend.models.user import User
from backend.services.notification_service import NotificationService


GENERATED_LEGAL_ARTIFACTS_DIR = Path("backend/generated/legal_artifacts")
GENERATED_LEGAL_ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

COMPLIANCE_FRAMEWORKS = [
    "Mayo Clinic Documentation Standards",
    "Saudi MOH Regulations",
    "CBAHI Accreditation",
    "JCI Compliance",
    "Saudi PDPL + E-Transactions Law",
]


@dataclass
class _CaseBundle:
    discharge_case: DischargeCase
    workflow: DischargeRefusalWorkflow


def _utc_now() -> datetime:
    return datetime.utcnow()


def _parse_datetime(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None


def _json_load(raw: Optional[str]) -> Dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _json_dump(value: Dict[str, Any]) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def _write_audit(
    db,
    *,
    tenant_id: str,
    user_id: str,
    case_id: str,
    action: str,
    details: str,
) -> None:
    db.add(
        AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            entity_type="discharge_case",
            entity_id=case_id,
            action=action,
            details=details,
            created_at=_utc_now(),
        )
    )


def _ensure_workflow(db, *, discharge_case: DischargeCase, patient: Patient) -> DischargeRefusalWorkflow:
    workflow = (
        db.query(DischargeRefusalWorkflow)
        .filter(DischargeRefusalWorkflow.case_id == discharge_case.id)
        .first()
    )
    if workflow:
        return workflow

    workflow = DischargeRefusalWorkflow(
        case_id=discharge_case.id,
        tenant_id=discharge_case.tenant_id,
        patient_name=patient.full_name,
        medical_record_number=patient.mrn,
        refusal_reason=discharge_case.refusal_reason,
        status="draft",
        case_status="Draft",
        current_stage="medical_discharge_decision",
        responsible_department="Attending Physician",
        next_action="Record legal-clinical artifact sections",
    )
    db.add(workflow)
    db.flush()
    return workflow


def _get_case_bundle(db, *, tenant_id: str, case_id: str) -> _CaseBundle:
    case = (
        db.query(DischargeCase)
        .filter(DischargeCase.id == case_id, DischargeCase.tenant_id == tenant_id)
        .first()
    )
    if not case:
        raise ValueError("Case not found")

    patient = db.query(Patient).filter(Patient.id == case.patient_id).first()
    if not patient:
        raise ValueError("Patient not found")

    workflow = _ensure_workflow(db, discharge_case=case, patient=patient)
    return _CaseBundle(discharge_case=case, workflow=workflow)


def _append_immutable_audit(case: DischargeCase, *, action: str, user_id: str, details: Dict[str, Any]) -> None:
    legal_payload = _json_load(case.legal_payload_json)
    chain = legal_payload.get("audit_chain") if isinstance(legal_payload.get("audit_chain"), list) else []
    previous_hash = chain[-1]["entry_hash"] if chain else "GENESIS"
    now_iso = _utc_now().isoformat()
    payload = {
        "action": action,
        "user_id": user_id,
        "timestamp": now_iso,
        "details": details,
        "previous_hash": previous_hash,
    }
    payload_bytes = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    entry_hash = hashlib.sha256(payload_bytes).hexdigest()
    chain.append({**payload, "entry_hash": entry_hash})
    legal_payload["audit_chain"] = chain
    case.legal_payload_json = _json_dump(legal_payload)


def _set_screen_data(case: DischargeCase, *, screen: str, payload: Dict[str, Any]) -> None:
    legal_payload = _json_load(case.legal_payload_json)
    screens = legal_payload.get("screens") if isinstance(legal_payload.get("screens"), dict) else {}
    existing = screens.get(screen) if isinstance(screens.get(screen), dict) else {}
    existing.update(payload)
    existing["updated_at"] = _utc_now().isoformat()
    screens[screen] = existing
    legal_payload["screens"] = screens
    case.legal_payload_json = _json_dump(legal_payload)


def _get_screen_data(case: DischargeCase) -> Dict[str, Dict[str, Any]]:
    legal_payload = _json_load(case.legal_payload_json)
    screens = legal_payload.get("screens")
    return screens if isinstance(screens, dict) else {}


def _get_signatures(case: DischargeCase) -> Dict[str, Dict[str, Any]]:
    data = _json_load(case.signature_context_json)
    signatures = data.get("signatures")
    return signatures if isinstance(signatures, dict) else {}


def _set_signature(case: DischargeCase, *, role: str, data: Dict[str, Any]) -> None:
    current = _json_load(case.signature_context_json)
    signatures = current.get("signatures") if isinstance(current.get("signatures"), dict) else {}
    signatures[role] = data
    current["signatures"] = signatures
    case.signature_context_json = _json_dump(current)

    if role == "patient":
        case.patient_signature_hash = data["signature_hash"]
    elif role == "physician":
        case.physician_signature_hash = data["signature_hash"]
    elif role == "witness":
        case.witness_signature_hash = data["signature_hash"]
    elif role == "guardian":
        case.guardian_signature_hash = data["signature_hash"]


def _escalation_state(workflow: DischargeRefusalWorkflow) -> str:
    decision_at = workflow.discharge_decision_at
    if not decision_at:
        return "not_started"
    elapsed = _utc_now() - decision_at
    if elapsed >= timedelta(hours=48):
        return "escalated_48h"
    if elapsed >= timedelta(hours=24):
        return "legal_notification_24h"
    return "within_24h"


def _get_automation_state(case: DischargeCase) -> Dict[str, Any]:
    payload = _json_load(case.legal_payload_json)
    automation = payload.get("escalation_automation")
    return automation if isinstance(automation, dict) else {}


def _set_automation_state(case: DischargeCase, state: Dict[str, Any]) -> None:
    payload = _json_load(case.legal_payload_json)
    payload["escalation_automation"] = state
    case.legal_payload_json = _json_dump(payload)


def _resolve_notification_recipients(db, *, tenant_id: str, roles: tuple[str, ...]) -> list[User]:
    return (
        db.query(User)
        .filter(User.tenant_id == tenant_id, User.role.in_(roles), User.is_active.is_(True))
        .all()
    )


def _dispatch_escalation_notification(
    db,
    *,
    case: DischargeCase,
    workflow: DischargeRefusalWorkflow,
    title: str,
    body: str,
    roles: tuple[str, ...],
    team_code: str,
    metadata_json: Dict[str, Any],
) -> None:
    notifications = NotificationService(db)
    notifications.create_in_app_notification(
        case_id=case.id,
        task_id=None,
        recipient_user_id=None,
        recipient_team_code=team_code,
        notification_type="legal_artifact_escalation",
        title=title,
        body=body,
        metadata_json=metadata_json,
    )

    for recipient in _resolve_notification_recipients(db, tenant_id=case.tenant_id, roles=roles):
        notifications.create_in_app_notification(
            case_id=case.id,
            task_id=None,
            recipient_user_id=recipient.id,
            recipient_team_code=None,
            notification_type="legal_artifact_escalation",
            title=title,
            body=body,
            metadata_json=metadata_json,
        )
        if recipient.email:
            notifications.send_email_notification(
                tenant_id=case.tenant_id,
                created_by=case.created_by,
                case_id=case.id,
                recipient_email=recipient.email,
                title=title,
                body=body,
                metadata_json=metadata_json,
                raise_on_failure=False,
            )


def _apply_escalation_automation(db, *, case: DischargeCase, workflow: DischargeRefusalWorkflow) -> None:
    if case.immutable_lock or case.finalized_at or workflow.closed_at:
        return

    decision_at = workflow.discharge_decision_at
    if not decision_at:
        return

    now = _utc_now()
    elapsed = now - decision_at
    state = _get_automation_state(case)
    changed = False

    if elapsed >= timedelta(hours=24) and not state.get("legal_notified_24h_at"):
        title = "24h Legal Notification"
        body = (
            f"Discharge refusal case {case.id} has remained unresolved for more than 24 hours. "
            "Legal review is now required."
        )
        _dispatch_escalation_notification(
            db,
            case=case,
            workflow=workflow,
            title=title,
            body=body,
            roles=("legal_admin",),
            team_code="legal_admin",
            metadata_json={"case_id": case.id, "threshold": "24h", "stage": workflow.current_stage},
        )
        state["legal_notified_24h_at"] = now.isoformat()
        _write_audit(
            db,
            tenant_id=case.tenant_id,
            user_id=case.created_by,
            case_id=case.id,
            action="legal_artifact_notify_24h",
            details="24-hour legal notification dispatched.",
        )
        _append_immutable_audit(
            case,
            action="notify_24h",
            user_id=case.created_by,
            details={"threshold": "24h"},
        )
        changed = True

    if elapsed >= timedelta(hours=48) and not state.get("escalated_48h_at"):
        workflow.current_stage = "escalation"
        workflow.status = "escalated"
        workflow.escalated_at = workflow.escalated_at or now
        workflow.escalation_timestamp = now
        workflow.case_status = "Escalated to Legal / Compliance"
        workflow.responsible_department = "Legal / Compliance"
        workflow.next_action = "Urgent legal and compliance review required after 48h unresolved refusal."
        case.status = "LEGAL_ESCALATED"

        title = "48h Escalation Triggered"
        body = (
            f"Discharge refusal case {case.id} exceeded 48 hours without resolution and has been escalated "
            "to Legal and Compliance."
        )
        _dispatch_escalation_notification(
            db,
            case=case,
            workflow=workflow,
            title=title,
            body=body,
            roles=("legal_admin", "compliance"),
            team_code="compliance",
            metadata_json={"case_id": case.id, "threshold": "48h", "stage": workflow.current_stage},
        )
        state["escalated_48h_at"] = now.isoformat()
        _write_audit(
            db,
            tenant_id=case.tenant_id,
            user_id=case.created_by,
            case_id=case.id,
            action="legal_artifact_escalate_48h",
            details="48-hour escalation dispatched to legal and compliance.",
        )
        _append_immutable_audit(
            case,
            action="escalate_48h",
            user_id=case.created_by,
            details={"threshold": "48h"},
        )
        changed = True

    if changed:
        _set_automation_state(case, state)
        case.updated_at = now


def _validate_requirements(case: DischargeCase, workflow: DischargeRefusalWorkflow) -> list[str]:
    missing: list[str] = []
    screens = _get_screen_data(case)

    create_case = screens.get("create_case", {})
    if not str(create_case.get("patient_mrn") or case.mrn or "").strip():
        missing.append("create_case.patient_mrn")
    if not str(create_case.get("patient_name") or case.patient_name or "").strip():
        missing.append("create_case.patient_name")
    if not str(create_case.get("attending_physician_name") or case.attending_physician_name or "").strip():
        missing.append("create_case.attending_physician_name")

    tenant_header = create_case.get("tenant_header") if isinstance(create_case.get("tenant_header"), dict) else {}
    if not str(tenant_header.get("logo_url") or "").strip():
        missing.append("create_case.tenant_header.logo_url")
    if not str(tenant_header.get("moh_license") or "").strip():
        missing.append("create_case.tenant_header.moh_license")
    if not str(tenant_header.get("commercial_registration") or "").strip():
        missing.append("create_case.tenant_header.commercial_registration")

    clinical = screens.get("clinical_decision", {})
    if not _parse_datetime(clinical.get("discharge_decision_at") or workflow.discharge_decision_at):
        missing.append("clinical_decision.discharge_decision_at")
    if not str(clinical.get("clinical_rationale") or "").strip():
        missing.append("clinical_decision.clinical_rationale")

    capacity = clinical.get("capacity_assessment") if isinstance(clinical.get("capacity_assessment"), dict) else {}
    capacity_outcome = str(capacity.get("outcome") or "").strip()
    if capacity_outcome not in {"has_capacity", "lacks_capacity"}:
        missing.append("clinical_decision.capacity_assessment.outcome")

    risk = screens.get("risk_disclosure", {})
    if risk.get("disclosed") is not True:
        missing.append("risk_disclosure.disclosed")

    risk_items_ar = risk.get("risk_items_ar") if isinstance(risk.get("risk_items_ar"), list) else []
    risk_items_en = risk.get("risk_items_en") if isinstance(risk.get("risk_items_en"), list) else []
    if len(risk_items_ar) == 0:
        missing.append("risk_disclosure.risk_items_ar")
    if len(risk_items_en) == 0:
        missing.append("risk_disclosure.risk_items_en")
    if risk.get("patient_acknowledged") is not True:
        missing.append("risk_disclosure.patient_acknowledged")

    interaction = screens.get("patient_interaction", {})
    language = str(interaction.get("language") or "").strip()
    if language not in {"ar", "en", "bilingual"}:
        missing.append("patient_interaction.language")
    if not str(interaction.get("communication_method") or "").strip():
        missing.append("patient_interaction.communication_method")

    refusal = screens.get("refusal_confirmation", {})
    if not str(refusal.get("refusal_reason") or case.refusal_reason or "").strip():
        missing.append("refusal_confirmation.refusal_reason")
    if refusal.get("alternative_plan_offered") is not True:
        missing.append("refusal_confirmation.alternative_plan_offered")
    if refusal.get("witness_present") is not True:
        missing.append("refusal_confirmation.witness_present")

    final_review = screens.get("final_review", {})
    if not str(final_review.get("reviewer_name") or "").strip():
        missing.append("final_review.reviewer_name")
    if not str(final_review.get("reviewer_role") or "").strip():
        missing.append("final_review.reviewer_role")

    signatures = _get_signatures(case)
    for role in ["patient", "physician", "witness"]:
        if role not in signatures:
            missing.append(f"signature.{role}")

    if capacity_outcome == "lacks_capacity" and "guardian" not in signatures:
        missing.append("signature.guardian")

    return missing


def _status_payload(case: DischargeCase, workflow: DischargeRefusalWorkflow) -> Dict[str, Any]:
    screens = _get_screen_data(case)
    signatures = _get_signatures(case)
    missing = _validate_requirements(case, workflow)
    create_case = screens.get("create_case", {})
    tenant_header = create_case.get("tenant_header") if isinstance(create_case.get("tenant_header"), dict) else {}

    return {
        "case_id": case.id,
        "status": case.status or workflow.status,
        "stage": workflow.current_stage,
        "artifact_version": int(case.artifact_version or "1"),
        "immutable_lock": bool(case.immutable_lock),
        "finalized_at": case.finalized_at.isoformat() if case.finalized_at else None,
        "escalation_state": _escalation_state(workflow),
        "compliance_frameworks": COMPLIANCE_FRAMEWORKS,
        "missing_requirements": missing,
        "screens": screens,
        "signatures": signatures,
        "tenant_header": {
            "logo_url": str(tenant_header.get("logo_url") or ""),
            "moh_license": str(tenant_header.get("moh_license") or ""),
            "commercial_registration": str(tenant_header.get("commercial_registration") or ""),
            "hospital_name_ar": str(tenant_header.get("hospital_name_ar") or ""),
            "hospital_name_en": str(tenant_header.get("hospital_name_en") or ""),
        },
        "legal_footer_text": str(create_case.get("legal_footer_text") or case.legal_footer_text or ""),
    }


def _ensure_not_finalized(case: DischargeCase) -> None:
    if case.immutable_lock or case.finalized_at is not None:
        raise ValueError("Case is finalized and immutable; post-final edits are blocked")


def create_legal_artifact_case(
    *,
    tenant_id: str,
    actor_user_id: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise ValueError("Tenant not found")

        user = db.query(User).filter(User.id == actor_user_id, User.tenant_id == tenant_id).first()
        if not user:
            raise ValueError("User not found")

        patient_mrn = str(payload.get("patient_mrn") or "").strip()
        patient_name = str(payload.get("patient_name") or "").strip()
        refusal_reason = str(payload.get("refusal_reason") or "").strip()
        attending_physician_name = str(payload.get("attending_physician_name") or "").strip()
        tenant_header = payload.get("tenant_header") if isinstance(payload.get("tenant_header"), dict) else {}
        legal_footer_text = str(payload.get("legal_footer_text") or "").strip()

        if not patient_mrn or not patient_name or not refusal_reason or not attending_physician_name:
            raise ValueError("patient_mrn, patient_name, refusal_reason, and attending_physician_name are required")

        patient = (
            db.query(Patient)
            .filter(Patient.tenant_id == tenant_id, Patient.mrn == patient_mrn)
            .first()
        )
        if not patient:
            patient = Patient(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                mrn=patient_mrn,
                full_name=patient_name,
                date_of_birth=None,
            )
            db.add(patient)
            db.flush()

        discharge_case = DischargeCase(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            patient_id=patient.id,
            created_by=actor_user_id,
            status="CASE_CREATED",
            refusal_reason=refusal_reason,
            patient_name=patient_name,
            mrn=patient_mrn,
            attending_physician_name=attending_physician_name,
            artifact_version="1",
            immutable_lock=False,
            tenant_header_json=_json_dump(tenant_header),
            legal_footer_text=legal_footer_text,
            created_at=_utc_now(),
            updated_at=_utc_now(),
        )
        db.add(discharge_case)
        db.flush()

        workflow = _ensure_workflow(db, discharge_case=discharge_case, patient=patient)

        create_case_payload = {
            "patient_mrn": patient_mrn,
            "patient_name": patient_name,
            "attending_physician_name": attending_physician_name,
            "tenant_header": {
                "logo_url": str(tenant_header.get("logo_url") or ""),
                "moh_license": str(tenant_header.get("moh_license") or ""),
                "commercial_registration": str(tenant_header.get("commercial_registration") or ""),
                "hospital_name_ar": str(tenant_header.get("hospital_name_ar") or ""),
                "hospital_name_en": str(tenant_header.get("hospital_name_en") or ""),
            },
            "legal_footer_text": legal_footer_text,
        }
        _set_screen_data(discharge_case, screen="create_case", payload=create_case_payload)
        _append_immutable_audit(
            discharge_case,
            action="create_case",
            user_id=actor_user_id,
            details={"screen": "create_case", "patient_mrn": patient_mrn},
        )

        _write_audit(
            db,
            tenant_id=tenant_id,
            user_id=actor_user_id,
            case_id=discharge_case.id,
            action="legal_artifact_create_case",
            details="Legal discharge artifact case created",
        )

        db.commit()
        return _status_payload(discharge_case, workflow)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_legal_artifact_status(*, tenant_id: str, case_id: str) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        bundle = _get_case_bundle(db, tenant_id=tenant_id, case_id=case_id)
        _apply_escalation_automation(db, case=bundle.discharge_case, workflow=bundle.workflow)
        db.commit()
        return _status_payload(bundle.discharge_case, bundle.workflow)
    finally:
        db.close()


def upsert_legal_artifact_screen(
    *,
    tenant_id: str,
    case_id: str,
    screen: str,
    payload: Dict[str, Any],
    actor_user_id: str,
) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        bundle = _get_case_bundle(db, tenant_id=tenant_id, case_id=case_id)
        case = bundle.discharge_case
        workflow = bundle.workflow

        _ensure_not_finalized(case)

        if screen == "clinical_decision":
            decision_at = _parse_datetime(payload.get("discharge_decision_at"))
            if decision_at:
                workflow.discharge_decision_at = decision_at
                workflow.escalation_due_at = decision_at + timedelta(hours=24)
                case.discharge_decision_date = decision_at
            capacity = payload.get("capacity_assessment") if isinstance(payload.get("capacity_assessment"), dict) else {}
            case.capacity_status = str(capacity.get("outcome") or "").strip() or case.capacity_status
            case.capacity_assessed_by = str(capacity.get("assessed_by") or "").strip() or case.capacity_assessed_by
            if case.capacity_status:
                case.capacity_validated_at = _utc_now()
            workflow.current_stage = "initial_communication"
            workflow.status = "active"
            case.status = "DISCHARGE_DECISION_RECORDED"

        if screen == "risk_disclosure":
            if payload.get("disclosed") is True and payload.get("patient_acknowledged") is True:
                case.risk_disclosure_completed_at = _utc_now()
            workflow.current_stage = "support_and_intervention"
            workflow.status = "refusal_active"
            case.status = "COUNSELING_COMPLETED"

        if screen == "patient_interaction":
            workflow.current_stage = "refusal_form"

        if screen == "refusal_confirmation":
            workflow.current_stage = "official_notification"

        if screen == "final_review":
            workflow.current_stage = "escalation"

        _apply_escalation_automation(db, case=case, workflow=workflow)

        _set_screen_data(case, screen=screen, payload=payload)
        case.artifact_version = str(int(case.artifact_version or "1") + 1)
        case.updated_at = _utc_now()

        _append_immutable_audit(
            case,
            action=f"update_{screen}",
            user_id=actor_user_id,
            details={"screen": screen, "version": case.artifact_version},
        )

        _write_audit(
            db,
            tenant_id=tenant_id,
            user_id=actor_user_id,
            case_id=case.id,
            action=f"legal_artifact_update_{screen}",
            details=f"Updated legal artifact screen: {screen}",
        )

        db.commit()
        return _status_payload(case, workflow)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def record_legal_signature(
    *,
    tenant_id: str,
    case_id: str,
    role: str,
    signature_value: str,
    signer_name: str,
    signer_role: Optional[str],
    ip_address: str,
    actor_user_id: str,
) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        bundle = _get_case_bundle(db, tenant_id=tenant_id, case_id=case_id)
        case = bundle.discharge_case

        _ensure_not_finalized(case)

        now = _utc_now().isoformat()
        normalized_signature = str(signature_value or "").strip()
        if not normalized_signature:
            raise ValueError("signature_value is required")

        fingerprint_payload = f"{case.id}|{role}|{normalized_signature}|{now}|{ip_address}"
        signature_hash = hashlib.sha256(fingerprint_payload.encode("utf-8")).hexdigest()

        data = {
            "signer_name": str(signer_name or "").strip(),
            "signer_role": str(signer_role or role),
            "ip_address": ip_address,
            "timestamp": now,
            "signature_hash": signature_hash,
            "e_transaction_binding": hashlib.sha256(f"{case.id}|{now}|{signature_hash}".encode("utf-8")).hexdigest(),
        }

        _set_signature(case, role=role, data=data)
        case.signed_at = _utc_now()
        case.updated_at = _utc_now()
        case.artifact_version = str(int(case.artifact_version or "1") + 1)

        _apply_escalation_automation(db, case=case, workflow=bundle.workflow)

        _append_immutable_audit(
            case,
            action=f"capture_signature_{role}",
            user_id=actor_user_id,
            details={"role": role, "signature_hash": signature_hash},
        )

        _write_audit(
            db,
            tenant_id=tenant_id,
            user_id=actor_user_id,
            case_id=case.id,
            action=f"legal_artifact_signature_{role}",
            details=f"Captured {role} signature with IP/timestamp/hash evidence",
        )

        db.commit()
        return _status_payload(case, bundle.workflow)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _render_legal_artifact_html(case: DischargeCase, workflow: DischargeRefusalWorkflow) -> str:
    payload = _status_payload(case, workflow)
    screens = payload["screens"]
    signatures = payload["signatures"]
    tenant_header = payload["tenant_header"]

    def s(path: str, default: str = "") -> str:
        root, _, leaf = path.partition(".")
        node = screens.get(root, {})
        if not isinstance(node, dict):
            return default
        value = node.get(leaf) if leaf else node
        return str(value or default)

    def list_join(values: Any) -> str:
        if isinstance(values, list):
            return "<br/>".join(str(v) for v in values if str(v).strip())
        return ""

    return f"""
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <title>Discharge Refusal Medico-Legal Artifact</title>
  <style>
    body {{ font-family: Arial, sans-serif; color: #0f172a; margin: 24px; line-height: 1.5; }}
    .header {{ border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; }}
    .title {{ font-size: 20px; font-weight: bold; }}
    .sub {{ font-size: 12px; color: #334155; }}
    .section {{ border: 1px solid #cbd5e1; border-radius: 8px; margin: 10px 0; padding: 12px; }}
    .section h3 {{ margin: 0 0 8px; font-size: 14px; }}
    .rtl {{ direction: rtl; text-align: right; }}
    table {{ width: 100%; border-collapse: collapse; }}
    td {{ border: 1px solid #e2e8f0; padding: 6px; vertical-align: top; }}
    .footer {{ margin-top: 18px; border-top: 1px solid #94a3b8; padding-top: 10px; font-size: 11px; color: #475569; }}
  </style>
</head>
<body>
  <div class=\"header\">
    <div class=\"title\">Medical-Legal Discharge Refusal Artifact</div>
    <div class=\"rtl\">وثيقة رفض الخروج الطبي القانونية</div>
    <div class=\"sub\">Case ID: {case.id}</div>
    <div class=\"sub\">MOH License: {tenant_header.get('moh_license', '')} | CR: {tenant_header.get('commercial_registration', '')}</div>
    <div class=\"sub\">Logo: {tenant_header.get('logo_url', '')}</div>
  </div>

  <div class=\"section\">
    <h3>1) Create Case / إنشاء الحالة</h3>
    <table>
      <tr><td>Patient Name</td><td>{s('create_case.patient_name', case.patient_name or '')}</td><td class=\"rtl\">اسم المريض</td></tr>
      <tr><td>MRN</td><td>{s('create_case.patient_mrn', case.mrn or '')}</td><td class=\"rtl\">الرقم الطبي</td></tr>
      <tr><td>Attending Physician</td><td>{s('create_case.attending_physician_name', case.attending_physician_name or '')}</td><td class=\"rtl\">الطبيب المعالج</td></tr>
    </table>
  </div>

  <div class=\"section\">
    <h3>2) Clinical Decision / القرار السريري</h3>
    <table>
      <tr><td>Decision Date</td><td>{s('clinical_decision.discharge_decision_at', workflow.discharge_decision_at.isoformat() if workflow.discharge_decision_at else '')}</td><td class=\"rtl\">تاريخ القرار</td></tr>
      <tr><td>Clinical Rationale</td><td>{s('clinical_decision.clinical_rationale')}</td><td class=\"rtl\">المبرر السريري</td></tr>
      <tr><td>Capacity Outcome</td><td>{s('clinical_decision.capacity_assessment')}</td><td class=\"rtl\">نتيجة الأهلية</td></tr>
    </table>
  </div>

  <div class=\"section\">
    <h3>3) Mandatory Risk Disclosure / الإفصاح الإلزامي عن المخاطر</h3>
    <table>
      <tr><td>English Risks</td><td>{list_join(screens.get('risk_disclosure', {}).get('risk_items_en'))}</td><td class=\"rtl\">المخاطر بالعربية</td></tr>
      <tr><td>Arabic Risks</td><td class=\"rtl\">{list_join(screens.get('risk_disclosure', {}).get('risk_items_ar'))}</td><td class=\"rtl\">المخاطر بالعربية</td></tr>
      <tr><td>Acknowledged</td><td>{str(screens.get('risk_disclosure', {}).get('patient_acknowledged', False))}</td><td class=\"rtl\">تم الإقرار</td></tr>
    </table>
  </div>

  <div class=\"section\">
    <h3>4) Patient Interaction / تفاعل المريض</h3>
    <table>
      <tr><td>Language</td><td>{s('patient_interaction.language')}</td><td class=\"rtl\">اللغة</td></tr>
      <tr><td>Method</td><td>{s('patient_interaction.communication_method')}</td><td class=\"rtl\">طريقة التفاعل</td></tr>
      <tr><td>Summary</td><td>{s('patient_interaction.interaction_summary')}</td><td class=\"rtl\">ملخص التفاعل</td></tr>
    </table>
  </div>

  <div class=\"section\">
    <h3>5) Refusal Confirmation / تأكيد الرفض</h3>
    <table>
      <tr><td>Refusal Reason</td><td>{s('refusal_confirmation.refusal_reason', case.refusal_reason or '')}</td><td class=\"rtl\">سبب الرفض</td></tr>
      <tr><td>Alternative Offered</td><td>{str(screens.get('refusal_confirmation', {}).get('alternative_plan_offered', False))}</td><td class=\"rtl\">عرض بديل</td></tr>
      <tr><td>Witness Present</td><td>{str(screens.get('refusal_confirmation', {}).get('witness_present', False))}</td><td class=\"rtl\">وجود شاهد</td></tr>
    </table>
  </div>

  <div class=\"section\">
    <h3>6) Signature Attestation / توثيق التواقيع</h3>
    <table>
      <tr><td>Patient</td><td>{signatures.get('patient', {}).get('signature_hash', '')}</td><td class=\"rtl\">المريض</td></tr>
      <tr><td>Physician</td><td>{signatures.get('physician', {}).get('signature_hash', '')}</td><td class=\"rtl\">الطبيب</td></tr>
      <tr><td>Witness</td><td>{signatures.get('witness', {}).get('signature_hash', '')}</td><td class=\"rtl\">الشاهد</td></tr>
      <tr><td>Guardian</td><td>{signatures.get('guardian', {}).get('signature_hash', '')}</td><td class=\"rtl\">ولي الأمر</td></tr>
    </table>
  </div>

  <div class=\"section\">
    <h3>7) Final Review / المراجعة النهائية</h3>
    <table>
      <tr><td>Reviewer</td><td>{s('final_review.reviewer_name')}</td><td class=\"rtl\">اسم المراجع</td></tr>
      <tr><td>Role</td><td>{s('final_review.reviewer_role')}</td><td class=\"rtl\">الدور</td></tr>
      <tr><td>Summary</td><td>{s('final_review.review_summary')}</td><td class=\"rtl\">ملخص المراجعة</td></tr>
    </table>
  </div>

  <div class=\"footer\">
    {case.legal_footer_text or "This medico-legal document is generated in alignment with MOH, CBAHI, JCI, PDPL, and Saudi E-Transactions Law."}
  </div>
</body>
</html>
""".strip()


def generate_legal_artifact_pdf(*, tenant_id: str, case_id: str) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        bundle = _get_case_bundle(db, tenant_id=tenant_id, case_id=case_id)
        case = bundle.discharge_case
        workflow = bundle.workflow

        _apply_escalation_automation(db, case=case, workflow=workflow)

        html_content = _render_legal_artifact_html(case, workflow)
        file_name = f"legal_discharge_artifact_{case.id}.pdf"
        output_path = GENERATED_LEGAL_ARTIFACTS_DIR / file_name
        render_result = render_html_to_pdf(
            html_content=html_content,
            output_path=output_path,
            title="Legal Discharge Artifact",
        )

        case.pdf_file = file_name
        case.updated_at = _utc_now()
        db.commit()

        return {
            "case_id": case.id,
            "file_name": file_name,
            "file_path": str(output_path),
            "renderer": render_result,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def finalize_legal_artifact(
    *,
    tenant_id: str,
    case_id: str,
    actor_user_id: str,
    confirm_all_sections_complete: bool,
) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        bundle = _get_case_bundle(db, tenant_id=tenant_id, case_id=case_id)
        case = bundle.discharge_case
        workflow = bundle.workflow

        _ensure_not_finalized(case)

        if not confirm_all_sections_complete:
            raise ValueError("Final review confirmation is required")

        missing = _validate_requirements(case, workflow)
        if missing:
            raise ValueError("Incomplete legal artifact; missing requirements: " + ", ".join(missing))

        status_snapshot = _status_payload(case, workflow)
        digest_input = json.dumps(status_snapshot, ensure_ascii=False, sort_keys=True).encode("utf-8")
        final_hash = hashlib.sha256(digest_input).hexdigest()

        case.finalized_hash = final_hash
        case.finalized_at = _utc_now()
        case.immutable_lock = True
        case.status = "SIGNED_OR_VERIFIED"
        workflow.status = "closed"
        workflow.current_stage = "closed"
        workflow.closed_at = _utc_now()

        _append_immutable_audit(
            case,
            action="finalize_artifact",
            user_id=actor_user_id,
            details={"final_hash": final_hash},
        )

        _write_audit(
            db,
            tenant_id=tenant_id,
            user_id=actor_user_id,
            case_id=case.id,
            action="legal_artifact_finalized",
            details=f"Artifact finalized with immutable hash {final_hash}",
        )

        db.commit()
        return _status_payload(case, workflow)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
