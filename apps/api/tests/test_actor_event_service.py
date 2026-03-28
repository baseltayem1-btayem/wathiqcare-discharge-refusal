import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.core.database import Base
from backend.models.workflow_actor_event import WorkflowActorEvent
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
        id="case-1",
        tenant_id="tenant-1",
        patient_id="patient-1",
        created_by="user-1",
        case_number="WC-1",
        patient_name="Test Patient",
        mrn="MRN-1",
        room_number="101",
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

def test_record_valid_actor_event(db):
    service = ActorEventService(db)
    event = service.record_actor_event(
        case_id="case-1",
        actor_type="patient",
        event_type="signature",
        actor_user_id="user-1",
        actor_name="Test Patient",
        actor_identifier="NID123",
        event_details={"signature_text": "abc", "signed_at": datetime.utcnow().isoformat()},
        document_hash="hash123",
        ip_address="127.0.0.1",
        session_id="sess-1",
    )
    assert event.id is not None
    assert event.actor_type == ActorType.PATIENT
    assert event.event_type == ActorEventType.SIGNATURE
    assert event.actor_user_id == "user-1"
    assert event.actor_name == "Test Patient"
    assert event.document_hash == "hash123"
    assert event.ip_address == "127.0.0.1"
    assert event.session_id == "sess-1"

def test_invalid_actor_type(db):
    service = ActorEventService(db)
    with pytest.raises(ValueError, match="Invalid actor_type"):
        service.record_actor_event(
            case_id="case-1",
            actor_type="invalid_type",
            event_type="signature",
        )

def test_invalid_event_type(db):
    service = ActorEventService(db)
    with pytest.raises(ValueError, match="Invalid event_type"):
        service.record_actor_event(
            case_id="case-1",
            actor_type="patient",
            event_type="invalid_event",
        )

def test_actor_event_persistence(db):
    service = ActorEventService(db)
    service.record_actor_event(
        case_id="case-1",
        actor_type="doctor",
        event_type="physician_confirmation",
        actor_user_id="user-1",
        actor_name="Dr. Test",
        event_details={"confirmed_at": datetime.utcnow().isoformat()},
    )
    events = db.query(WorkflowActorEvent).filter_by(case_id="case-1").all()
    assert len(events) == 1
    assert events[0].actor_type == ActorType.DOCTOR
    assert events[0].event_type == ActorEventType.PHYSICIAN_CONFIRMATION
