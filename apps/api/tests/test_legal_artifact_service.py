from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import backend.models  # noqa: F401
from backend.core.database import Base
from backend.legal import legal_artifact_service as svc
from backend.models.discharge_workflow import DischargeRefusalWorkflow
from backend.models.tenant import Tenant
from backend.models.user import User
from backend.models.workflow_document import DischargeWorkflowDocument
from backend.models.workflow_notification import WorkflowNotification


@pytest.fixture()
def db_session_local(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    monkeypatch.setattr(svc, "SessionLocal", local)

    db = local()
    tenant = Tenant(id="tenant-1", name="Hospital A", code="HOSP-A", is_active=True)
    user = User(
        id="user-1",
        tenant_id=tenant.id,
        email="legal@hospital.test",
        full_name="Legal Admin",
        role="legal_admin",
        hashed_password="hash",
    )
    compliance_user = User(
        id="user-2",
        tenant_id=tenant.id,
        email="compliance@hospital.test",
        full_name="Compliance Officer",
        role="compliance",
        hashed_password="hash",
    )
    db.add(tenant)
    db.add(user)
    db.add(compliance_user)
    db.commit()
    db.close()

    return local


def _create_case() -> dict:
    return svc.create_legal_artifact_case(
        tenant_id="tenant-1",
        actor_user_id="user-1",
        payload={
            "patient_mrn": "MRN-100",
            "patient_name": "Patient One",
            "refusal_reason": "Requested home discharge refusal",
            "attending_physician_name": "Dr. House",
            "tenant_header": {
                "logo_url": "https://example.com/logo.png",
                "moh_license": "MOH-12345",
                "commercial_registration": "CR-778899",
            },
            "legal_footer_text": "Policy-locked legal footer",
        },
    )


def test_finalize_requires_guardian_when_capacity_lacking(db_session_local):
    created = _create_case()
    case_id = created["case_id"]

    svc.upsert_legal_artifact_screen(
        tenant_id="tenant-1",
        case_id=case_id,
        screen="clinical_decision",
        payload={
            "discharge_decision_at": datetime.utcnow().isoformat(),
            "clinical_rationale": "Patient refuses medically advised transfer",
            "capacity_assessment": {
                "outcome": "lacks_capacity",
                "notes": "Temporary delirium",
                "assessed_by": "Dr. House",
            },
        },
        actor_user_id="user-1",
    )
    svc.upsert_legal_artifact_screen(
        tenant_id="tenant-1",
        case_id=case_id,
        screen="risk_disclosure",
        payload={
            "disclosed": True,
            "patient_acknowledged": True,
            "risk_items_en": ["Respiratory failure", "Medication interruption"],
            "risk_items_ar": ["فشل تنفسي", "انقطاع الأدوية"],
        },
        actor_user_id="user-1",
    )
    svc.upsert_legal_artifact_screen(
        tenant_id="tenant-1",
        case_id=case_id,
        screen="patient_interaction",
        payload={
            "language": "bilingual",
            "communication_method": "tablet",
            "interaction_summary": "Questions answered",
        },
        actor_user_id="user-1",
    )
    svc.upsert_legal_artifact_screen(
        tenant_id="tenant-1",
        case_id=case_id,
        screen="refusal_confirmation",
        payload={
            "refusal_reason": "Family prefers transfer delay",
            "alternative_plan_offered": True,
            "witness_present": True,
        },
        actor_user_id="user-1",
    )
    svc.upsert_legal_artifact_screen(
        tenant_id="tenant-1",
        case_id=case_id,
        screen="final_review",
        payload={
            "reviewer_name": "Legal Admin",
            "reviewer_role": "legal_admin",
            "review_summary": "All sections reviewed",
        },
        actor_user_id="user-1",
    )

    svc.record_legal_signature(
        tenant_id="tenant-1",
        case_id=case_id,
        role="patient",
        signature_value="patient-sign",
        signer_name="Patient One",
        signer_role="patient",
        ip_address="10.0.0.1",
        actor_user_id="user-1",
    )
    svc.record_legal_signature(
        tenant_id="tenant-1",
        case_id=case_id,
        role="physician",
        signature_value="physician-sign",
        signer_name="Dr. House",
        signer_role="physician",
        ip_address="10.0.0.2",
        actor_user_id="user-1",
    )
    svc.record_legal_signature(
        tenant_id="tenant-1",
        case_id=case_id,
        role="witness",
        signature_value="witness-sign",
        signer_name="Witness One",
        signer_role="witness",
        ip_address="10.0.0.3",
        actor_user_id="user-1",
    )

    with pytest.raises(ValueError, match="signature.guardian"):
        svc.finalize_legal_artifact(
            tenant_id="tenant-1",
            case_id=case_id,
            actor_user_id="user-1",
            confirm_all_sections_complete=True,
        )

    svc.record_legal_signature(
        tenant_id="tenant-1",
        case_id=case_id,
        role="guardian",
        signature_value="guardian-sign",
        signer_name="Guardian One",
        signer_role="guardian",
        ip_address="10.0.0.4",
        actor_user_id="user-1",
    )

    finalized = svc.finalize_legal_artifact(
        tenant_id="tenant-1",
        case_id=case_id,
        actor_user_id="user-1",
        confirm_all_sections_complete=True,
    )
    assert finalized["immutable_lock"] is True
    assert finalized["missing_requirements"] == []

    with pytest.raises(ValueError, match="immutable"):
        svc.upsert_legal_artifact_screen(
            tenant_id="tenant-1",
            case_id=case_id,
            screen="final_review",
            payload={"review_summary": "Edit should fail"},
            actor_user_id="user-1",
        )


def test_escalation_state_reaches_48h(db_session_local):
    created = _create_case()
    case_id = created["case_id"]

    old_decision = (datetime.utcnow() - timedelta(hours=49)).isoformat()
    svc.upsert_legal_artifact_screen(
        tenant_id="tenant-1",
        case_id=case_id,
        screen="clinical_decision",
        payload={
            "discharge_decision_at": old_decision,
            "clinical_rationale": "No clinical contraindication to discharge",
            "capacity_assessment": {
                "outcome": "has_capacity",
                "notes": "Patient oriented",
                "assessed_by": "Dr. House",
            },
        },
        actor_user_id="user-1",
    )

    status = svc.get_legal_artifact_status(tenant_id="tenant-1", case_id=case_id)
    assert status["escalation_state"] == "escalated_48h"
    assert status["status"] == "LEGAL_ESCALATED"

    second_status = svc.get_legal_artifact_status(tenant_id="tenant-1", case_id=case_id)
    assert second_status["escalation_state"] == "escalated_48h"

    db = db_session_local()
    try:
        workflow = db.query(DischargeRefusalWorkflow).filter(DischargeRefusalWorkflow.case_id == case_id).one()
        notifications = db.query(WorkflowNotification).filter(WorkflowNotification.case_id == case_id).all()

        assert workflow.current_stage == "escalation"
        assert workflow.status == "escalated"
        assert sorted({item.recipient_team_code for item in notifications if item.recipient_team_code}) == ["compliance", "legal_admin"]
        assert len(notifications) == 8
    finally:
        db.close()


def test_legal_notification_triggers_once_at_24h(db_session_local):
    created = _create_case()
    case_id = created["case_id"]

    old_decision = (datetime.utcnow() - timedelta(hours=25)).isoformat()
    svc.upsert_legal_artifact_screen(
        tenant_id="tenant-1",
        case_id=case_id,
        screen="clinical_decision",
        payload={
            "discharge_decision_at": old_decision,
            "clinical_rationale": "Patient continues to refuse discharge pathway",
            "capacity_assessment": {
                "outcome": "has_capacity",
                "notes": "Patient understands material risks",
                "assessed_by": "Dr. House",
            },
        },
        actor_user_id="user-1",
    )

    first_status = svc.get_legal_artifact_status(tenant_id="tenant-1", case_id=case_id)
    second_status = svc.get_legal_artifact_status(tenant_id="tenant-1", case_id=case_id)

    assert first_status["escalation_state"] == "legal_notification_24h"
    assert second_status["escalation_state"] == "legal_notification_24h"
    assert first_status["status"] != "LEGAL_ESCALATED"

    db = db_session_local()
    try:
        workflow = db.query(DischargeRefusalWorkflow).filter(DischargeRefusalWorkflow.case_id == case_id).one()
        notifications = db.query(WorkflowNotification).filter(WorkflowNotification.case_id == case_id).all()

        assert workflow.current_stage == "initial_communication"
        assert workflow.status == "active"
        assert workflow.escalated_at is None
        assert sorted({item.channel for item in notifications}) == ["email", "in_app"]
        assert sorted({item.recipient_team_code for item in notifications if item.recipient_team_code}) == ["legal_admin"]
        assert len(notifications) == 3
    finally:
        db.close()


def test_generated_legal_pdf_uses_canonical_document_and_signature_payload(db_session_local, monkeypatch):
    created = _create_case()
    case_id = created["case_id"]

    svc.upsert_legal_artifact_screen(
        tenant_id="tenant-1",
        case_id=case_id,
        screen="clinical_decision",
        payload={
            "discharge_decision_at": datetime.utcnow().isoformat(),
            "clinical_rationale": "Rationale",
            "capacity_assessment": {
                "outcome": "has_capacity",
                "assessed_by": "Dr. House",
            },
        },
        actor_user_id="user-1",
    )
    svc.record_legal_signature(
        tenant_id="tenant-1",
        case_id=case_id,
        role="patient",
        signature_value="data:image/png;base64,AAAABBBB",
        signer_name="Patient One",
        signer_role="patient",
        ip_address="10.0.0.11",
        actor_user_id="user-1",
    )
    svc.record_legal_signature(
        tenant_id="tenant-1",
        case_id=case_id,
        role="physician",
        signature_value="data:image/png;base64,CCCCDDDD",
        signer_name="Dr. House",
        signer_role="physician",
        ip_address="10.0.0.12",
        actor_user_id="user-1",
    )
    svc.record_legal_signature(
        tenant_id="tenant-1",
        case_id=case_id,
        role="witness",
        signature_value="data:image/png;base64,EEEFFFFF",
        signer_name="Witness",
        signer_role="witness",
        ip_address="10.0.0.13",
        actor_user_id="user-1",
    )

    monkeypatch.setattr(
        svc,
        "render_html_to_pdf",
        lambda *, html_content, output_path, title: {
            "engine": "mock",
            "output": str(output_path),
            "title": title,
        },
    )

    result = svc.generate_legal_artifact_pdf(tenant_id="tenant-1", case_id=case_id)
    assert result["file_name"].endswith(".pdf")

    db = db_session_local()
    try:
        doc = (
            db.query(DischargeWorkflowDocument)
            .filter(
                DischargeWorkflowDocument.case_id == case_id,
                DischargeWorkflowDocument.template_key == "legal_discharge_artifact",
            )
            .first()
        )
        assert doc is not None
        assert "data:image/png;base64,AAAABBBB" in (doc.html_content or "")
    finally:
        db.close()
