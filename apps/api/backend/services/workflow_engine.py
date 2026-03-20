from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from contextlib import contextmanager
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.core.logging_config import get_logger
from backend.models.assignment_rule import AssignmentRule
from backend.models.discharge_case import DischargeCase
from backend.models.discharge_execution_item import DischargeExecutionItem
from backend.models.workflow_stage import WorkflowStage
from backend.models.workflow_task import WorkflowTask
from backend.models.workflow_transition import WorkflowTransition
from backend.services.audit_service import AuditService
from backend.services.notification_service import NotificationService
from backend.services.task_service import TaskService
from backend.workflow.constants import (
    ActionCode,
    CaseStatus,
    DEFAULT_ROLE_BY_STAGE,
    DEFAULT_SLA_BY_STAGE,
    DEFAULT_TEAM_BY_STAGE,
    EventCode,
    StageCode,
)

logger = get_logger(__name__)


@dataclass
class AssignmentTarget:
    assigned_user_id: Optional[str] = None
    assigned_team_code: Optional[str] = None
    assigned_role_code: Optional[str] = None


class WorkflowEngineService:
    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditService(db)
        self.tasks = TaskService(db)
        self.notifications = NotificationService(db)

    def _now(self) -> datetime:
        return datetime.utcnow()

    def _json_safe(self, value: Any) -> Any:
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, dict):
            return {str(key): self._json_safe(item) for key, item in value.items()}
        if isinstance(value, list):
            return [self._json_safe(item) for item in value]
        if isinstance(value, tuple):
            return [self._json_safe(item) for item in value]
        return value

    @contextmanager
    def _tx(self):
        if self.db.in_transaction():
            with self.db.begin_nested():
                yield
        else:
            with self.db.begin():
                yield

    def _ensure_case(self, case_id: str, tenant_id: Optional[str] = None) -> DischargeCase:
        query = self.db.query(DischargeCase).filter(DischargeCase.id == case_id)
        if tenant_id:
            query = query.filter(DischargeCase.tenant_id == tenant_id)
        case = query.first()
        if not case:
            raise ValueError("Case not found")
        return case

    def _resolve_transition(self, from_stage_code: str, action_code: str) -> WorkflowTransition:
        transition = (
            self.db.query(WorkflowTransition)
            .filter(
                WorkflowTransition.from_stage_code == from_stage_code,
                WorkflowTransition.action_code == action_code,
            )
            .first()
        )
        if not transition:
            raise ValueError(f"Invalid transition: {from_stage_code} --{action_code}--> ?")
        return transition

    def _validate_required_role(self, transition: WorkflowTransition, actor_role: Optional[str]) -> None:
        if transition.requires_role and transition.requires_role != actor_role:
            raise ValueError(f"Action requires role: {transition.requires_role}")

    def _ensure_stage_seeded(self, code: str) -> None:
        stage = self.db.query(WorkflowStage).filter(WorkflowStage.code == code).first()
        if not stage:
            raise ValueError(f"Workflow stage not seeded: {code}")

    def _resolve_assignment(self, *, event_code: str, stage_code: str, case: DischargeCase) -> AssignmentTarget:
        rules = (
            self.db.query(AssignmentRule)
            .filter(
                AssignmentRule.event_code == event_code,
                AssignmentRule.active.is_(True),
            )
            .all()
        )
        for rule in rules:
            if rule.target_stage_code and rule.target_stage_code != stage_code:
                continue
            return AssignmentTarget(
                assigned_user_id=case.attending_physician_user_id if stage_code == StageCode.PENDING_PHYSICIAN_ORDER else None,
                assigned_team_code=rule.target_team_code or DEFAULT_TEAM_BY_STAGE.get(stage_code),
                assigned_role_code=rule.target_role_code or DEFAULT_ROLE_BY_STAGE.get(stage_code),
            )

        return AssignmentTarget(
            assigned_user_id=case.attending_physician_user_id if stage_code == StageCode.PENDING_PHYSICIAN_ORDER else None,
            assigned_team_code=DEFAULT_TEAM_BY_STAGE.get(stage_code),
            assigned_role_code=DEFAULT_ROLE_BY_STAGE.get(stage_code),
        )

    def _make_case_number(self) -> str:
        stamp = self._now().strftime("%Y%m%d")
        sequence = self.db.query(DischargeCase).count() + 1
        return f"WC-{stamp}-{sequence:04d}"

    def _transition_case(
        self,
        *,
        case: DischargeCase,
        action_code: str,
        actor_user_id: str,
        actor_role: Optional[str],
        event_type: str,
        event_title: str,
        event_details: Optional[str] = None,
        metadata_json: Optional[Dict[str, Any]] = None,
        next_task_code: Optional[str] = None,
        next_task_title: Optional[str] = None,
        next_task_description: Optional[str] = None,
    ) -> Optional[WorkflowTask]:
        transition = self._resolve_transition(case.current_stage_code, action_code)
        self._validate_required_role(transition, actor_role)
        self._ensure_stage_seeded(transition.to_stage_code)

        previous_stage = case.current_stage_code
        self.tasks.close_open_tasks_for_stage(
            case_id=case.id,
            stage_code=previous_stage,
            actor_user_id=actor_user_id,
        )

        case.current_stage_code = transition.to_stage_code
        case.updated_at = self._now()

        task: Optional[WorkflowTask] = None
        if next_task_code and next_task_title:
            assignment = self._resolve_assignment(
                event_code=event_type,
                stage_code=transition.to_stage_code,
                case=case,
            )
            due_delta = DEFAULT_SLA_BY_STAGE.get(transition.to_stage_code)
            due_at = self._now() + due_delta if due_delta else None
            task = self.tasks.create_task(
                case_id=case.id,
                stage_code=transition.to_stage_code,
                task_code=next_task_code,
                title=next_task_title,
                description=next_task_description,
                assigned_user_id=assignment.assigned_user_id,
                assigned_team_code=assignment.assigned_team_code,
                assigned_role_code=assignment.assigned_role_code,
                due_at=due_at,
                metadata_json=self._json_safe(metadata_json),
            )

            self.notifications.notify_task_assigned(
                case_id=case.id,
                task_id=task.id,
                recipient_user_id=task.assigned_user_id,
                recipient_team_code=task.assigned_team_code,
                title=next_task_title,
                body=next_task_description or next_task_title,
            )

        self.notifications.notify_stage_changed(
            case_id=case.id,
            recipient_team_code=DEFAULT_TEAM_BY_STAGE.get(transition.to_stage_code),
            title="Workflow Stage Updated",
            body=f"Case moved from {previous_stage} to {transition.to_stage_code}",
        )

        self.audit.log(
            case_id=case.id,
            task_id=task.id if task else None,
            actor_user_id=actor_user_id,
            event_type=event_type,
            event_title=event_title,
            event_details=event_details,
            metadata_json=self._json_safe(
                {
                    "from_stage": previous_stage,
                    "to_stage": transition.to_stage_code,
                    **(metadata_json or {}),
                }
            ),
        )

        return task

    def create_case(
        self,
        *,
        tenant_id: str,
        created_by: str,
        patient_id: str,
        patient_name: str,
        mrn: str,
        room_number: Optional[str],
        department: Optional[str],
        attending_physician_user_id: Optional[str],
        attending_physician_name: Optional[str],
        discharge_plan_summary: Optional[str],
    ) -> DischargeCase:
        with self._tx():
            case = DischargeCase(
                tenant_id=tenant_id,
                case_number=self._make_case_number(),
                patient_id=patient_id,
                patient_name=patient_name,
                mrn=mrn,
                room_number=room_number,
                department=department,
                attending_physician_user_id=attending_physician_user_id,
                attending_physician_name=attending_physician_name,
                current_stage_code=StageCode.NURSE_DRAFT,
                status=CaseStatus.ACTIVE,
                discharge_plan_summary=discharge_plan_summary,
                created_by=created_by,
            )
            self.db.add(case)
            self.db.flush()

            task = self._transition_case(
                case=case,
                action_code=ActionCode.CREATE_CASE,
                actor_user_id=created_by,
                actor_role=None,
                event_type=EventCode.CASE_CREATED,
                event_title="Case Created",
                event_details="Discharge workflow case created and routed to physician.",
                next_task_code="physician_issue_order",
                next_task_title="Issue discharge order",
                next_task_description="Physician must issue discharge order for patient acknowledgment.",
            )

            if task and case.attending_physician_user_id:
                self.notifications.create_in_app_notification(
                    case_id=case.id,
                    task_id=task.id,
                    recipient_user_id=case.attending_physician_user_id,
                    recipient_team_code=None,
                    notification_type="physician_task_created",
                    title="Discharge case assigned",
                    body=f"Case {case.case_number} assigned for discharge order.",
                )

            return case

    def issue_discharge_order(
        self,
        case_id: str,
        tenant_id: Optional[str],
        actor_user_id: str,
        actor_role: Optional[str],
        discharge_plan_payload: Dict[str, Any],
    ) -> DischargeCase:
        with self._tx():
            case = self._ensure_case(case_id, tenant_id)
            case.discharge_decision_date = discharge_plan_payload.get("discharge_decision_date") or self._now()
            case.discharge_plan_summary = discharge_plan_payload.get("discharge_plan_summary") or case.discharge_plan_summary

            self._transition_case(
                case=case,
                action_code=ActionCode.ISSUE_DISCHARGE_ORDER,
                actor_user_id=actor_user_id,
                actor_role=actor_role,
                event_type=EventCode.DISCHARGE_ORDER_ISSUED,
                event_title="Discharge Order Issued",
                event_details="Physician issued discharge order.",
                metadata_json={"payload": discharge_plan_payload},
                next_task_code="nurse_request_patient_signature",
                next_task_title="Request patient signature",
                next_task_description="Nurse sends discharge order for patient acknowledgment.",
            )
            return case

    def send_to_patient_for_signature(
        self,
        case_id: str,
        tenant_id: Optional[str],
        actor_user_id: str,
        email: str,
        language: str,
    ) -> DischargeCase:
        with self._tx():
            case = self._ensure_case(case_id, tenant_id)
            self.audit.log(
                case_id=case.id,
                task_id=None,
                actor_user_id=actor_user_id,
                event_type=EventCode.PATIENT_SIGNATURE_REQUESTED,
                event_title="Patient Signature Requested",
                event_details=f"Patient signature requested via {email}",
                metadata_json={"email": email, "language": language},
            )
            logger.info(
                "REQUEST PATIENT SIGNATURE NOTIFICATION CALL",
                extra={
                    "case_id": case.id,
                    "tenant_id": case.tenant_id,
                    "recipient_email": email,
                    "language": language,
                },
            )
            self.notifications.send_email_notification(
                tenant_id=case.tenant_id,
                created_by=actor_user_id,
                case_id=case.id,
                recipient_email=email,
                title="Discharge acknowledgment request",
                body="Please review and acknowledge your discharge order.",
                metadata_json={"language": language},
            )
            logger.info(
                "REQUEST PATIENT SIGNATURE NOTIFICATION SENT",
                extra={
                    "case_id": case.id,
                    "tenant_id": case.tenant_id,
                    "recipient_email": email,
                },
            )
            return case

    def mark_patient_accepted(
        self,
        case_id: str,
        tenant_id: Optional[str],
        actor_user_id: str,
        actor_role: Optional[str],
        response_payload: Dict[str, Any],
    ) -> DischargeCase:
        with self._tx():
            case = self._ensure_case(case_id, tenant_id)
            case.accepted_at = self._now()
            case.refused_at = None
            case.refusal_reason = None

            self._transition_case(
                case=case,
                action_code=ActionCode.PATIENT_ACCEPTS,
                actor_user_id=actor_user_id,
                actor_role=actor_role,
                event_type=EventCode.PATIENT_ACCEPTED,
                event_title="Patient Accepted",
                event_details="Patient accepted discharge order.",
                metadata_json={"response_payload": response_payload},
            )

            execution_map = {
                "requires_home_healthcare": ("home_healthcare", "home_healthcare", "Coordinate home healthcare services"),
                "requires_medical_equipment": ("medical_equipment", "medical_equipment", "Arrange medical equipment and rentals"),
                "requires_transfer": ("transfer", "patient_affairs", "Coordinate transfer logistics"),
                "requires_extended_care": ("extended_care", "extended_care", "Coordinate extended care handoff"),
            }

            for flag, payload in execution_map.items():
                if not response_payload.get(flag):
                    continue
                item_type, team_code, description = payload
                execution_item = DischargeExecutionItem(
                    case_id=case.id,
                    item_type=item_type,
                    target_team_code=team_code,
                    description=description,
                    is_required=True,
                    is_completed=False,
                )
                self.db.add(execution_item)
                self.db.flush()

                task = self.tasks.create_task(
                    case_id=case.id,
                    stage_code=case.current_stage_code,
                    task_code=f"execution_{item_type}",
                    title=f"Discharge execution: {item_type}",
                    description=description,
                    assigned_team_code=team_code,
                    assigned_role_code=team_code,
                    due_at=self._now() + DEFAULT_SLA_BY_STAGE.get(StageCode.ACCEPTED_DISCHARGE_EXECUTION, timedelta(hours=24)),
                    metadata_json={"execution_item_id": execution_item.id},
                )

                self.notifications.notify_task_assigned(
                    case_id=case.id,
                    task_id=task.id,
                    recipient_user_id=None,
                    recipient_team_code=team_code,
                    title=task.title,
                    body=description,
                )

            return case

    def mark_patient_refused(
        self,
        case_id: str,
        tenant_id: Optional[str],
        actor_user_id: str,
        actor_role: Optional[str],
        response_payload: Dict[str, Any],
    ) -> DischargeCase:
        with self._tx():
            case = self._ensure_case(case_id, tenant_id)
            case.refused_at = self._now()
            case.accepted_at = None
            case.refusal_reason = response_payload.get("refusal_reason") or case.refusal_reason

            self._transition_case(
                case=case,
                action_code=ActionCode.PATIENT_REFUSES,
                actor_user_id=actor_user_id,
                actor_role=actor_role,
                event_type=EventCode.PATIENT_REFUSED,
                event_title="Patient Refused",
                event_details="Patient refused discharge order.",
                metadata_json={"response_payload": response_payload},
                next_task_code="patient_relations_review",
                next_task_title="Patient relations review",
                next_task_description="Patient relations to engage and attempt resolution.",
            )
            return case

    def complete_stage_task(
        self,
        case_id: str,
        tenant_id: Optional[str],
        stage_code: str,
        actor_user_id: str,
        actor_role: Optional[str],
        payload: Dict[str, Any],
    ) -> DischargeCase:
        action_by_stage = {
            StageCode.PATIENT_RELATIONS_REVIEW: ActionCode.COMPLETE_PATIENT_RELATIONS,
            StageCode.SOCIAL_WORK_REVIEW: ActionCode.COMPLETE_SOCIAL_WORK,
            StageCode.FINANCE_REVIEW: ActionCode.COMPLETE_FINANCE,
            StageCode.LEGAL_ESCALATION: ActionCode.CLOSE_LEGAL_ESCALATION,
        }
        task_title_by_stage = {
            StageCode.PATIENT_RELATIONS_REVIEW: ("social_work_review", "Social work review", "Route case to social work."),
            StageCode.SOCIAL_WORK_REVIEW: ("finance_review", "Finance review", "Route case to finance review."),
            StageCode.FINANCE_REVIEW: ("legal_escalation", "Legal escalation", "Route case to legal escalation."),
            StageCode.LEGAL_ESCALATION: (None, None, None),
        }

        if stage_code not in action_by_stage:
            raise ValueError("Unsupported stage completion")

        with self._tx():
            case = self._ensure_case(case_id, tenant_id)
            if case.current_stage_code != stage_code:
                raise ValueError("Case is not currently in provided stage")

            task_id = payload.get("task_id")
            if task_id:
                self.tasks.complete_task(task_id=task_id, actor_user_id=actor_user_id, comment=payload.get("comment"))

            next_task_code, next_task_title, next_task_desc = task_title_by_stage[stage_code]
            event_type = EventCode.STAGE_TASK_COMPLETED
            if stage_code == StageCode.FINANCE_REVIEW:
                event_type = EventCode.CASE_ESCALATED

            self._transition_case(
                case=case,
                action_code=action_by_stage[stage_code],
                actor_user_id=actor_user_id,
                actor_role=actor_role,
                event_type=event_type,
                event_title=f"{stage_code} completed",
                event_details=payload.get("comment"),
                metadata_json=payload,
                next_task_code=next_task_code,
                next_task_title=next_task_title,
                next_task_description=next_task_desc,
            )
            return case

    def close_case(self, case_id: str, tenant_id: Optional[str], actor_user_id: str, actor_role: Optional[str]) -> DischargeCase:
        with self._tx():
            case = self._ensure_case(case_id, tenant_id)

            if case.current_stage_code == StageCode.ACCEPTED_DISCHARGE_EXECUTION:
                incomplete_required = (
                    self.db.query(DischargeExecutionItem)
                    .filter(
                        DischargeExecutionItem.case_id == case_id,
                        DischargeExecutionItem.is_required.is_(True),
                        DischargeExecutionItem.is_completed.is_(False),
                    )
                    .count()
                )
                if incomplete_required > 0:
                    raise ValueError("Cannot close case before completing required discharge execution tasks")
                action = ActionCode.CLOSE_CASE
            elif case.current_stage_code == StageCode.LEGAL_ESCALATION:
                action = ActionCode.CLOSE_LEGAL_ESCALATION
            else:
                raise ValueError("Case can only be closed from accepted discharge execution or legal escalation stage")

            self._transition_case(
                case=case,
                action_code=action,
                actor_user_id=actor_user_id,
                actor_role=actor_role,
                event_type=EventCode.CASE_CLOSED,
                event_title="Case Closed",
                event_details="Workflow case closed.",
            )
            case.status = CaseStatus.CLOSED
            case.updated_at = self._now()
            return case
