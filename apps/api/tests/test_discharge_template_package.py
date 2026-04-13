from __future__ import annotations

from datetime import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import backend.models  # noqa: F401
from backend.core import discharge_workflow_service as workflow_service
from backend.core.database import Base
from backend.legal import legal_artifact_service
from backend.models.tenant import Tenant
from backend.models.user import User


@pytest.fixture()
def db_session_local(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    monkeypatch.setattr(legal_artifact_service, "SessionLocal", local)
    monkeypatch.setattr(workflow_service, "SessionLocal", local)

    db = local()
    db.add(Tenant(id="tenant-t", name="Hospital T", code="H-T", is_active=True))
    db.add(
        User(
            id="user-t",
            tenant_id="tenant-t",
            email="doctor@hospital.test",
            full_name="Dr. Template",
            role="doctor",
            hashed_password="hash",
        )
    )
    db.commit()
    db.close()

    return local


def _create_case() -> str:
    created = legal_artifact_service.create_legal_artifact_case(
        tenant_id="tenant-t",
        actor_user_id="user-t",
        payload={
            "patient_mrn": "MRN-T-100",
            "patient_name": "Patient Template",
            "refusal_reason": "Needs additional non-clinical support",
            "attending_physician_name": "Dr. Template",
            "tenant_header": {
                "logo_url": "https://example.com/logo.png",
                "moh_license": "MOH-T",
                "commercial_registration": "CR-T",
            },
            "legal_footer_text": "Template footer",
        },
    )
    return str(created["case_id"])


def _run(case_id: str, action: str, payload: dict | None = None):
    return workflow_service.run_workflow_action(
        tenant_id="tenant-t",
        case_id=case_id,
        action=action,
        payload=payload or {},
        current_user={"id": "user-t", "email": "doctor@hospital.test"},
    )


def test_closure_blocked_when_required_documents_missing(db_session_local):
    case_id = _create_case()

    _run(
        case_id,
        "record_discharge_decision",
        {
            "discharge_decision_at": datetime.utcnow().isoformat(),
            "attending_physician": "Dr. Template",
            "discussion_summary": "Discharge explained",
            "refusal_reason": "Patient requested delay",
        },
    )
    _run(case_id, "start_refusal_workflow")
    _run(case_id, "mark_patient_counseled")
    _run(case_id, "refer_social_services")
    _run(
        case_id,
        "generate_refusal_form",
        {
            "refusal_reason": "Patient requested delay",
            "patient_id_number": "1234567890",
            "room_number": "202A",
            "witness1_name": "Nurse 1",
            "witness1_role": "Nurse",
            "witness1_signature": "sig-1",
            "witness2_name": "Nurse 2",
            "witness2_role": "Nurse",
            "witness2_signature": "sig-2",
        },
    )
    _run(
        case_id,
        "generate_financial_notice",
        {
            "financial_notice_acknowledged": True,
            "patient_id_number": "1234567890",
            "room_number": "202A",
        },
    )

    with pytest.raises(ValueError, match="Missing required documents"):
        _run(case_id, "close_under_review")


def test_generate_required_package_then_close_succeeds(db_session_local):
    case_id = _create_case()

    _run(
        case_id,
        "record_discharge_decision",
        {
            "discharge_decision_at": datetime.utcnow().isoformat(),
            "attending_physician": "Dr. Template",
            "discussion_summary": "Discharge explained",
            "refusal_reason": "Patient requested delay",
        },
    )
    _run(case_id, "start_refusal_workflow")
    _run(case_id, "mark_patient_counseled")
    _run(case_id, "generate_initial_communication_form", {"next_action": "social_intervention"})
    _run(case_id, "refer_social_services")
    _run(
        case_id,
        "generate_social_intervention_form",
        {
            "referred_to_social_services": "yes",
            "intervention_details": "family meeting",
            "support_provided": "counseling",
            "intervention_result": "refusal persists",
            "staff_name": "Officer A",
            "date": "2026-04-13",
            "signature": "staff-sig",
        },
    )
    _run(
        case_id,
        "generate_refusal_form",
        {
            "refusal_reason": "Patient requested delay",
            "patient_id_number": "1234567890",
            "room_number": "202A",
            "witness1_name": "Nurse 1",
            "witness1_role": "Nurse",
            "witness1_signature": "sig-1",
            "witness2_name": "Nurse 2",
            "witness2_role": "Nurse",
            "witness2_signature": "sig-2",
        },
    )
    _run(
        case_id,
        "generate_witness_confirmation",
        {
            "witness_1_name": "Nurse 1",
            "witness_1_title": "Nurse",
            "witness_1_signature": "sig-1",
            "witness_2_name": "Nurse 2",
            "witness_2_title": "Nurse",
            "witness_2_signature": "sig-2",
        },
    )
    _run(
        case_id,
        "generate_financial_notice",
        {
            "financial_notice_acknowledged": True,
            "patient_id_number": "1234567890",
            "room_number": "202A",
        },
    )
    _run(case_id, "generate_closure_reports")

    result = _run(case_id, "close_under_review")

    assert result["workflow"]["status"] == "closed"
    assert result["workflow"]["missing_required_template_keys"] == []
