from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, Optional

from backend.core.database import SessionLocal
from backend.core.discharge_workflow_service import POLICY_CASE_STATUSES
from backend.models.audit_log import AuditLog
from backend.models.discharge_case import DischargeCase
from backend.models.discharge_workflow import DischargeRefusalWorkflow
from backend.services.audit_service import AuditService


def _utc_now() -> datetime:
    return datetime.utcnow()


def _is_due_for_escalation(workflow: DischargeRefusalWorkflow, *, now: datetime) -> bool:
    if workflow.escalated_at or workflow.closed_at:
        return False
    if workflow.status not in {"active", "refusal_active"}:
        return False
    if not workflow.discharge_decision_at or not workflow.financial_notice_generated_at:
        return False

    due_at = workflow.escalation_due_at or (workflow.discharge_decision_at + timedelta(hours=24))
    return due_at <= now


def run_due_escalation_sweep(*, now: Optional[datetime] = None) -> Dict[str, int]:
    db = SessionLocal()
    current = now or _utc_now()
    results = {"scanned": 0, "escalated": 0}

    try:
        rows = (
            db.query(DischargeRefusalWorkflow, DischargeCase)
            .join(DischargeCase, DischargeCase.id == DischargeRefusalWorkflow.case_id)
            .filter(DischargeRefusalWorkflow.tenant_id == DischargeCase.tenant_id)
            .all()
        )

        for workflow, discharge_case in rows:
            results["scanned"] += 1
            if not _is_due_for_escalation(workflow, now=current):
                continue

            before_state = {
                "status": workflow.status,
                "case_status": workflow.case_status,
                "current_stage": workflow.current_stage,
                "escalated_at": workflow.escalated_at.isoformat() if workflow.escalated_at else None,
                "case_lifecycle_status": discharge_case.status,
            }

            workflow.escalated_at = current
            workflow.escalation_timestamp = current
            workflow.current_stage = "escalation"
            workflow.status = "escalated"
            workflow.case_status = POLICY_CASE_STATUSES["escalated_legal"]
            workflow.responsible_department = "Legal / Compliance"
            workflow.responsible_person = workflow.responsible_person or "System Scheduler"
            workflow.next_action = "Legal and compliance follow-up is in progress."
            workflow.updated_at = current
            discharge_case.status = "LEGAL_ESCALATED"

            db.add(
                AuditLog(
                    tenant_id=workflow.tenant_id,
                    user_id=discharge_case.created_by,
                    entity_type="discharge_case",
                    entity_id=discharge_case.id,
                    action="escalate_legal_compliance",
                    details="Case escalated automatically by scheduler after refusal persisted beyond 24 hours.",
                    created_at=current,
                )
            )

            AuditService(db).log(
                case_id=discharge_case.id,
                task_id=None,
                actor_user_id=discharge_case.created_by,
                event_type="workflow.auto_escalated",
                event_title="Case escalated automatically",
                event_details="Auto-escalated after financial notice remained unresolved beyond 24 hours.",
                metadata_json={
                    "trigger_source": "scheduler",
                    "before": before_state,
                    "after": {
                        "status": workflow.status,
                        "case_status": workflow.case_status,
                        "current_stage": workflow.current_stage,
                        "escalated_at": workflow.escalated_at.isoformat() if workflow.escalated_at else None,
                        "case_lifecycle_status": discharge_case.status,
                    },
                },
            )
            results["escalated"] += 1

        db.commit()
        return results
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()