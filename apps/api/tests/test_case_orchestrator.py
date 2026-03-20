from __future__ import annotations

from backend.core.case_orchestrator import CaseOrchestrator
from backend.legal.escalation_engine import EscalationTier


def _new_case(orchestrator: CaseOrchestrator) -> dict:
    return orchestrator.create_case(
        patient_data={"patient_id": "P-ORCH-001"},
        discharge_order={
            "physician_id": "DR-ORCH-001",
            "diagnosis_codes": ["BA00"],
            "discharge_notes": "Stable for discharge.",
        },
    )


def test_case_creation(monkeypatch):
    monkeypatch.setattr(
        "backend.core.discharge_engine.generate_discharge_refusal_pdf",
        lambda **_: "/tmp/mock-refusal.pdf",
    )
    monkeypatch.setattr(
        "backend.core.discharge_engine.build_discharge_refusal_bundle",
        lambda **_: "/tmp/mock-bundle.zip",
    )

    orchestrator = CaseOrchestrator()
    created = _new_case(orchestrator)

    assert created["case_id"]
    assert created["order_id"]
    assert created["state"] == "DISCHARGE_ORDERED"


def test_refusal_recording(monkeypatch):
    monkeypatch.setattr(
        "backend.core.discharge_engine.generate_discharge_refusal_pdf",
        lambda **_: "/tmp/mock-refusal.pdf",
    )
    monkeypatch.setattr(
        "backend.core.discharge_engine.build_discharge_refusal_bundle",
        lambda **_: "/tmp/mock-bundle.zip",
    )

    orchestrator = CaseOrchestrator()
    created = _new_case(orchestrator)

    updated = orchestrator.record_refusal(
        created["case_id"],
        {
            "reason": "Patient requested additional home support.",
            "nurse_id": "NRS-ORCH-007",
            "witness_id": "WIT-ORCH-009",
        },
    )

    assert updated["refusal_id"]
    assert updated["refusal_form_id"]
    assert updated["state"] == "REFUSAL_RECORDED"


def test_escalation_trigger(monkeypatch):
    monkeypatch.setattr(
        "backend.core.discharge_engine.generate_discharge_refusal_pdf",
        lambda **_: "/tmp/mock-refusal.pdf",
    )
    monkeypatch.setattr(
        "backend.core.discharge_engine.build_discharge_refusal_bundle",
        lambda **_: "/tmp/mock-bundle.zip",
    )

    orchestrator = CaseOrchestrator()
    created = _new_case(orchestrator)
    orchestrator.record_refusal(
        created["case_id"],
        {
            "reason": "Patient refused discharge.",
            "nurse_id": "NRS-ORCH-007",
        },
    )

    escalated = orchestrator.escalate_case(created["case_id"], EscalationTier.TIER_24H)

    assert escalated["legal_case_id"]
    assert escalated["state"] == "LEGAL_REVIEW"
