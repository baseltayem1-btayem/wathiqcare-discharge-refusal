from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from backend.core.database import SessionLocal
from backend.models.audit_log import AuditLog
from backend.models.discharge_case import DischargeCase
from backend.models.discharge_workflow import DischargeRefusalWorkflow
from backend.models.patient import Patient


LEGAL_ESCALATION_DIR = Path("backend/generated/legal_escalation")
LEGAL_ESCALATION_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_PRIORITIES = {"low", "medium", "high", "critical"}


def _utc_now() -> datetime:
    return datetime.utcnow()


def _iso(value: Optional[datetime]) -> Optional[str]:
    if not value:
        return None
    return value.isoformat()


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized).replace(tzinfo=None)
    except Exception:
        return None


def _record_path(case_id: str) -> Path:
    return LEGAL_ESCALATION_DIR / f"{case_id}.json"


def _load_record(case_id: str) -> Dict[str, Any]:
    path = _record_path(case_id)
    if not path.exists():
        return {}

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_record(case_id: str, payload: Dict[str, Any]) -> None:
    payload["updated_at"] = _iso(_utc_now())
    _record_path(case_id).write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")


def _append_record_note(record: Dict[str, Any], note_payload: Dict[str, Any]) -> None:
    notes = record.get("notes")
    if not isinstance(notes, list):
        notes = []
    notes.append(note_payload)
    record["notes"] = notes


def _write_audit(
    db,
    *,
    tenant_id: str,
    user_id: str,
    case_id: str,
    action: str,
    details: str,
) -> None:
    event = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        entity_type="discharge_case",
        entity_id=case_id,
        action=action,
        details=details,
        created_at=_utc_now(),
    )
    db.add(event)


def _find_case_bundle(db, *, tenant_id: str, case_id: str) -> Tuple[DischargeCase, Patient, DischargeRefusalWorkflow]:
    row = (
        db.query(DischargeCase, Patient, DischargeRefusalWorkflow)
        .join(Patient, Patient.id == DischargeCase.patient_id)
        .join(DischargeRefusalWorkflow, DischargeRefusalWorkflow.case_id == DischargeCase.id)
        .filter(
            DischargeCase.tenant_id == tenant_id,
            DischargeCase.id == case_id,
            DischargeRefusalWorkflow.tenant_id == tenant_id,
        )
        .first()
    )
    if not row:
        raise ValueError("Case not found")
    return row


def _default_record(
    *,
    case_id: str,
    patient_name: str,
    refusal_reason: str,
    escalated_at: Optional[datetime],
    assigned_counsel: Optional[str] = None,
) -> Dict[str, Any]:
    now_iso = _iso(_utc_now())
    return {
        "case_id": case_id,
        "patient_name": patient_name,
        "reason": refusal_reason or "Patient discharge refusal",
        "status": "active",
        "priority": "medium",
        "risk_level": None,
        "assigned_counsel": assigned_counsel,
        "follow_up_date": None,
        "escalated_at": _iso(escalated_at) or now_iso,
        "resolved_at": None,
        "resolution_notes": None,
        "notes": [],
        "created_at": now_iso,
        "updated_at": now_iso,
    }


def _ensure_record(
    *,
    case_id: str,
    patient_name: str,
    refusal_reason: str,
    escalated_at: Optional[datetime],
    assigned_counsel: Optional[str] = None,
) -> Dict[str, Any]:
    existing = _load_record(case_id)
    if existing:
        return existing
    created = _default_record(
        case_id=case_id,
        patient_name=patient_name,
        refusal_reason=refusal_reason,
        escalated_at=escalated_at,
        assigned_counsel=assigned_counsel,
    )
    _save_record(case_id, created)
    return created


def _serialize_case(
    *,
    case: DischargeCase,
    patient: Patient,
    workflow: DischargeRefusalWorkflow,
    record: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "id": case.id,
        "caseId": case.id,
        "caseNumber": case.id,
        "patientName": patient.full_name,
        "status": str(record.get("status") or "active"),
        "priority": str(record.get("priority") or "medium"),
        "escalatedAt": str(record.get("escalated_at") or _iso(workflow.escalated_at) or _iso(_utc_now())),
        "assignedCounsel": record.get("assigned_counsel"),
        "reason": str(record.get("reason") or workflow.refusal_reason or case.refusal_reason or "Patient discharge refusal"),
        "riskLevel": record.get("risk_level"),
        "followUpDate": record.get("follow_up_date"),
        "resolvedAt": record.get("resolved_at"),
        "resolutionNotes": record.get("resolution_notes"),
        "notes": record.get("notes") if isinstance(record.get("notes"), list) else [],
    }


def list_escalation_cases(*, tenant_id: str) -> List[Dict[str, Any]]:
    db = SessionLocal()
    try:
        rows = (
            db.query(DischargeCase, Patient, DischargeRefusalWorkflow)
            .join(Patient, Patient.id == DischargeCase.patient_id)
            .join(DischargeRefusalWorkflow, DischargeRefusalWorkflow.case_id == DischargeCase.id)
            .filter(
                DischargeCase.tenant_id == tenant_id,
                DischargeRefusalWorkflow.tenant_id == tenant_id,
            )
            .order_by(DischargeRefusalWorkflow.updated_at.desc())
            .all()
        )

        items: List[Dict[str, Any]] = []
        for case, patient, workflow in rows:
            if not workflow.escalated_at and workflow.status != "escalated":
                continue

            record = _ensure_record(
                case_id=case.id,
                patient_name=patient.full_name,
                refusal_reason=workflow.refusal_reason or case.refusal_reason or "",
                escalated_at=workflow.escalated_at,
                assigned_counsel=workflow.responsible_person,
            )
            items.append(
                _serialize_case(
                    case=case,
                    patient=patient,
                    workflow=workflow,
                    record=record,
                )
            )

        return items
    finally:
        db.close()


def get_escalation_case_detail(*, tenant_id: str, case_id: str) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        case, patient, workflow = _find_case_bundle(db, tenant_id=tenant_id, case_id=case_id)
        if not workflow.escalated_at and workflow.status != "escalated":
            raise ValueError("Case is not escalated")

        record = _ensure_record(
            case_id=case.id,
            patient_name=patient.full_name,
            refusal_reason=workflow.refusal_reason or case.refusal_reason or "",
            escalated_at=workflow.escalated_at,
            assigned_counsel=workflow.responsible_person,
        )

        history = (
            db.query(AuditLog)
            .filter(
                AuditLog.tenant_id == tenant_id,
                AuditLog.entity_type == "discharge_case",
                AuditLog.entity_id == case_id,
                AuditLog.action.in_(
                    [
                        "escalate_legal_compliance",
                        "record_compliance_review",
                        "record_legal_review",
                        "close_under_review",
                        "legal_escalation_assigned",
                        "legal_escalation_note_added",
                        "legal_escalation_priority_updated",
                        "legal_escalation_resolved",
                    ]
                ),
            )
            .order_by(AuditLog.created_at.desc())
            .all()
        )

        response = _serialize_case(case=case, patient=patient, workflow=workflow, record=record)
        response["auditTrail"] = [
            {
                "action": item.action,
                "details": item.details,
                "timestamp": _iso(item.created_at),
            }
            for item in history
        ]
        return response
    finally:
        db.close()


def assign_escalation_case(
    *,
    tenant_id: str,
    case_id: str,
    assigned_counsel: str,
    follow_up_date: Optional[str],
    current_user: Dict[str, Any],
) -> Dict[str, Any]:
    cleaned_counsel = (assigned_counsel or "").strip()
    if not cleaned_counsel:
        raise ValueError("assigned_counsel is required")

    parsed_follow_up = _parse_iso(follow_up_date) if follow_up_date else None
    if follow_up_date and not parsed_follow_up:
        raise ValueError("follow_up_date must be ISO datetime")

    db = SessionLocal()
    try:
        case, patient, workflow = _find_case_bundle(db, tenant_id=tenant_id, case_id=case_id)
        record = _ensure_record(
            case_id=case.id,
            patient_name=patient.full_name,
            refusal_reason=workflow.refusal_reason or case.refusal_reason or "",
            escalated_at=workflow.escalated_at,
            assigned_counsel=cleaned_counsel,
        )

        record["assigned_counsel"] = cleaned_counsel
        record["follow_up_date"] = _iso(parsed_follow_up) if parsed_follow_up else None
        _save_record(case_id, record)

        workflow.responsible_department = "Legal / Compliance"
        workflow.responsible_person = cleaned_counsel
        workflow.updated_at = _utc_now()

        _write_audit(
            db,
            tenant_id=tenant_id,
            user_id=current_user["id"],
            case_id=case_id,
            action="legal_escalation_assigned",
            details=f"Escalation assigned to {cleaned_counsel}",
        )
        db.commit()
        return get_escalation_case_detail(tenant_id=tenant_id, case_id=case_id)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def add_escalation_note(
    *,
    tenant_id: str,
    case_id: str,
    note: str,
    note_type: str,
    current_user: Dict[str, Any],
) -> Dict[str, Any]:
    clean_note = (note or "").strip()
    if not clean_note:
        raise ValueError("note is required")

    note_kind = (note_type or "general").strip().lower()

    db = SessionLocal()
    try:
        case, patient, workflow = _find_case_bundle(db, tenant_id=tenant_id, case_id=case_id)
        record = _ensure_record(
            case_id=case.id,
            patient_name=patient.full_name,
            refusal_reason=workflow.refusal_reason or case.refusal_reason or "",
            escalated_at=workflow.escalated_at,
            assigned_counsel=workflow.responsible_person,
        )

        note_payload = {
            "id": f"note-{int(_utc_now().timestamp() * 1000)}",
            "caseId": case_id,
            "note": clean_note,
            "author": current_user.get("email") or current_user["id"],
            "authorRole": current_user.get("role"),
            "createdAt": _iso(_utc_now()),
            "noteType": note_kind,
        }
        _append_record_note(record, note_payload)
        _save_record(case_id, record)

        if note_kind == "compliance":
            existing = (workflow.compliance_notes or "").strip()
            workflow.compliance_notes = f"{existing}\n{clean_note}".strip() if existing else clean_note
        elif note_kind == "legal":
            existing = (workflow.legal_notes or "").strip()
            workflow.legal_notes = f"{existing}\n{clean_note}".strip() if existing else clean_note

        workflow.updated_at = _utc_now()
        _write_audit(
            db,
            tenant_id=tenant_id,
            user_id=current_user["id"],
            case_id=case_id,
            action="legal_escalation_note_added",
            details=f"[{note_kind}] {clean_note}",
        )
        db.commit()
        return note_payload
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def update_escalation_priority(
    *,
    tenant_id: str,
    case_id: str,
    priority: str,
    current_user: Dict[str, Any],
) -> Dict[str, Any]:
    normalized = (priority or "").strip().lower()
    if normalized not in ALLOWED_PRIORITIES:
        raise ValueError("priority must be one of: low, medium, high, critical")

    db = SessionLocal()
    try:
        case, patient, workflow = _find_case_bundle(db, tenant_id=tenant_id, case_id=case_id)
        record = _ensure_record(
            case_id=case.id,
            patient_name=patient.full_name,
            refusal_reason=workflow.refusal_reason or case.refusal_reason or "",
            escalated_at=workflow.escalated_at,
            assigned_counsel=workflow.responsible_person,
        )

        record["priority"] = normalized
        _save_record(case_id, record)

        workflow.updated_at = _utc_now()
        _write_audit(
            db,
            tenant_id=tenant_id,
            user_id=current_user["id"],
            case_id=case_id,
            action="legal_escalation_priority_updated",
            details=f"Priority updated to {normalized}",
        )
        db.commit()
        return get_escalation_case_detail(tenant_id=tenant_id, case_id=case_id)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def resolve_escalation_case(
    *,
    tenant_id: str,
    case_id: str,
    resolution_notes: str,
    close_case: bool,
    current_user: Dict[str, Any],
) -> Dict[str, Any]:
    notes = (resolution_notes or "").strip()
    if not notes:
        raise ValueError("resolution_notes is required")

    db = SessionLocal()
    try:
        case, patient, workflow = _find_case_bundle(db, tenant_id=tenant_id, case_id=case_id)
        record = _ensure_record(
            case_id=case.id,
            patient_name=patient.full_name,
            refusal_reason=workflow.refusal_reason or case.refusal_reason or "",
            escalated_at=workflow.escalated_at,
            assigned_counsel=workflow.responsible_person,
        )

        now = _utc_now()
        record["status"] = "resolved"
        record["resolved_at"] = _iso(now)
        record["resolution_notes"] = notes
        _save_record(case_id, record)

        workflow.legal_notes = f"{(workflow.legal_notes or '').strip()}\nResolution: {notes}".strip()
        if close_case:
            workflow.current_stage = "closed"
            workflow.status = "closed"
            workflow.case_status = "Closed - Administrative / Legal Action"
            workflow.closed_at = now
            case.status = "ARCHIVED"
        workflow.updated_at = now

        _write_audit(
            db,
            tenant_id=tenant_id,
            user_id=current_user["id"],
            case_id=case_id,
            action="legal_escalation_resolved",
            details=f"Escalation resolved. close_case={close_case}. Notes: {notes}",
        )
        db.commit()
        return get_escalation_case_detail(tenant_id=tenant_id, case_id=case_id)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()