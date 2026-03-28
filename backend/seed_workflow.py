from __future__ import annotations

import uuid

import backend.models  # noqa: F401
from backend.core.database import SessionLocal
from backend.models.assignment_rule import AssignmentRule
from backend.models.workflow_stage import WorkflowStage
from backend.models.workflow_transition import WorkflowTransition
from backend.workflow.constants import ActionCode, StageCode


STAGES = [
    ("draft", "Draft", "مسودة", "intake", 1, False),
    ("presentation", "Presentation", "عرض", "core", 2, False),
    ("signature", "Signature", "توقيع", "core", 3, False),
    ("witness", "Witness", "شاهد", "execution", 4, False),
    ("ready", "Ready", "جاهز", "escalation", 5, False),
    ("legal", "Legal", "قانوني", "escalation", 6, False),
]


TRANSITIONS = [
    ("draft", "to_presentation", "presentation", False, "nurse"),
    ("presentation", "to_signature", "signature", False, "doctor"),
    ("signature", "to_witness", "witness", False, "nurse"),
    ("witness", "to_ready", "ready", False, "nurse"),
    ("ready", "to_legal", "legal", False, "legal_admin"),
]


ASSIGNMENT_RULES = [
    ("assign_presentation_to_nurse", "to_presentation", "presentation", "nursing", "nurse"),
    ("assign_signature_to_doctor", "to_signature", "signature", "physician", "doctor"),
    ("assign_witness_to_nurse", "to_witness", "witness", "nursing", "nurse"),
    ("assign_ready_to_nurse", "to_ready", "ready", "nursing", "nurse"),
    ("assign_legal_to_legal_admin", "to_legal", "legal", "legal", "legal_admin"),
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

        for rule_code, event_code, stage_code, team_code, role_code in ASSIGNMENT_RULES:
            existing = db.query(AssignmentRule).filter(AssignmentRule.rule_code == rule_code).first()
            if existing:
                existing.event_code = event_code
                existing.target_stage_code = stage_code
                existing.target_team_code = team_code
                existing.target_role_code = role_code
                existing.active = True
            else:
                db.add(
                    AssignmentRule(
                        id=str(uuid.uuid4()),
                        rule_code=rule_code,
                        event_code=event_code,
                        target_stage_code=stage_code,
                        target_team_code=team_code,
                        target_role_code=role_code,
                        active=True,
                    )
                )

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Workflow stages, transitions, and assignment rules seeded successfully")
