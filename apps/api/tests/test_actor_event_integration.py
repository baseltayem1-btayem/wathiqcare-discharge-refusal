import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.core.database import Base
from backend.models.workflow_actor_event import WorkflowActorEvent
from backend.services.workflow_engine import WorkflowEngineService
from backend.services.actor_event_service import ActorEventService
from backend.models.actor_enums import ActorType, ActorEventType
from backend.models.discharge_case import DischargeCase
from backend.models.user import User
from datetime import datetime

@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    # Seed minimal required data
    case = DischargeCase(
        id="case-2",
        tenant_id="tenant-1",
        patient_id="patient-1",
        created_by="user-1",
        case_number="WC-2",
        patient_name="Test Patient",
        mrn="MRN-2",
        room_number="102",
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
    db.commit()
    yield db
    db.close()

def test_patient_signature_records_actor_event(db):
    # Simulate patient signature via actor event service
    actor_event_service = ActorEventService(db)
    event = actor_event_service.record_actor_event(
        case_id="case-2",
        actor_type="patient",
        event_type="signature",
        actor_user_id=None,
        actor_name="Test Patient",
        event_details={"signed_at": datetime.utcnow().isoformat()},
    )
    assert event.id is not None
    assert event.actor_type == ActorType.PATIENT
    assert event.event_type == ActorEventType.SIGNATURE
    # Confirm persistence
    found = db.query(WorkflowActorEvent).filter_by(case_id="case-2", event_type=ActorEventType.SIGNATURE).first()
    assert found is not None

def test_witness_confirmation_records_actor_event(db):
    engine = WorkflowEngineService(db)
    engine.record_witness_confirmation(
        case_id="case-2",
        tenant_id="tenant-1",
        actor_user_id="user-1",
        actor_name="Witness Name",
        event_details={"confirmed_at": datetime.utcnow().isoformat()},
    )
    found = db.query(WorkflowActorEvent).filter_by(case_id="case-2", event_type=ActorEventType.WITNESS_CONFIRMATION).first()
    assert found is not None
    assert found.actor_type == ActorType.WITNESS
    assert found.actor_name == "Witness Name"

def test_physician_confirmation_records_actor_event(db):
    engine = WorkflowEngineService(db)
    engine.record_physician_confirmation(
        case_id="case-2",
        tenant_id="tenant-1",
        actor_user_id="user-1",
        actor_name="Dr. Test",
        event_details={"confirmed_at": datetime.utcnow().isoformat()},
    )
    found = db.query(WorkflowActorEvent).filter_by(case_id="case-2", event_type=ActorEventType.PHYSICIAN_CONFIRMATION).first()
    assert found is not None
    assert found.actor_type == ActorType.DOCTOR
    assert found.actor_name == "Dr. Test"

def test_workflow_state_machine_untouched(db):
    engine = WorkflowEngineService(db)
    case = db.query(DischargeCase).filter_by(id="case-2").first()
    # Initial state is draft
    assert case.current_stage_code == "draft"
    # Call actor event methods (should not change state)
    engine.record_witness_confirmation(case_id="case-2", tenant_id="tenant-1", actor_user_id="user-1", actor_name="Witness Name")
    engine.record_physician_confirmation(case_id="case-2", tenant_id="tenant-1", actor_user_id="user-1", actor_name="Dr. Test")
    db.refresh(case)
    assert case.current_stage_code == "draft"
