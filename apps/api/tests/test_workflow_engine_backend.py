from __future__ import annotations

from datetime import datetime
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import backend.models  # noqa: F401
from backend.core.database import Base
from backend.models.assignment_rule import AssignmentRule
from backend.models.patient import Patient
from backend.models.tenant import Tenant
from backend.models.user import User
from backend.models.workflow_stage import WorkflowStage
from backend.models.workflow_notification import WorkflowNotification
from backend.models.workflow_task import WorkflowTask
from backend.models.workflow_transition import WorkflowTransition
from backend.services.workflow_engine import WorkflowEngineService
from backend.workflow.constants import ActionCode, StageCode


def _seed_workflow(db):
    stages = [
        "draft",
        "presentation",
        "signature",
        "witness",
        "ready",
        "legal",
    ]
    for index, code in enumerate(stages, start=1):
        db.add(
            WorkflowStage(
                code=code,
                name_en=code,
                name_ar=code,
                category="test",
                sort_order=index,
                is_terminal=code in {StageCode.CLOSED, StageCode.CANCELLED},
            )
        )

    transitions = [
        ("draft", "to_presentation", "presentation", False, "nurse"),
        ("presentation", "to_signature", "signature", False, "doctor"),
        ("signature", "to_witness", "witness", False, "nurse"),
        ("witness", "to_ready", "ready", False, "nurse"),
        ("ready", "to_legal", "legal", False, "legal_admin"),
    ]
    for from_stage, action, to_stage, requires_comment, requires_role in transitions:
        db.add(
            WorkflowTransition(
                from_stage_code=from_stage,
                action_code=action,
                to_stage_code=to_stage,
                requires_comment=requires_comment,
                requires_role=requires_role,
            )
        )

    rules = [
        ("assign_presentation_to_nurse", "to_presentation", "presentation", "nursing", "nurse"),
        ("assign_signature_to_doctor", "to_signature", "signature", "physician", "doctor"),
        ("assign_witness_to_nurse", "to_witness", "witness", "nursing", "nurse"),
        ("assign_ready_to_nurse", "to_ready", "ready", "nursing", "nurse"),
        ("assign_legal_to_legal_admin", "to_legal", "legal", "legal", "legal_admin"),
    ]
    for rule_code, event_code, stage_code, team_code, role_code in rules:
        db.add(
            AssignmentRule(
                rule_code=rule_code,
                event_code=event_code,
                target_stage_code=stage_code,
                target_team_code=team_code,
                target_role_code=role_code,
                active=True,
            )
        )

    db.commit()


@pytest.fixture()
def wf_db(tmp_path: Path):
    db_path = tmp_path / "workflow_engine.sqlite3"
    engine = create_engine(f"sqlite:///{db_path}")
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = session_local()
    tenant = Tenant(id="tenant-1", name="Tenant", code="TEN", is_active=True)
    nurse = User(
        id="user-nurse",
        tenant_id=tenant.id,
        email="nurse@test.local",
        full_name="Nurse One",
        role="nursing",
        is_active=True,
    )
    physician = User(
        id="user-doctor",
        tenant_id=tenant.id,
        email="doctor@test.local",
        full_name="Doctor One",
        role="doctor",
        is_active=True,
    )
    patient = Patient(id="patient-1", tenant_id=tenant.id, mrn="MRN-1", full_name="Patient One")
    legal_admin = User(
        id="user-legal",
        tenant_id=tenant.id,
        email="legal@test.local",
        full_name="Legal Admin",
        role="legal_admin",
        is_active=True,
    )
    db.add_all([tenant, nurse, physician, patient, legal_admin])
    db.commit()

    _seed_workflow(db)

    try:
        yield db
    finally:
        db.close()


def _create_case(engine: WorkflowEngineService):
    return engine.create_case(
        tenant_id="tenant-1",
        created_by="user-nurse",
        patient_id="patient-1",
        patient_name="Patient One",
        mrn="MRN-1",
        room_number="301",
        department="Medicine",
        attending_physician_user_id="user-doctor",
        attending_physician_name="Doctor One",
        discharge_plan_summary="Standard discharge",
        actor_role="nurse",
    )


def test_transition_validation_rejects_invalid_next_action(wf_db):
    engine = WorkflowEngineService(wf_db)
    case = _create_case(engine)

    # Case is created in 'draft' state; cannot mark refused until progressed.
    with pytest.raises(ValueError, match="Invalid transition"):
        engine.mark_patient_refused(
            case_id=case.id,
            tenant_id="tenant-1",
            actor_user_id="user-nurse",
            actor_role="nurse",
            response_payload={"refusal_reason": "not yet sent"},
        )


def test_task_creation_on_patient_accepted(wf_db):
    engine = WorkflowEngineService(wf_db)
    # 1. Canonical: nurse transitions draft -> presentation
    case1 = _create_case(engine)
    engine.transition_case(
        case1.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_presentation",
        {},
    )
    # 1a. Unauthorized: doctor tries draft -> presentation (fresh case)
    case1a = _create_case(engine)
    with pytest.raises(ValueError, match="Action requires role: nurse"):
        engine.transition_case(
            case1a.id,
            "tenant-1",
            "user-doctor",
            "doctor",
            "to_presentation",
            {},
        )
    # 2. Canonical: doctor transitions presentation -> signature
    case2 = _create_case(engine)
    engine.transition_case(
        case2.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_presentation",
        {},
    )
    engine.transition_case(
        case2.id,
        "tenant-1",
        "user-doctor",
        "doctor",
        "to_signature",
        {},
    )
    # 2a. Unauthorized: nurse tries presentation -> signature (fresh case)
    case2a = _create_case(engine)
    engine.transition_case(
        case2a.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_presentation",
        {},
    )
    with pytest.raises(ValueError, match="Action requires role: doctor"):
        engine.transition_case(
            case2a.id,
            "tenant-1",
            "user-nurse",
            "nurse",
            "to_signature",
            {},
        )
    # 3. Canonical: nurse transitions signature -> witness
    case3 = _create_case(engine)
    engine.transition_case(
        case3.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_presentation",
        {},
    )
    engine.transition_case(
        case3.id,
        "tenant-1",
        "user-doctor",
        "doctor",
        "to_signature",
        {},
    )
    engine.transition_case(
        case3.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_witness",
        {},
    )
    # 3a. Unauthorized: doctor tries signature -> witness (fresh case)
    case3a = _create_case(engine)
    engine.transition_case(
        case3a.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_presentation",
        {},
    )
    engine.transition_case(
        case3a.id,
        "tenant-1",
        "user-doctor",
        "doctor",
        "to_signature",
        {},
    )
    with pytest.raises(ValueError, match="Action requires role: nurse"):
        engine.transition_case(
            case3a.id,
            "tenant-1",
            "user-doctor",
            "doctor",
            "to_witness",
            {},
        )
    # 4. Canonical: nurse transitions witness -> ready
    case4 = _create_case(engine)
    engine.transition_case(
        case4.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_presentation",
        {},
    )
    engine.transition_case(
        case4.id,
        "tenant-1",
        "user-doctor",
        "doctor",
        "to_signature",
        {},
    )
    engine.transition_case(
        case4.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_witness",
        {},
    )
    engine.transition_case(
        case4.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_ready",
        {},
    )
    # 4a. Unauthorized: doctor tries witness -> ready (fresh case)
    case4a = _create_case(engine)
    engine.transition_case(
        case4a.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_presentation",
        {},
    )
    engine.transition_case(
        case4a.id,
        "tenant-1",
        "user-doctor",
        "doctor",
        "to_signature",
        {},
    )
    engine.transition_case(
        case4a.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_witness",
        {},
    )
    with pytest.raises(ValueError, match="Action requires role: nurse"):
        engine.transition_case(
            case4a.id,
            "tenant-1",
            "user-doctor",
            "doctor",
            "to_ready",
            {},
        )
    # 5. Canonical: legal_admin transitions ready -> legal
    case5 = _create_case(engine)
    engine.transition_case(
        case5.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_presentation",
        {},
    )
    engine.transition_case(
        case5.id,
        "tenant-1",
        "user-doctor",
        "doctor",
        "to_signature",
        {},
    )
    engine.transition_case(
        case5.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_witness",
        {},
    )
    engine.transition_case(
        case5.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_ready",
        {},
    )
    engine.transition_case(
        case5.id,
        "tenant-1",
        "user-legal",
        "legal_admin",
        "to_legal",
        {},
    )
    # 5a. Unauthorized: nurse tries ready -> legal (fresh case)
    case5a = _create_case(engine)
    engine.transition_case(
        case5a.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_presentation",
        {},
    )
    engine.transition_case(
        case5a.id,
        "tenant-1",
        "user-doctor",
        "doctor",
        "to_signature",
        {},
    )
    engine.transition_case(
        case5a.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_witness",
        {},
    )
    engine.transition_case(
        case5a.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_ready",
        {},
    )
    with pytest.raises(ValueError, match="Action requires role: legal_admin"):
        engine.transition_case(
            case5a.id,
            "tenant-1",
            "user-nurse",
            "nurse",
            "to_legal",
            {},
        )


def test_task_creation_on_patient_refused_path(wf_db):
    engine = WorkflowEngineService(wf_db)
    case = _create_case(engine)

    engine.record_discharge_order(
        case.id,
        "tenant-1",
        "user-doctor",
        {
            "discharge_decision_date": datetime.utcnow(),
            "discharge_plan_summary": "Refusal path",
        },
    )
    # Start workflow with canonical transition
    engine.transition_case(
        case.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_presentation",
        {},
    )

    engine.mark_patient_refused(
        case.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        {"refusal_reason": "Family refused"},
    )

    task = (
        wf_db.query(WorkflowTask)
        .filter(
            WorkflowTask.case_id == case.id,
            WorkflowTask.stage_code == StageCode.PATIENT_RELATIONS_REVIEW,
        )
        .first()
    )
    assert task is not None
    assert task.task_code == "patient_relations_review"


def test_notification_generation_on_case_create(wf_db):
    engine = WorkflowEngineService(wf_db)
    case = _create_case(engine)

    notifications = (
        wf_db.query(WorkflowNotification)
        .filter(WorkflowNotification.case_id == case.id)
        .all()
    )
    assert len(notifications) >= 2
    assert any(item.notification_type == "task_assigned" for item in notifications)


def test_integration_refusal_escalation_chain(wf_db):
    engine = WorkflowEngineService(wf_db)
    case = _create_case(engine)

    engine.record_discharge_order(
        case.id,
        "tenant-1",
        "user-doctor",
        {
            "discharge_decision_date": datetime.utcnow(),
            "discharge_plan_summary": "Escalation flow",
        },
    )
    engine.transition_case(
        case.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_presentation",
        {},
    )
    engine.mark_patient_refused(
        case.id,
        "tenant-1",
        "user-nurse",
        "nursing",
        {"refusal_reason": "Patient refused"},
    )

    transitions = [
        (StageCode.PATIENT_RELATIONS_REVIEW, "patient_affairs", ActionCode.COMPLETE_PATIENT_RELATIONS),
        (StageCode.SOCIAL_WORK_REVIEW, "social_services", ActionCode.COMPLETE_SOCIAL_WORK),
        (StageCode.FINANCE_REVIEW, "finance", ActionCode.COMPLETE_FINANCE),
    ]

    for expected_stage, role, _ in transitions:
        wf_db.refresh(case)
        assert case.current_stage_code == expected_stage
        engine.complete_stage_task(
            case_id=case.id,
            tenant_id="tenant-1",
            stage_code=expected_stage,
            actor_user_id="user-nurse",
            actor_role=role,
            payload={"comment": f"completed {expected_stage}"},
        )

    wf_db.refresh(case)
    assert case.current_stage_code == StageCode.LEGAL_ESCALATION

    engine.complete_stage_task(
        case_id=case.id,
        tenant_id="tenant-1",
        stage_code=StageCode.LEGAL_ESCALATION,
        actor_user_id="user-nurse",
        actor_role="legal_admin",
        payload={"comment": "legal closure"},
    )

    wf_db.refresh(case)
    assert case.current_stage_code == StageCode.CLOSED


def test_integration_acceptance_generates_execution_tasks(wf_db):
    engine = WorkflowEngineService(wf_db)
    case = _create_case(engine)

    engine.record_discharge_order(
        case.id,
        "tenant-1",
        "user-doctor",
        {
            "discharge_decision_date": datetime.utcnow(),
            "discharge_plan_summary": "Execution flow",
        },
    )
    engine.transition_case(
        case.id,
        "tenant-1",
        "user-nurse",
        "nurse",
        "to_presentation",
        {},
    )

    engine.mark_patient_accepted(
        case.id,
        "tenant-1",
        "user-nurse",
        "nursing",
        {
            "requires_home_healthcare": True,
            "requires_medical_equipment": True,
            "requires_transfer": False,
            "requires_extended_care": True,
        },
    )

    wf_db.refresh(case)
    assert case.current_stage_code == StageCode.ACCEPTED_DISCHARGE_EXECUTION

    execution_tasks = (
        wf_db.query(WorkflowTask)
        .filter(
            WorkflowTask.case_id == case.id,
            WorkflowTask.task_code.in_([
                "execution_home_healthcare",
                "execution_medical_equipment",
                "execution_extended_care",
            ]),
        )
        .all()
    )
    assert len(execution_tasks) == 3
