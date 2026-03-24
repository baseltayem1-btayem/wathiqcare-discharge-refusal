from __future__ import annotations

from datetime import datetime

import backend.models  # noqa: F401
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.core.database import Base
from backend.models.discharge_case import DischargeCase
from backend.models.patient import Patient
from backend.models.tenant import Tenant
from backend.models.user import User
from backend.models.workflow_audit_log import WorkflowAuditLog
from backend.models.discharge_legal_workflow import (
    PatientNoticePresentation,
    SignatureArtifact,
    SignerIdentity,
)
from backend.modules.discharge_legal_workflow.legal_orchestration_service import (
    ActorContext,
    LegalOrchestrationService,
    amount_to_arabic_words,
)


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = local()
    tenant = Tenant(
        id="tenant-1",
        name="Hospital A",
        code="HOSP-A",
        is_active=True,
        moh_license="MOH-123",
        cr_number="CR-99",
    )
    user = User(
        id="user-1",
        tenant_id=tenant.id,
        email="legal@hospital.test",
        full_name="Legal Admin",
        role="legal_admin",
        hashed_password="hash",
    )
    patient = Patient(
        id="patient-1",
        tenant_id=tenant.id,
        mrn="MRN-1",
        full_name="Patient One",
        national_id="1234567890",
    )
    case = DischargeCase(
        id="case-1",
        tenant_id=tenant.id,
        patient_id=patient.id,
        created_by=user.id,
        case_number="CASE-1",
        patient_name="Patient One",
        mrn="MRN-1",
        room_number="A-101",
        department="Internal Medicine",
        attending_physician_name="Dr. House",
        status="pending",
    )

    db.add_all([tenant, user, patient, case])
    db.commit()

    try:
        yield db
    finally:
        db.close()


def _actor() -> ActorContext:
    return ActorContext(user_id="user-1", tenant_id="tenant-1", user_name="Legal Admin")


def test_full_refusal_path_generates_financial_and_evidence_package(db_session):
    svc = LegalOrchestrationService(db_session)

    event = svc.create_or_update_decision_event(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={
            "encounter_number": "ENC-100",
            "diagnosis_summary": "Stable for discharge",
            "decision_timestamp": datetime.utcnow().isoformat(),
        },
        actor=_actor(),
    )
    assert event.legal_state == "DRAFT"

    svc.transition_state(
        tenant_id="tenant-1",
        case_id="case-1",
        target_state="DECISION_ISSUED",
        actor=_actor(),
    )

    document = svc.generate_master_document(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={
            "language": "ar",
            "medical": {
                "final_diagnosis": "Condition improved",
                "discharge_plan": "Continue oral meds",
            },
            "notification": {"notice_method": "in_person"},
            "response": {},
            "signatures": {},
        },
        actor=_actor(),
    )
    assert document.status == "generated"

    presentation = svc.record_notice_presentation(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={
            "mode": "tablet",
            "language": "ar",
            "notice_method": "in_person",
            "identity_verified": True,
        },
        actor=_actor(),
    )
    assert presentation.status == "presented"

    response = svc.record_patient_response(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={
            "response_type": "refused_discharge",
            "refusal_reason": "Family requested delay",
            "signer_name": "Patient One",
            "signer_type": "patient",
            "signature_payload": "data:image/png;base64,abc123",
        },
        actor=_actor(),
    )
    assert response.response_type == "refused_discharge"

    ack = svc.create_financial_acknowledgment(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={
            "guarantor": "Guardian A",
            "coverage_status": "pending",
            "daily_cost_estimate": 1800,
            "total_estimated_exposure": 5400,
        },
        actor=_actor(),
    )
    assert ack.status == "generated"

    note = svc.create_promissory_note(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={
            "amount_numeric": 5400,
            "debtor_name": "Guardian A",
            "debtor_id": "1234567890",
            "creditor_name": "Hospital A",
            "due_date": "2026-04-30",
            "issue_place": "Riyadh",
            "issue_date": "2026-03-24",
        },
        actor=_actor(),
    )
    assert note.amount_numeric == 5400
    assert "ريال سعودي" in note.amount_text_ar

    evidence = svc.build_evidence_package(
        tenant_id="tenant-1",
        case_id="case-1",
        actor=_actor(),
    )
    assert evidence.status == "generated"
    assert evidence.package_reference.startswith("EVD-")
    assert evidence.package_index_json.get("promissory_note_count") == 1


@pytest.mark.parametrize(
    "value,expected",
    [
        (0, "صفر ريال سعودي فقط لا غير"),
        (15, "خمسة عشر ريال سعودي فقط لا غير"),
        (125.5, "مائة و خمسة و عشرون ريال سعودي و خمسون هللة فقط لا غير"),
    ],
)
def test_amount_to_arabic_words(value: float, expected: str):
    assert amount_to_arabic_words(value) == expected


def test_master_document_injects_tenant_identity_and_audit_logs(db_session):
    svc = LegalOrchestrationService(db_session)

    svc.create_or_update_decision_event(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={"decision_timestamp": datetime.utcnow().isoformat()},
        actor=_actor(),
    )
    svc.transition_state(
        tenant_id="tenant-1",
        case_id="case-1",
        target_state="DECISION_ISSUED",
        actor=_actor(),
    )

    document = svc.generate_master_document(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={"language": "ar"},
        actor=_actor(),
    )

    assert document.hospital_header_json.get("moh_license") == "MOH-123"
    assert document.hospital_header_json.get("cr_number") == "CR-99"
    assert document.legal_statement_json.get("ar")
    assert document.legal_statement_json.get("en")

    audit_rows = (
        db_session.query(WorkflowAuditLog)
        .filter(WorkflowAuditLog.case_id == "case-1")
        .all()
    )
    event_types = {row.event_type for row in audit_rows}
    assert "legal_decision_event_upserted" in event_types
    assert "legal_state_transition" in event_types
    assert "master_discharge_document_generated" in event_types


def test_tenant_legal_control_metrics(db_session):
    svc = LegalOrchestrationService(db_session)

    svc.create_or_update_decision_event(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={"decision_timestamp": datetime.utcnow().isoformat()},
        actor=_actor(),
    )
    svc.transition_state(
        tenant_id="tenant-1",
        case_id="case-1",
        target_state="DECISION_ISSUED",
        actor=_actor(),
    )
    svc.generate_master_document(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={"language": "ar"},
        actor=_actor(),
    )
    svc.record_notice_presentation(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={"identity_verified": True},
        actor=_actor(),
    )
    svc.record_patient_response(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={
            "response_type": "refused_discharge",
            "refusal_reason": "Requested delay",
            "signer_name": "Patient One",
            "signer_type": "patient",
            "signature_payload": "data:image/png;base64,abc123",
        },
        actor=_actor(),
    )
    svc.create_financial_acknowledgment(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={
            "guarantor": "Guardian A",
            "total_estimated_exposure": 9000,
        },
        actor=_actor(),
    )
    svc.create_promissory_note(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={
            "amount_numeric": 9000,
            "debtor_name": "Guardian A",
            "debtor_id": "1234567890",
            "creditor_name": "Hospital A",
            "due_date": "2026-05-01",
            "issue_place": "Riyadh",
            "issue_date": "2026-03-24",
        },
        actor=_actor(),
    )

    metrics = svc.get_tenant_legal_control_metrics(tenant_id="tenant-1")
    assert metrics["total_discharge_decisions"] == 1
    assert metrics["total_refused"] == 1
    assert metrics["financial_acknowledgments_generated"] == 1
    assert metrics["promissory_notes_generated"] == 1
    assert metrics["total_estimated_financial_exposure"] == 9000.0


# ──────────────────────────────────────────────────────────────────────────────
# Phase 9 — Additional document type and state machine tests
# ──────────────────────────────────────────────────────────────────────────────


def _prepare_event_and_document(svc: LegalOrchestrationService) -> None:
    """Helper: create decision event, issue it, and generate master document."""
    svc.create_or_update_decision_event(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={"decision_timestamp": "2026-03-24T10:00:00"},
        actor=_actor(),
    )
    svc.transition_state(
        tenant_id="tenant-1",
        case_id="case-1",
        target_state="DECISION_ISSUED",
        actor=_actor(),
    )
    svc.generate_master_document(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={"language": "ar"},
        actor=_actor(),
    )
    svc.record_notice_presentation(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={"mode": "tablet", "identity_verified": True},
        actor=_actor(),
    )
    svc.record_patient_response(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={
            "response_type": "refused_discharge",
            "refusal_reason": "Family not ready",
            "signer_name": "Patient One",
            "signer_type": "patient",
            "signature_payload": "data:image/png;base64,abc123",
        },
        actor=_actor(),
    )


def test_create_home_healthcare_agreement_generates_document(db_session):
    svc = LegalOrchestrationService(db_session)
    _prepare_event_and_document(svc)

    agreement = svc.create_home_healthcare_agreement(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={
            "patient_name": "Patient One",
            "services": ["nursing_visits", "physiotherapy"],
            "start_date": "2026-04-01",
            "end_date": "2026-04-30",
            "daily_rate": 800,
        },
        actor=_actor(),
    )

    assert agreement.status == "generated"
    assert agreement.case_id == "case-1"
    assert agreement.rendered_html is not None
    assert "home" in agreement.rendered_html.lower() or "رعاية" in agreement.rendered_html
    assert len(agreement.agreement_payload_json.get("fixed_clauses", [])) == 11


def test_create_equipment_lease_generates_document(db_session):
    svc = LegalOrchestrationService(db_session)
    _prepare_event_and_document(svc)

    lease = svc.create_equipment_lease(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={
            "equipment_name": "Portable Oxygen Concentrator",
            "equipment_model": "OC-5L",
            "serial_number": "SN-20260324",
            "lease_start": "2026-04-01",
            "lease_end": "2026-04-30",
            "monthly_rate": 600,
        },
        actor=_actor(),
    )

    assert lease.status == "generated"
    assert lease.case_id == "case-1"
    assert lease.rendered_html is not None
    assert len(lease.lease_payload_json.get("fixed_clauses", [])) == 11


def test_create_legal_undertaking_generates_document(db_session):
    svc = LegalOrchestrationService(db_session)
    _prepare_event_and_document(svc)

    undertaking = svc.create_legal_undertaking(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={
            "undertaking_party_name": "Patient One",
            "undertaking_party_id": "1234567890",
            "obligation_type": "self_discharge_against_advice",
            "witnessed_by": "Ward Nurse",
        },
        actor=_actor(),
    )

    assert undertaking.status == "generated"
    assert undertaking.case_id == "case-1"
    assert undertaking.rendered_html is not None
    assert undertaking.undertaking_payload_json.get("obligation_type") == "self_discharge_against_advice"


def test_escalation_event_auto_transitions_to_escalated_state(db_session):
    svc = LegalOrchestrationService(db_session)
    _prepare_event_and_document(svc)
    # After record_patient_response with refused_discharge → legal_state = PATIENT_REFUSED
    event_before = svc._active_event("tenant-1", "case-1")
    assert event_before.legal_state == "PATIENT_REFUSED"

    escalation = svc.create_escalation_event(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={
            "escalation_level": "department_head_escalation",
            "hours_from_now": 4,
            "target_role": "department_head",
            "notes": "Patient refused twice — escalating to department head.",
        },
        actor=_actor(),
    )

    assert escalation.escalation_level == "department_head_escalation"
    event_after = svc._active_event("tenant-1", "case-1")
    assert event_after.legal_state == "ESCALATED"


def test_invalid_state_transition_raises_value_error(db_session):
    svc = LegalOrchestrationService(db_session)
    svc.create_or_update_decision_event(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={"decision_timestamp": "2026-03-24T10:00:00"},
        actor=_actor(),
    )
    # From DRAFT, cannot jump directly to COMPLETED
    with pytest.raises(ValueError):
        svc.transition_state(
            tenant_id="tenant-1",
            case_id="case-1",
            target_state="COMPLETED",
            actor=_actor(),
        )


def test_signer_identity_and_signature_artifact_created_after_response(db_session):
    svc = LegalOrchestrationService(db_session)
    svc.create_or_update_decision_event(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={"decision_timestamp": "2026-03-24T10:00:00"},
        actor=_actor(),
    )
    svc.transition_state(
        tenant_id="tenant-1",
        case_id="case-1",
        target_state="DECISION_ISSUED",
        actor=_actor(),
    )
    svc.generate_master_document(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={"language": "ar"},
        actor=_actor(),
    )
    svc.record_notice_presentation(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={"mode": "tablet", "identity_verified": True},
        actor=_actor(),
    )
    svc.record_patient_response(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={
            "response_type": "refused_discharge",
            "refusal_reason": "Not prepared",
            "signer_name": "Patient One",
            "signer_type": "patient",
            "signer_id_type": "national_id",
            "signer_id_number": "1234567890",
            "signer_name_ar": "المريض الأول",
            "nationality": "Saudi",
            "legal_capacity_indicator": "competent",
            "signature_payload": "data:image/png;base64,abc123",
            "document_version": "1.0.0",
            "source_mode": "tablet",
        },
        actor=_actor(),
    )

    signer = db_session.query(SignerIdentity).filter_by(case_id="case-1").first()
    assert signer is not None
    assert signer.full_name == "Patient One"
    assert signer.arabic_full_name == "المريض الأول"
    assert signer.nationality == "Saudi"
    assert signer.legal_capacity_indicator == "competent"

    artifact = db_session.query(SignatureArtifact).filter_by(case_id="case-1").first()
    assert artifact is not None
    assert artifact.source_mode == "tablet"
    assert artifact.document_version == "1.0.0"
    assert artifact.signature_payload is not None


def test_notice_presentation_proof_fields_stored(db_session):
    svc = LegalOrchestrationService(db_session)
    svc.create_or_update_decision_event(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={"decision_timestamp": "2026-03-24T10:00:00"},
        actor=_actor(),
    )
    svc.transition_state(
        tenant_id="tenant-1",
        case_id="case-1",
        target_state="DECISION_ISSUED",
        actor=_actor(),
    )
    svc.generate_master_document(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={"language": "ar"},
        actor=_actor(),
    )

    presentation = svc.record_notice_presentation(
        tenant_id="tenant-1",
        case_id="case-1",
        payload={
            "mode": "tablet",
            "language": "ar",
            "notice_method": "in_person",
            "identity_verified": True,
            "presented_to_type": "patient",
            "presented_to_name": "Patient One",
            "presented_to_id_type": "national_id",
            "presented_to_id_number": "1234567890",
            "acknowledged_view": True,
            "witness_name": "Ward Nurse Fatima",
            "document_type": "master_document",
            "viewed_duration_seconds": 90,
            "interpreter_used": False,
        },
        actor=_actor(),
    )

    record = db_session.query(PatientNoticePresentation).filter_by(case_id="case-1").first()
    assert record is not None
    assert record.presented_to_type == "patient"
    assert record.presented_to_name == "Patient One"
    assert record.presented_to_id_type == "national_id"
    assert record.presented_to_id_number == "1234567890"
    assert record.acknowledged_view is True
    assert record.witness_name == "Ward Nurse Fatima"
    assert record.document_type == "master_document"
