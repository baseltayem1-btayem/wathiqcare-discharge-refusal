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
    db.add(Tenant(id="tenant-r", name="Hospital R", code="H-R", is_active=True))
    db.add(
        User(
            id="user-r",
            tenant_id="tenant-r",
            email="doctor@hospital.test",
            full_name="Dr. Readiness",
            role="doctor",
            hashed_password="hash",
        )
    )
    db.commit()
    db.close()

    return local


def _create_case(db=None) -> str:
    if db is None:
        raise ValueError("db argument required")
    created = legal_artifact_service.create_legal_artifact_case(
        db,
        tenant_id="tenant-r",
        actor_user_id="user-r",
        payload={
            "patient_mrn": "MRN-R-100",
            "patient_name": "Patient Readiness",
            "refusal_reason": "Needs observation",
            "attending_physician_name": "Dr. Readiness",
            "tenant_header": {
                "logo_url": "https://example.com/logo.png",
                "moh_license": "MOH-READINESS",
                "commercial_registration": "CR-READINESS",
            },
            "legal_footer_text": "Readiness footer",
        },
    )
    return str(created["case_id"])


def test_readiness_blocks_then_becomes_ready(db_session_local):
    db = db_session_local()
    case_id = _create_case(db)

    # Canonical lifecycle transitions.
    workflow_service.run_workflow_action(
        tenant_id="tenant-r",
        case_id=case_id,
        action="record_discharge_decision",
        payload={
            "discharge_decision_at": datetime.utcnow().isoformat(),
            "attending_physician": "Dr. Readiness",
            "discussion_summary": "Discharge explained",
            "refusal_reason": "Patient requested delay",
        },
        current_user={"id": "user-r", "email": "doctor@hospital.test"},
    )
    workflow_service.run_workflow_action(
        tenant_id="tenant-r",
        case_id=case_id,
        action="start_refusal_workflow",
        payload={},
        current_user={"id": "user-r", "email": "doctor@hospital.test"},
    )
    workflow_service.run_workflow_action(
        tenant_id="tenant-r",
        case_id=case_id,
        action="mark_patient_counseled",
        payload={},
        current_user={"id": "user-r", "email": "doctor@hospital.test"},
    )
    workflow_service.run_workflow_action(
        tenant_id="tenant-r",
        case_id=case_id,
        action="refer_social_services",
        payload={},
        current_user={"id": "user-r", "email": "doctor@hospital.test"},
    )

    initial_snapshot = workflow_service.get_workflow_snapshot(tenant_id="tenant-r", case_id=case_id)
    assert initial_snapshot["readiness"]["status"] in {
        "blocked_by_medical_tasks",
        "blocked_by_patient_interaction",
    }
    assert len(initial_snapshot["department_panel"]) >= 7

    # Populate cross-department completion evidence.
    legal_artifact_service.upsert_legal_artifact_screen(
        tenant_id="tenant-r",
        case_id=case_id,
        screen="patient_interaction",
        payload={
            "language": "bilingual",
            "communication_method": "tablet",
            "medication_reconciliation_completed": True,
            "lab_critical_results_cleared": True,
            "radiology_required": False,
        },
        actor_user_id="user-r",
    )
    legal_artifact_service.upsert_legal_artifact_screen(
        tenant_id="tenant-r",
        case_id=case_id,
        screen="final_review",
        payload={
            "reviewer_name": "Dr. Readiness",
            "reviewer_role": "doctor",
            "billing_clearance_completed": True,
            "legal_acknowledgment_completed": True,
        },
        actor_user_id="user-r",
    )
    legal_artifact_service.record_legal_signature(
        tenant_id="tenant-r",
        case_id=case_id,
        role="patient",
        signature_value="data:image/png;base64,AAAA",
        signer_name="Patient Readiness",
        signer_role="patient",
        ip_address="10.0.0.1",
        actor_user_id="user-r",
    )
    legal_artifact_service.record_legal_signature(
        tenant_id="tenant-r",
        case_id=case_id,
        role="physician",
        signature_value="data:image/png;base64,BBBB",
        signer_name="Dr. Readiness",
        signer_role="doctor",
        ip_address="10.0.0.2",
        actor_user_id="user-r",
    )
    legal_artifact_service.record_legal_signature(
        tenant_id="tenant-r",
        case_id=case_id,
        role="witness",
        signature_value="data:image/png;base64,CCCC",
        signer_name="Witness R",
        signer_role="witness",
        ip_address="10.0.0.3",
        actor_user_id="user-r",
    )

    final_snapshot = workflow_service.get_workflow_snapshot(tenant_id="tenant-r", case_id=case_id)
    assert final_snapshot["readiness"]["status"] == "ready_for_discharge"
    assert final_snapshot["readiness"]["can_finalize"] is True
    assert final_snapshot["readiness"]["missing_signature_requirements"] == []
