from __future__ import annotations

from pathlib import Path

from backend.modules.shc_discharge_compliance.shc_equipment_request import EquipmentRequest
from backend.modules.shc_discharge_compliance.shc_homecare_workflow import HomeCarePlan
from backend.modules.shc_discharge_compliance.shc_workflow_engine import (
    SHCDischargeComplianceEngine,
    SHCWorkflowInput,
)


def _input(**kwargs):
    base = {
        "case_id": "case-shc-001",
        "tenant_id": "tenant-001",
        "user_id": "user-001",
        "patient_name": "Test Patient",
        "patient_id_number": "1234567890",
        "medical_record_number": "MRN-001",
        "room_number": "410",
        "attending_physician": "Dr. Sami",
        "discharge_status": "refuse_discharge",
        "discharge_alternative": "home_care",
        "homecare_plan": HomeCarePlan(
            care_type="nursing",
            equipment_required=["oxygen"],
            care_provider="home_care_company",
        ),
        "signature_method": "sms_otp",
        "signature_device": "tablet",
        "ip_address": "10.0.0.20",
    }
    base.update(kwargs)
    return SHCWorkflowInput(**base)


def test_patient_refuses_discharge_generates_refusal_form(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "backend.modules.shc_discharge_compliance.shc_forms_generator.DOCUMENTS_DIR",
        tmp_path / "documents",
    )
    engine = SHCDischargeComplianceEngine()

    result = engine.run(_input())

    assert result["decision"] == "refuse_discharge"
    assert "refusal_of_discharge_form" in result["forms_generated"]
    assert result["escalated_to_legal"] is True


def test_home_care_plan_created(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "backend.modules.shc_discharge_compliance.shc_forms_generator.DOCUMENTS_DIR",
        tmp_path / "documents",
    )
    engine = SHCDischargeComplianceEngine()

    result = engine.run(_input())

    agreement_path = Path(result["forms_generated"]["home_care_agreement"])
    assert agreement_path.exists()


def test_equipment_requested_creates_temporary_approval_when_unavailable(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "backend.modules.shc_discharge_compliance.shc_forms_generator.DOCUMENTS_DIR",
        tmp_path / "documents",
    )
    engine = SHCDischargeComplianceEngine()

    result = engine.run(
        _input(
            equipment_request=EquipmentRequest(
                requested_equipment="Portable Ventilator",
                department="respiratory_therapy",
                status="unavailable",
            )
        )
    )

    equipment_request = result["equipment_request"]
    assert equipment_request["temporary_approval_required"] is True
    assert Path(equipment_request["temporary_approval"]).exists()


def test_financial_liability_signed(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "backend.modules.shc_discharge_compliance.shc_forms_generator.DOCUMENTS_DIR",
        tmp_path / "documents",
    )
    engine = SHCDischargeComplianceEngine()

    result = engine.run(
        _input(
            discharge_alternative="financial_responsibility",
            homecare_plan=None,
            transfer_request=None,
            financial_acknowledgment={"accepted": "true"},
            signature_method="tablet_signature",
        )
    )

    signature = result["signature"]
    assert signature is not None
    assert signature["signature_hash"]
    assert "financial_liability_notice" in result["forms_generated"]
