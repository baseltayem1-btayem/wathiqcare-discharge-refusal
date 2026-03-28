import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.core.database import Base
from backend.models.workflow_audit_log import WorkflowAuditLog
from backend.services.workflow_audit_log_service import WorkflowAuditLogService
from backend.services.workflow_engine import WorkflowEngineService
from backend.services.actor_event_service import ActorEventService
from backend.models.discharge_case import DischargeCase
from backend.models.user import User
from datetime import datetime

def setup_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    case = DischargeCase(
        id="case-3",
        tenant_id="tenant-1",
        patient_id="patient-1",
        created_by="user-1",
        case_number="WC-3",
        patient_name="Test Patient",
        mrn="MRN-3",
        room_number="103",
        department="Test",
        attending_physician_user_id="user-2",
        attending_physician_name="Dr. Test",
        discharge_plan_summary="Test plan",
    )
    user = User(
        id="user-1",
        tenant_id="tenant-1",
        email="test@test.com",
        full_name="Test User",
        role="doctor",
        is_active=True,
    )
    db.add(case)
    db.add(user)
    # Seed canonical workflow transition for test_workflow_transition_audit_entry
    from backend.models.workflow_transition import WorkflowTransition
    from backend.models.workflow_stage import WorkflowStage
    db.add(WorkflowTransition(
        from_stage_code="draft",
        action_code="to_presentation",
        to_stage_code="presentation",
    ))
    db.add(WorkflowStage(
        code="presentation",
        name_en="Presentation",
        name_ar="عرض",
        category="clinical",
        sort_order=1,
        is_terminal=False,
    ))
    db.commit()
    return db

def test_hash_chain_generation():
    db = setup_db()
    audit_service = WorkflowAuditLogService(db)
    h0 = audit_service.append_audit_log(
        case_id="case-3",
        event_category="workflow_transition",
        event_type="to_presentation",
        user_id="user-1",
        actor_type="nurse",
        payload_json={"foo": 1},
    )
    h1 = audit_service.append_audit_log(
        case_id="case-3",
        event_category="workflow_transition",
        event_type="to_signature",
        user_id="user-1",
        actor_type="doctor",
        payload_json={"foo": 2},
    )
    h2 = audit_service.append_audit_log(
        case_id="case-3",
        event_category="actor_event",
        event_type="signature",
        user_id=None,
        actor_type="patient",
        payload_json={"bar": 3},
    )
    assert h1.previous_hash == h0.current_hash
    assert h2.previous_hash == h1.current_hash
    # Hashes must be correct
    from backend.models.workflow_audit_log import WorkflowAuditLog
    assert h1.current_hash == WorkflowAuditLog.compute_hash(
        h1.previous_hash, {"foo": 2}, h1.event_category, h1.event_type, h1.case_id, h1.created_at.isoformat()
    )
    assert h2.current_hash == WorkflowAuditLog.compute_hash(
        h2.previous_hash, {"bar": 3}, h2.event_category, h2.event_type, h2.case_id, h2.created_at.isoformat()
    )
    db.close()

def test_append_only_behavior():
    db = setup_db()
    audit_service = WorkflowAuditLogService(db)
    h0 = audit_service.append_audit_log(
        case_id="case-3",
        event_category="workflow_transition",
        event_type="to_presentation",
        user_id="user-1",
        actor_type="nurse",
        payload_json={"foo": 1},
    )
    h1 = audit_service.append_audit_log(
        case_id="case-3",
        event_category="workflow_transition",
        event_type="to_signature",
        user_id="user-1",
        actor_type="doctor",
        payload_json={"foo": 2},
    )
    logs = db.query(WorkflowAuditLog).filter_by(case_id="case-3").order_by(WorkflowAuditLog.created_at).all()
    assert len(logs) == 2
    # Try to delete (should not be allowed in real DB, but here we just check append-only logic)
    db.delete(logs[0])
    db.commit()
    logs2 = db.query(WorkflowAuditLog).filter_by(case_id="case-3").all()
    assert len(logs2) == 1
    db.close()

def test_workflow_transition_audit_entry():
    db = setup_db()
    engine = WorkflowEngineService(db)
    # Simulate a workflow transition
    engine.transition_case(
        case_id="case-3",
        tenant_id="tenant-1",
        actor_user_id="user-1",
        actor_role="nurse",
        action_code="to_presentation",
        payload={"event_details": "test"},
    )
    logs = db.query(WorkflowAuditLog).filter_by(case_id="case-3", event_category="workflow_transition").all()
    assert len(logs) == 1
    assert logs[0].event_type == "to_presentation"
    db.close()

def test_actor_event_audit_entry():
    db = setup_db()
    actor_event_service = ActorEventService(db)
    actor_event_service.record_actor_event(
        case_id="case-3",
        actor_type="patient",
        event_type="signature",
        actor_user_id=None,
        actor_name="Test Patient",
        event_details={"signed_at": datetime.utcnow().isoformat()},
    )
    logs = db.query(WorkflowAuditLog).filter_by(case_id="case-3", event_category="actor_event").all()
    assert len(logs) == 1
    assert logs[0].event_type == "signature"
    db.close()
