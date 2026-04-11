from __future__ import annotations

from pathlib import Path

import pytest

from backend.forms.workflow_templates import WORKFLOW_TEMPLATES
from backend.signature.evidence.evidence_bundle_builder import EvidenceBundleBuilder
from backend.signature.acknowledgment_engine import AcknowledgmentEngine, AcknowledgmentMethod
from backend.signature.providers.nafath_provider import NafathProvider
from backend.signature.providers.sms_otp_provider import SmsOtpProvider
from backend.signature.providers.tablet_signature_provider import TabletSignatureProvider
from backend.signature.signature_proof_service import _try_write_pdf
from backend.services.notifications.taqnyat_provider import TaqnyatProvider


def _sample_context() -> dict[str, str]:
    return {
        "patient_name": "Test Patient",
        "patient_id_number": "1234567890",
        "medical_record_number": "MRN-1001",
        "room_number": "202A",
        "attending_physician": "Dr. Ahmed",
        "discharge_decision_at": "2026-03-08T10:00:00",
        "discussion_summary": "Discussed medical readiness and options.",
        "refusal_reason": "Patient requested additional stay.",
        "social_administrative_interventions": "Patient affairs counseling.",
        "forms_issued": "Medical Discharge Refusal Form",
        "financial_notice_generated_at": "2026-03-08T10:10:00",
        "generated_at": "2026-03-08T10:10:00",
        "reference_number": "ACK-TEST-001",
    }


def test_official_templates_keep_approved_wording_markers():
    context = _sample_context()
    refusal_html = WORKFLOW_TEMPLATES["discharge_refusal_form"].renderer(context)
    financial_html = WORKFLOW_TEMPLATES["financial_responsibility_notice"].renderer(context)

    assert "Medical Discharge Refusal Form" in refusal_html
    assert "I acknowledge that I have received and understood the medical discharge decision" in refusal_html

    assert "Notification and Acknowledgment of Financial Responsibility for Refusal of Medical Discharge" in financial_html
    assert "This is to formally notify you that despite completion of medical discharge criteria" in financial_html


def test_sms_otp_stub_flow_verification_works(monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("WATHIQ_SMS_STUB_MODE", "true")
    provider = SmsOtpProvider()
    result = provider.send_otp("+966500000000", case_id="case-1", document_type="discharge_refusal_form")

    assert result.challenge_id
    assert result.delivery_status == "sent_stub"

    code = result.otp_debug_code
    assert code is not None

    expected_hash = provider.hash_code(code)
    assert provider.verify_otp(submitted_code=code, expected_hash=expected_hash) is True
    assert provider.verify_otp(submitted_code="000000", expected_hash=expected_hash) is False


def test_sms_otp_live_provider_dispatches_http(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("WATHIQ_SMS_STUB_MODE", raising=False)
    monkeypatch.setenv("SMS_PROVIDER", "taqnyat")
    monkeypatch.setenv("SMS_BEARER_TOKEN", "provider-key")
    monkeypatch.setenv("SMS_ENABLED", "true")

    captured: dict[str, object] = {}

    def _fake_send(self, to, message, *, message_type):
        captured["to"] = to
        captured["message"] = message
        captured["message_type"] = message_type
        return {"ok": True, "status_code": 201, "data": {"statusCode": 201}}

    monkeypatch.setattr("backend.signature.providers.sms_otp_provider.SmsService.send", _fake_send)

    provider = SmsOtpProvider()
    result = provider.send_otp("+966500000000", case_id="case-1", document_type="discharge_refusal_form")

    assert result.delivery_status == "sent"
    assert result.provider == "taqnyat"
    assert result.stub_mode is False
    assert result.otp_debug_code is not None
    assert captured["to"] == "+966500000000"
    assert result.otp_debug_code in str(captured["message"])
    assert captured["message_type"] == "transactional"


def test_sms_otp_stub_mode_is_rejected_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("WATHIQ_SMS_STUB_MODE", "true")

    provider = SmsOtpProvider()

    with pytest.raises(RuntimeError, match="not allowed in production"):
        provider.send_otp("+966500000000", case_id="case-1", document_type="discharge_refusal_form")


def test_taqnyat_normalizes_ksa_phone_numbers(monkeypatch):
    monkeypatch.setenv("SMS_BEARER_TOKEN", "provider-key")
    provider = TaqnyatProvider()

    assert provider.normalize_recipient("+966500000000") == "966500000000"
    assert provider.normalize_recipient("00966500000000") == "966500000000"
    assert provider.normalize_recipient("0500000000") == "966500000000"
    assert provider.normalize_recipient("500000000") == "966500000000"


def test_tablet_signature_capture_returns_proof_metadata():
    provider = TabletSignatureProvider()
    payload = "dGVzdC1zaWduYXR1cmU="
    result = provider.capture_signature(
        signature_payload=payload,
        witness_name="Staff Witness",
        operator_id="user-1",
    )

    assert result["verified"] is True
    assert result["signature_hash"]
    assert result["device_source"] == "TABLET"
    assert result["witness_name"] == "Staff Witness"


def test_nafath_placeholder_does_not_break_when_unconfigured(monkeypatch):
    monkeypatch.delenv("WATHIQ_NAFATH_ENABLED", raising=False)
    monkeypatch.delenv("WATHIQ_NAFATH_API_URL", raising=False)
    monkeypatch.delenv("WATHIQ_NAFATH_CLIENT_ID", raising=False)

    provider = NafathProvider()
    start = provider.start_verification(case_id="case-1", document_type="discharge_refusal_form", national_id=None)
    verify = provider.verify(request_id=start.request_id, payload={})

    assert provider.is_available() is False
    assert start.status == "unavailable"
    assert verify["verified"] is False
    assert verify["status"] == "unavailable"


def test_method_availability_safe_when_providers_unconfigured(monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("WATHIQ_SMS_STUB_MODE", "true")
    monkeypatch.delenv("WATHIQ_NAFATH_ENABLED", raising=False)
    monkeypatch.delenv("WATHIQ_NAFATH_API_URL", raising=False)
    monkeypatch.delenv("WATHIQ_NAFATH_CLIENT_ID", raising=False)

    engine = AcknowledgmentEngine(
        {
            AcknowledgmentMethod.SMS_OTP: SmsOtpProvider(),
            AcknowledgmentMethod.NAFATH: NafathProvider(),
            AcknowledgmentMethod.TABLET_SIGNATURE: TabletSignatureProvider(),
        }
    )
    methods = {item.method.value: item for item in engine.list_methods()}

    assert methods["SMS_OTP"].available is True
    assert methods["TABLET_SIGNATURE"].available is True
    assert methods["NAFATH"].available is False
    assert methods["NAFATH"].reason is not None


def test_evidence_bundle_created(tmp_path: Path):
    builder = EvidenceBundleBuilder(base_dir=tmp_path)
    evidence = builder.build(
        {
            "case_id": "case-1",
            "document_type": "discharge_refusal_form",
            "acknowledgment_method": "SMS_OTP",
            "proof_metadata": {
                "verification_method": "SMS_OTP",
                "otp_sent_at": "2026-03-08T10:00:00",
                "otp_verified_at": "2026-03-08T10:01:00",
            },
            "event_log": [
                {"action": "sms_otp_sent", "status": "success"},
                {"action": "sms_otp_verified", "status": "success"},
            ],
        }
    )
    path = builder.persist(case_id="case-1", session_id="session-1", evidence=evidence)

    assert evidence["bundle_hash"]
    assert evidence["proof_metadata"]["verification_method"] == "SMS_OTP"
    assert len(evidence["event_log"]) == 2
    assert Path(path).exists()


def test_final_pdf_generation_helper(tmp_path: Path):
    result = _try_write_pdf(
        case_id="case-test",
        template_key="discharge_refusal_form",
        html_content="<html><body><h1>Document</h1><p>Legal text.</p></body></html>",
    )
    if result is None:
        pytest.skip("reportlab is unavailable in this environment")

    _, pdf_path = result
    assert Path(pdf_path).exists()
