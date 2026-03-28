from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import backend.models  # noqa: F401
from backend.core.database import Base
 # Legacy audit log import removed
from backend.models.discharge_case import DischargeCase
from backend.models.discharge_workflow import DischargeRefusalWorkflow
from backend.models.patient import Patient
from backend.models.tenant import Tenant
from backend.models.user import User
from backend.models.workflow_audit_log import WorkflowAuditLog
from backend.services import workflow_automation_service as svc


def _make_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)


def _seed_due_case(session_local, *, due: bool) -> str:
    now = datetime(2026, 3, 21, 12, 0, 0)
    db = session_local()
    try:
        tenant = Tenant(id="tenant-1", name="Tenant", code="TEST", is_active=True)
        user = User(
            id="user-1",
            tenant_id=tenant.id,
            email="doctor@test.local",
            full_name="Dr. Test",
            role="doctor",
            is_active=True,
            hashed_password="placeholder",
        )
        patient = Patient(id="patient-1", tenant_id=tenant.id, mrn="MRN-1", full_name="Patient One")
        discharge_case = DischargeCase(
            id="case-1",
            tenant_id=tenant.id,
            patient_id=patient.id,
            created_by=user.id,
            status="FINANCIAL_NOTICE_GENERATED",
            refusal_reason="Patient requested additional stay.",
        )
        workflow = DischargeRefusalWorkflow(
            id="workflow-1",
            case_id=discharge_case.id,
            tenant_id=tenant.id,
            status="refusal_active",
            case_status="Financial Liability Notice Issued",
            current_stage="escalation",
            discharge_decision_at=now - timedelta(hours=25),
            refusal_started_at=now - timedelta(hours=24),
            initial_communication_at=now - timedelta(hours=23),
            support_and_intervention_at=now - timedelta(hours=22),
            social_services_referred_at=now - timedelta(hours=22),
            refusal_form_generated_at=now - timedelta(hours=21),
            financial_notice_generated_at=now - timedelta(hours=20),
            escalation_due_at=(now - timedelta(minutes=5)) if due else (now + timedelta(hours=4)),
            responsible_person="Dr. Test",
            refusal_reason="Patient requested additional stay.",
        )
        db.add_all([tenant, user, patient, discharge_case, workflow])
        db.commit()
        return discharge_case.id
    finally:
        db.close()


def test_due_cases_are_auto_escalated(monkeypatch):
    local_session = _make_session()
    monkeypatch.setattr(svc, "SessionLocal", local_session)
    case_id = _seed_due_case(local_session, due=True)

    now = datetime(2026, 3, 21, 12, 0, 0)
    stats = svc.run_due_escalation_sweep(now=now)

    assert stats["escalated"] == 1

    db = local_session()
    try:
        workflow = db.query(DischargeRefusalWorkflow).filter(DischargeRefusalWorkflow.case_id == case_id).first()
        discharge_case = db.query(DischargeCase).filter(DischargeCase.id == case_id).first()
        workflow_audit_entry = db.query(WorkflowAuditLog).filter(WorkflowAuditLog.case_id == case_id, WorkflowAuditLog.event_type == "workflow.auto_escalated").first()

        assert workflow is not None
        assert workflow.escalated_at == now
        assert workflow.status == "escalated"
        assert discharge_case is not None
        assert discharge_case.status == "LEGAL_ESCALATED"
        assert workflow_audit_entry is not None
    finally:
        db.close()


def test_not_due_cases_are_left_unchanged(monkeypatch):
    local_session = _make_session()
    monkeypatch.setattr(svc, "SessionLocal", local_session)
    case_id = _seed_due_case(local_session, due=False)

    now = datetime(2026, 3, 21, 12, 0, 0)
    stats = svc.run_due_escalation_sweep(now=now)

    assert stats["escalated"] == 0

    db = local_session()
    try:
        workflow = db.query(DischargeRefusalWorkflow).filter(DischargeRefusalWorkflow.case_id == case_id).first()
        assert workflow is not None
        assert workflow.escalated_at is None
        assert workflow.status == "refusal_active"
    finally:
        db.close()