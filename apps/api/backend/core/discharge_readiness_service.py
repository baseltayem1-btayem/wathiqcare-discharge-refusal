from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.models.discharge_case import DischargeCase
from backend.models.discharge_workflow import DischargeRefusalWorkflow
from backend.models.workflow_task import WorkflowTask
from backend.workflow.constants import TaskStatus


DEPARTMENT_SPECS: Dict[str, Dict[str, Any]] = {
    "attending_physician": {
        "label": "Attending Physician",
        "team_code": "physician",
        "role_code": "doctor",
        "required_action": "Issue final discharge order and medical sign-off.",
        "due_hours": 4,
        "dependency": None,
        "escalation_rule": "Escalate to medical director if overdue > 4h.",
        "mandatory": True,
    },
    "nursing": {
        "label": "Nursing",
        "team_code": "nursing",
        "role_code": "nursing",
        "required_action": "Confirm bedside discharge readiness and patient handover.",
        "due_hours": 6,
        "dependency": "attending_physician",
        "escalation_rule": "Escalate to head nurse if overdue > 6h.",
        "mandatory": True,
    },
    "pharmacy": {
        "label": "Pharmacy",
        "team_code": "pharmacy",
        "role_code": "pharmacy",
        "required_action": "Complete medication reconciliation and take-home meds.",
        "due_hours": 8,
        "dependency": "attending_physician",
        "escalation_rule": "Escalate to pharmacy supervisor if overdue > 8h.",
        "mandatory": True,
    },
    "laboratory": {
        "label": "Laboratory",
        "team_code": "laboratory",
        "role_code": "laboratory",
        "required_action": "Clear pending critical lab results before discharge.",
        "due_hours": 8,
        "dependency": "attending_physician",
        "escalation_rule": "Escalate to lab lead if overdue > 8h.",
        "mandatory": True,
    },
    "radiology": {
        "label": "Radiology",
        "team_code": "radiology",
        "role_code": "radiology",
        "required_action": "Clear radiology pending results when relevant.",
        "due_hours": 8,
        "dependency": "attending_physician",
        "escalation_rule": "Escalate to radiology lead if overdue > 8h.",
        "mandatory": False,
    },
    "billing_finance": {
        "label": "Billing / Finance",
        "team_code": "finance",
        "role_code": "finance",
        "required_action": "Complete billing and financial closure where required.",
        "due_hours": 12,
        "dependency": "nursing",
        "escalation_rule": "Escalate to finance manager if overdue > 12h.",
        "mandatory": True,
    },
    "case_management": {
        "label": "Case Management / Social Services",
        "team_code": "social_services",
        "role_code": "social_services",
        "required_action": "Finalize social services interventions and care transition plan.",
        "due_hours": 12,
        "dependency": "nursing",
        "escalation_rule": "Escalate to case-management lead if overdue > 12h.",
        "mandatory": True,
    },
    "patient_relations": {
        "label": "Patient Relations",
        "team_code": "patient_affairs",
        "role_code": "patient_affairs",
        "required_action": "Confirm patient education and communication completion.",
        "due_hours": 8,
        "dependency": "nursing",
        "escalation_rule": "Escalate to patient-relations manager if overdue > 8h.",
        "mandatory": True,
    },
    "legal_compliance": {
        "label": "Legal / Compliance",
        "team_code": "legal_admin",
        "role_code": "legal_admin",
        "required_action": "Review refusal/escalation legal acknowledgment and closure.",
        "due_hours": 24,
        "dependency": "billing_finance",
        "escalation_rule": "Escalate to legal/compliance lead at 24h and 48h.",
        "mandatory": False,
    },
}


def _now() -> datetime:
    return datetime.utcnow()


def _task_code(department_code: str) -> str:
    return f"department_clearance:{department_code}"


def _parse_json(raw: Optional[str]) -> Dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _screen(case: DischargeCase, name: str) -> Dict[str, Any]:
    legal_payload = _parse_json(case.legal_payload_json)
    screens = legal_payload.get("screens") if isinstance(legal_payload.get("screens"), dict) else {}
    data = screens.get(name)
    return data if isinstance(data, dict) else {}


def _requires_legal(workflow: DischargeRefusalWorkflow) -> bool:
    return bool(workflow.refusal_started_at or workflow.escalated_at)


def _requires_radiology(case: DischargeCase) -> bool:
    patient_interaction = _screen(case, "patient_interaction")
    final_review = _screen(case, "final_review")
    return bool(
        patient_interaction.get("radiology_required")
        or final_review.get("radiology_required")
    )


def _has_patient_signature(case: DischargeCase, workflow: DischargeRefusalWorkflow) -> bool:
    if case.patient_signature_hash or workflow.patient_signature or workflow.representative_signature:
        return True
    signatures = _parse_json(case.signature_context_json).get("signatures")
    return isinstance(signatures, dict) and ("patient" in signatures or "guardian" in signatures)


def _department_completion_map(case: DischargeCase, workflow: DischargeRefusalWorkflow) -> Dict[str, bool]:
    patient_interaction = _screen(case, "patient_interaction")
    risk_disclosure = _screen(case, "risk_disclosure")
    final_review = _screen(case, "final_review")

    pharmacy_required = bool(
        patient_interaction.get("requires_medication_reconciliation")
        or final_review.get("requires_medication_reconciliation")
    )
    pharmacy_done = bool(
        (not pharmacy_required)
        or patient_interaction.get("medication_reconciliation_completed")
        or final_review.get("medication_reconciliation_completed")
        or final_review.get("take_home_medications_ready")
    )

    lab_required = bool(
        patient_interaction.get("requires_lab_clearance")
        or final_review.get("requires_lab_clearance")
    )
    lab_done = bool(
        (not lab_required)
        or patient_interaction.get("lab_critical_results_cleared")
        or final_review.get("lab_critical_results_cleared")
    )
    radiology_required = _requires_radiology(case)
    radiology_done = bool(
        not radiology_required
        or patient_interaction.get("radiology_clearance_completed")
        or final_review.get("radiology_clearance_completed")
    )
    billing_done = bool(
        final_review.get("billing_clearance_completed")
        or workflow.financial_notice_generated_at
        or workflow.financial_notice_acknowledged
    )
    legal_done = bool(
        not _requires_legal(workflow)
        or final_review.get("legal_acknowledgment_completed")
        or workflow.closed_at
        or workflow.escalated_at
    )

    return {
        "attending_physician": bool(workflow.discharge_decision_at),
        "nursing": bool(
            _has_patient_signature(case, workflow)
            and (workflow.initial_communication_at or risk_disclosure.get("disclosed") is True)
        ),
        "pharmacy": pharmacy_done,
        "laboratory": lab_done,
        "radiology": radiology_done,
        "billing_finance": billing_done,
        "case_management": bool(workflow.social_services_referred_at or final_review.get("reviewer_name")),
        "patient_relations": bool(workflow.initial_communication_at or risk_disclosure.get("patient_acknowledged") is True),
        "legal_compliance": legal_done,
    }


def ensure_department_tasks(
    db: Session,
    *,
    case: DischargeCase,
    workflow: DischargeRefusalWorkflow,
    actor_user_id: Optional[str],
) -> List[WorkflowTask]:
    existing = (
        db.query(WorkflowTask)
        .filter(WorkflowTask.case_id == case.id, WorkflowTask.task_code.like("department_clearance:%"))
        .all()
    )
    by_code = {item.task_code: item for item in existing}
    created: List[WorkflowTask] = []
    now = _now()

    for department_code, spec in DEPARTMENT_SPECS.items():
        if department_code == "legal_compliance" and not _requires_legal(workflow):
            continue
        if department_code == "radiology" and not _requires_radiology(case):
            continue

        code = _task_code(department_code)
        if code in by_code:
            continue

        due_at = now + timedelta(hours=int(spec["due_hours"]))
        task = WorkflowTask(
            case_id=case.id,
            stage_code="department_orchestration",
            task_code=code,
            title=f"{spec['label']} Discharge Clearance",
            description=str(spec["required_action"]),
            assigned_user_id=None,
            assigned_team_code=str(spec["team_code"]),
            assigned_role_code=str(spec["role_code"]),
            status=TaskStatus.PENDING,
            priority="high" if spec["mandatory"] else "medium",
            due_at=due_at,
            metadata_json={
                "department_code": department_code,
                "required_action": spec["required_action"],
                "task_owner": spec["role_code"],
                "completion_dependency": spec["dependency"],
                "escalation_rule": spec["escalation_rule"],
                "mandatory": bool(spec["mandatory"]),
                "created_by": actor_user_id,
            },
        )
        db.add(task)
        created.append(task)

    if created:
        db.flush()
    return created


def sync_department_tasks(
    db: Session,
    *,
    case: DischargeCase,
    workflow: DischargeRefusalWorkflow,
    actor_user_id: Optional[str],
) -> None:
    ensure_department_tasks(db, case=case, workflow=workflow, actor_user_id=actor_user_id)
    completion_map = _department_completion_map(case, workflow)
    now = _now()

    rows = (
        db.query(WorkflowTask)
        .filter(WorkflowTask.case_id == case.id, WorkflowTask.task_code.like("department_clearance:%"))
        .all()
    )

    for task in rows:
        department_code = str(task.task_code).split(":", 1)[1]
        done = bool(completion_map.get(department_code))

        if done:
            task.status = TaskStatus.COMPLETED
            task.completed_at = task.completed_at or now
            task.completed_by = task.completed_by or actor_user_id
            task.updated_at = now
            continue

        if task.status == TaskStatus.COMPLETED:
            task.status = TaskStatus.PENDING
            task.completed_at = None
            task.completed_by = None

        if task.due_at and task.due_at < now:
            task.status = TaskStatus.OVERDUE
            task.escalation_level = max(int(task.escalation_level or 0), 1)
        elif task.status != TaskStatus.IN_PROGRESS:
            task.status = TaskStatus.PENDING

        task.updated_at = now


def build_case_readiness(
    db: Session,
    *,
    case: DischargeCase,
    workflow: DischargeRefusalWorkflow,
) -> Dict[str, Any]:
    rows = (
        db.query(WorkflowTask)
        .filter(WorkflowTask.case_id == case.id, WorkflowTask.task_code.like("department_clearance:%"))
        .order_by(WorkflowTask.created_at.asc())
        .all()
    )
    if not rows:
        sync_department_tasks(db, case=case, workflow=workflow, actor_user_id=None)
        rows = (
            db.query(WorkflowTask)
            .filter(WorkflowTask.case_id == case.id, WorkflowTask.task_code.like("department_clearance:%"))
            .order_by(WorkflowTask.created_at.asc())
            .all()
        )

    blocked_medical: List[str] = []
    blocked_legal: List[str] = []
    blocked_patient: List[str] = []
    overdue: List[str] = []

    panel: List[Dict[str, Any]] = []
    for task in rows:
        metadata = task.metadata_json if isinstance(task.metadata_json, dict) else {}
        department_code = str(metadata.get("department_code") or str(task.task_code).split(":", 1)[1])
        spec = DEPARTMENT_SPECS.get(department_code, {})
        mandatory = bool(metadata.get("mandatory", spec.get("mandatory", True)))
        state = "completed" if task.status == TaskStatus.COMPLETED else "pending"
        if task.status == TaskStatus.OVERDUE:
            state = "escalation"
        elif task.status == TaskStatus.IN_PROGRESS:
            state = "in_progress"

        if task.status != TaskStatus.COMPLETED and mandatory:
            if department_code in {"attending_physician", "nursing", "pharmacy", "laboratory", "radiology"}:
                blocked_medical.append(department_code)
            elif department_code == "legal_compliance":
                blocked_legal.append(department_code)
            elif department_code in {"patient_relations", "case_management"}:
                blocked_patient.append(department_code)

        if task.status == TaskStatus.OVERDUE:
            overdue.append(department_code)

        panel.append(
            {
                "department_code": department_code,
                "department": spec.get("label") or department_code,
                "required_action": metadata.get("required_action") or task.description,
                "task_owner": metadata.get("task_owner") or task.assigned_role_code,
                "task_status": task.status,
                "due_time": task.due_at.isoformat() if task.due_at else None,
                "completion_dependency": metadata.get("completion_dependency"),
                "escalation_rule": metadata.get("escalation_rule"),
                "pending_task": state in {"pending", "in_progress", "escalation"},
                "completed_task": state == "completed",
                "blocked_state": task.status != TaskStatus.COMPLETED and mandatory,
                "escalation_state": task.status == TaskStatus.OVERDUE,
            }
        )

    signatures = _parse_json(case.signature_context_json).get("signatures")
    signatures = signatures if isinstance(signatures, dict) else {}
    patient_ready = bool(
        case.patient_signature_hash
        or workflow.patient_signature
        or workflow.representative_signature
        or signatures.get("patient")
        or signatures.get("guardian")
    )
    physician_ready = bool(case.physician_signature_hash or signatures.get("physician"))
    witness_ready = bool(case.witness_signature_hash or signatures.get("witness"))
    guardian_required = str(case.capacity_status or "").strip().lower() == "lacks_capacity"
    guardian_ready = bool(case.guardian_signature_hash or signatures.get("guardian"))

    required_signatures = {
        "patient_or_representative": patient_ready,
        "physician": physician_ready,
        "witness": witness_ready,
        "guardian": (not guardian_required) or guardian_ready,
    }

    signature_blockers = [key for key, ok in required_signatures.items() if not ok]
    if signature_blockers:
        blocked_patient.append("required_signatures")

    if workflow.closed_at and not (blocked_medical or blocked_legal or blocked_patient):
        readiness_status = "completed"
    elif blocked_medical:
        readiness_status = "blocked_by_medical_tasks"
    elif blocked_legal:
        readiness_status = "blocked_by_legal_tasks"
    elif blocked_patient:
        readiness_status = "blocked_by_patient_interaction"
    elif overdue:
        readiness_status = "escalated"
    else:
        readiness_status = "ready_for_discharge"

    can_finalize = readiness_status in {"ready_for_discharge", "completed"}
    return {
        "status": readiness_status,
        "blocked_by_medical_tasks": blocked_medical,
        "blocked_by_legal_tasks": blocked_legal,
        "blocked_by_patient_interaction": blocked_patient,
        "escalated_departments": overdue,
        "required_signatures": required_signatures,
        "missing_signature_requirements": signature_blockers,
        "can_finalize": can_finalize,
        "department_panel": panel,
        "updated_at": _now().isoformat(),
    }
