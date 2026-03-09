from backend.modules.governance.archive.archive_service import create_archive_entry
from backend.modules.governance.consent.consent_service import can_transition as consent_can_transition
from backend.modules.governance.intelligence.consent_intelligence_engine import (
    ConsentContext,
    ConsentIntelligenceEngine,
)
from backend.modules.governance.patient.patient_service import validate_patient_payload
from backend.modules.governance.roi.roi_service import can_transition as roi_can_transition
from backend.modules.governance.signature.signature_proof_service import SignatureProofService


def test_patient_payload_validation():
    validate_patient_payload({"full_name": "Patient One"})


def test_patient_payload_validation_requires_name():
    try:
        validate_patient_payload({})
        assert False, "Expected ValueError"
    except ValueError:
        assert True


def test_consent_lifecycle_transitions():
    assert consent_can_transition("DRAFT", "READY_FOR_REVIEW") is True
    assert consent_can_transition("SIGNED", "ARCHIVED") is True
    assert consent_can_transition("ARCHIVED", "DRAFT") is False


def test_consent_intelligence_recommendations():
    engine = ConsentIntelligenceEngine()
    result = engine.recommend(
        ConsentContext(
            high_risk=True,
            anesthesia=True,
            blood_products=True,
            service_model="home_healthcare",
            release_request_submitted=True,
            capacity_status="MINOR",
            signed_codes=["GENERAL_TREATMENT"],
        )
    )

    assert "SURGERY_INVASIVE" in result.required_consents
    assert "SEDATION_ANESTHESIA" in result.required_consents
    assert "BLOOD_TRANSFUSION" in result.required_consents
    assert "HOME_HEALTHCARE" in result.required_consents
    assert "ROI_AUTH" in result.required_consents
    assert "GUARDIAN_AUTHORIZATION" in result.required_consents
    assert "SURGERY_INVASIVE" in result.missing_consents


def test_signature_sms_mock_flow():
    service = SignatureProofService()
    init = service.start_sms("0501234567")
    assert init.status == "pending"

    verified = service.verify_sms("123456", "123456")
    assert verified.status == "verified"


def test_tablet_signature_flow():
    service = SignatureProofService()
    result = service.capture_tablet("data:image/png;base64,sample")
    assert result.status == "signed"


def test_archive_indexing_metadata():
    archive = create_archive_entry(
        tenant_id="tenant-1",
        patient_id="patient-1",
        case_id="case-1",
        form_number="IMC-001",
        form_title="General Treatment Consent",
        document_category="consent",
        pdf_attachment_id="/generated/governance/test.pdf",
        legal_document_flag=True,
    )

    assert archive.archive_status == "INDEXED"
    assert archive.legal_document_flag is True


def test_roi_flow_transitions():
    assert roi_can_transition("DRAFT", "IDENTITY_PENDING") is True
    assert roi_can_transition("IDENTITY_PENDING", "READY_FOR_REVIEW") is True
    assert roi_can_transition("READY_FOR_REVIEW", "APPROVED") is True
    assert roi_can_transition("APPROVED", "RELEASED") is True
    assert roi_can_transition("RELEASED", "ARCHIVED") is True


def test_discharge_module_regression_guard():
    from backend.modules.shc_discharge_compliance.shc_workflow_engine import SHCDischargeComplianceEngine

    assert SHCDischargeComplianceEngine is not None
