from __future__ import annotations

import uuid

import backend.models  # noqa: F401
from backend.core.database import SessionLocal
from backend.models.assignment_rule import AssignmentRule
from backend.models.workflow_stage import WorkflowStage
from backend.models.workflow_transition import WorkflowTransition
from backend.workflow.constants import ActionCode, StageCode


STAGES = [
    (StageCode.NURSE_DRAFT, "Nurse Draft", "مسودة التمريض", "intake", 1, False),
    (StageCode.PENDING_PHYSICIAN_ORDER, "Pending Physician Order", "بانتظار أمر الطبيب", "core", 2, False),
    (StageCode.PENDING_PATIENT_SIGNATURE, "Pending Patient Signature", "بانتظار توقيع المريض", "core", 3, False),
    (StageCode.ACCEPTED_DISCHARGE_EXECUTION, "Accepted Discharge Execution", "تنفيذ خطة الخروج المقبولة", "execution", 4, False),
    (StageCode.PATIENT_RELATIONS_REVIEW, "Patient Relations Review", "مراجعة علاقات المرضى", "escalation", 5, False),
    (StageCode.SOCIAL_WORK_REVIEW, "Social Work Review", "مراجعة الخدمة الاجتماعية", "escalation", 6, False),
    (StageCode.FINANCE_REVIEW, "Finance Review", "مراجعة المالية", "escalation", 7, False),
    (StageCode.LEGAL_ESCALATION, "Legal Escalation", "تصعيد قانوني", "escalation", 8, False),
    (StageCode.CLOSED, "Closed", "مغلقة", "terminal", 9, True),
    (StageCode.CANCELLED, "Cancelled", "ملغاة", "terminal", 10, True),
]


TRANSITIONS = [
    (StageCode.NURSE_DRAFT, ActionCode.CREATE_CASE, StageCode.PENDING_PHYSICIAN_ORDER, False, None),
    (StageCode.PENDING_PHYSICIAN_ORDER, ActionCode.ISSUE_DISCHARGE_ORDER, StageCode.PENDING_PATIENT_SIGNATURE, False, "doctor"),
    (StageCode.PENDING_PATIENT_SIGNATURE, ActionCode.PATIENT_ACCEPTS, StageCode.ACCEPTED_DISCHARGE_EXECUTION, False, None),
    (StageCode.PENDING_PATIENT_SIGNATURE, ActionCode.PATIENT_REFUSES, StageCode.PATIENT_RELATIONS_REVIEW, True, None),
    (StageCode.PATIENT_RELATIONS_REVIEW, ActionCode.COMPLETE_PATIENT_RELATIONS, StageCode.SOCIAL_WORK_REVIEW, True, "patient_affairs"),
    (StageCode.SOCIAL_WORK_REVIEW, ActionCode.COMPLETE_SOCIAL_WORK, StageCode.FINANCE_REVIEW, True, "social_services"),
    (StageCode.FINANCE_REVIEW, ActionCode.COMPLETE_FINANCE, StageCode.LEGAL_ESCALATION, True, "finance"),
    (StageCode.ACCEPTED_DISCHARGE_EXECUTION, ActionCode.CLOSE_CASE, StageCode.CLOSED, False, None),
    (StageCode.LEGAL_ESCALATION, ActionCode.CLOSE_LEGAL_ESCALATION, StageCode.CLOSED, False, "legal_admin"),
]


ASSIGNMENT_RULES = [
    (
        "assign_physician_order_to_attending_physician",
        "case_created",
        StageCode.PENDING_PHYSICIAN_ORDER,
        "physician",
        "medical",
        "doctor",
        None,
        "medical",
        "doctor",
    ),
    (
        "assign_patient_relations_stage_to_patient_relations_team",
        "patient_refused",
        StageCode.PATIENT_RELATIONS_REVIEW,
        "patient_relations",
        "patient_relations",
        "patient_affairs",
        None,
        "patient_relations",
        "patient_affairs",
    ),
    (
        "assign_social_work_stage_to_social_work_team",
        "stage_task_completed",
        StageCode.SOCIAL_WORK_REVIEW,
        "social_work",
        "social_services",
        "social_services",
        None,
        "social_services",
        "social_services",
    ),
    (
        "assign_finance_stage_to_finance_team",
        "stage_task_completed",
        StageCode.FINANCE_REVIEW,
        "finance",
        "finance",
        "finance",
        None,
        "finance",
        "finance",
    ),
    (
        "assign_legal_stage_to_legal_team",
        "case_escalated",
        StageCode.LEGAL_ESCALATION,
        "legal",
        "legal_affairs",
        "legal_admin",
        None,
        "compliance",
        "compliance",
    ),
]


def seed() -> None:
    db = SessionLocal()
    try:
        for code, name_en, name_ar, category, sort_order, is_terminal in STAGES:
            existing = db.query(WorkflowStage).filter(WorkflowStage.code == code).first()
            if existing:
                existing.name_en = name_en
                existing.name_ar = name_ar
                existing.category = category
                existing.sort_order = sort_order
                existing.is_terminal = is_terminal
            else:
                db.add(
                    WorkflowStage(
                        id=str(uuid.uuid4()),
                        code=code,
                        name_en=name_en,
                        name_ar=name_ar,
                        category=category,
                        sort_order=sort_order,
                        is_terminal=is_terminal,
                    )
                )

        for from_stage, action_code, to_stage, requires_comment, requires_role in TRANSITIONS:
            existing = (
                db.query(WorkflowTransition)
                .filter(
                    WorkflowTransition.from_stage_code == from_stage,
                    WorkflowTransition.action_code == action_code,
                )
                .first()
            )
            if existing:
                existing.to_stage_code = to_stage
                existing.requires_comment = requires_comment
                existing.requires_role = requires_role
            else:
                db.add(
                    WorkflowTransition(
                        id=str(uuid.uuid4()),
                        from_stage_code=from_stage,
                        action_code=action_code,
                        to_stage_code=to_stage,
                        requires_comment=requires_comment,
                        requires_role=requires_role,
                    )
                )

        for (
            rule_code,
            event_code,
            stage_code,
            team_code,
            department_code,
            role_code,
            target_user_id,
            escalation_department_code,
            escalation_role_code,
        ) in ASSIGNMENT_RULES:
            existing = db.query(AssignmentRule).filter(AssignmentRule.rule_code == rule_code).first()
            if existing:
                existing.event_code = event_code
                existing.target_stage_code = stage_code
                existing.target_team_code = team_code
                existing.target_department_code = department_code
                existing.target_role_code = role_code
                existing.target_user_id = target_user_id
                existing.escalation_department_code = escalation_department_code
                existing.escalation_role_code = escalation_role_code
                existing.active = True
            else:
                db.add(
                    AssignmentRule(
                        id=str(uuid.uuid4()),
                        rule_code=rule_code,
                        event_code=event_code,
                        target_stage_code=stage_code,
                        target_team_code=team_code,
                        target_department_code=department_code,
                        target_role_code=role_code,
                        target_user_id=target_user_id,
                        escalation_department_code=escalation_department_code,
                        escalation_role_code=escalation_role_code,
                        active=True,
                    )
                )

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Workflow stages, transitions, and assignment rules seeded successfully")
