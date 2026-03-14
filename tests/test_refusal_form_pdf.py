"""
Tests for the bilingual PDF form generation module
====================================================
Covers:
- pdf_service.validate_form_data(): all validation rules
- pdf_service.render_html(): Jinja2 template rendering for all 3 forms
- pdf_service._build_template_context(): nested accessor API
- GET /refusal-forms/{id}/pdf endpoint: happy path + validation failure + 404
- POST /refusal-forms with physician fields: stored in form_data
- WeasyPrint is mocked so tests run without the system PDF rendering stack
"""

from unittest.mock import MagicMock, patch

import pytest

from app.services import pdf_service

# ---------------------------------------------------------------------------
# Shared test data
# ---------------------------------------------------------------------------

VALID_FORM_DATA = {
    "patient_name": "Mohammed Al-Harbi",
    "national_id": "1098765432",
    "date_of_birth": "1985-03-15",
    "gender": "male",
    "patient_phone": "+966501234567",
    "mrn": "ABCD1234",
    "procedure_description": "Cardiac catheterization",
    "refusal_reason": "Patient declines at this time",
    "physician_name": "Dr. Khalid Al-Rashid",
    "physician_specialty": "Cardiology",
    "physician_license_number": "SAU-MED-12345",
    "department": "Cardiology / Ward 3 / Room 14",
    "icd11_codes": ["I10", "E11.9"],
    "consent_id": "abc12345-1111-2222-3333-def678901234",
    "consent_type": "discharge",
    "form_number": "WQ-RF-ABC12345",
    "form_version": "v1.0",
    "generated_date": "2026-03-14",
    "generated_time": "00:30 UTC",
    "hospital_name": "WathiqCare General Hospital",
    "observation_hours_required": 24,
    "high_risk_flag": False,
    "financial_liability_statement": "The patient assumes full liability.",
    "acknowledgment_date": "2026-03-14T00:30:00+00:00",
}


# ---------------------------------------------------------------------------
# Module-level fixture (mirrors pattern in test_refusal_forms.py)
# ---------------------------------------------------------------------------

@pytest.fixture()
def refused_consent_pdf(db, sample_patient, doctor_user):
    """A refused consent for use in PDF endpoint tests."""
    from app.schemas.consent import ConsentCreate, ConsentUpdate
    from app.services.consent_service import create_consent, update_consent_status

    consent = create_consent(
        db,
        ConsentCreate(
            patient_id=sample_patient.id,
            consent_type="discharge",
            icd11_codes=["I10", "E11.9"],
            procedure_description="Cardiac catheterization",
        ),
        doctor_user.id,
    )
    update_consent_status(
        db, consent.id,
        ConsentUpdate(status="refused", refusal_reason="Patient declines"),
        doctor_user.id,
    )
    db.refresh(consent)
    return consent


def _generate_form(client, consent, token, form_type="medical_discharge_refusal"):
    """Helper: POST /refusal-forms with full physician info."""
    return client.post(
        "/refusal-forms",
        json={
            "consent_id": consent.id,
            "form_type": form_type,
            "physician_name": "Dr. Khalid Al-Rashid",
            "physician_specialty": "Cardiology",
            "physician_license_number": "SAU-MED-12345",
            "department": "Cardiology / Ward 3",
            "risk_summary": "Risk of deterioration if discharged without supervision.",
            "alternatives_offered": "Home monitoring program, follow-up in 48 hours.",
            "hospital_name": "WathiqCare General Hospital",
        },
        headers={"Authorization": f"Bearer {token}"},
    ).json()


# ---------------------------------------------------------------------------
# 1. validate_form_data — all validation rules
# ---------------------------------------------------------------------------

class TestValidateFormData:
    def test_valid_data_passes(self):
        pdf_service.validate_form_data(VALID_FORM_DATA, "medical_discharge_refusal")

    def test_missing_patient_name_raises(self):
        data = {**VALID_FORM_DATA, "patient_name": ""}
        with pytest.raises(ValueError, match="patient_name"):
            pdf_service.validate_form_data(data, "medical_discharge_refusal")

    def test_missing_national_id_raises(self):
        data = {**VALID_FORM_DATA, "national_id": None}
        with pytest.raises(ValueError, match="national_id"):
            pdf_service.validate_form_data(data, "medical_discharge_refusal")

    def test_missing_procedure_description_raises(self):
        data = {**VALID_FORM_DATA, "procedure_description": ""}
        with pytest.raises(ValueError, match="procedure_description"):
            pdf_service.validate_form_data(data, "medical_discharge_refusal")

    def test_missing_refusal_reason_raises(self):
        data = {**VALID_FORM_DATA, "refusal_reason": ""}
        with pytest.raises(ValueError, match="refusal_reason"):
            pdf_service.validate_form_data(data, "financial_responsibility_notice")

    def test_missing_physician_name_raises(self):
        data = {**VALID_FORM_DATA, "physician_name": ""}
        with pytest.raises(ValueError, match="physician_name"):
            pdf_service.validate_form_data(data, "procedure_refusal")

    def test_unknown_form_type_raises(self):
        with pytest.raises(ValueError, match="No PDF template registered"):
            pdf_service.validate_form_data(VALID_FORM_DATA, "nonexistent_form")

    def test_multiple_errors_aggregated(self):
        data = {**VALID_FORM_DATA, "patient_name": "", "physician_name": ""}
        with pytest.raises(ValueError) as exc_info:
            pdf_service.validate_form_data(data, "medical_discharge_refusal")
        msg = str(exc_info.value)
        assert "patient_name" in msg
        assert "physician_name" in msg

    def test_all_three_form_types_validate(self):
        for form_type in [
            "medical_discharge_refusal",
            "procedure_refusal",
            "financial_responsibility_notice",
        ]:
            pdf_service.validate_form_data(VALID_FORM_DATA, form_type)


# ---------------------------------------------------------------------------
# 2. _build_template_context — nested accessor API
# ---------------------------------------------------------------------------

class TestBuildTemplateContext:
    def test_patient_nested_block(self):
        ctx = pdf_service._build_template_context(VALID_FORM_DATA)
        assert ctx["patient"]["full_name"] == "Mohammed Al-Harbi"
        assert ctx["patient"]["national_id"] == "1098765432"
        assert ctx["patient"]["mrn"] == "ABCD1234"
        assert ctx["patient"]["phone"] == "+966501234567"

    def test_physician_nested_block(self):
        ctx = pdf_service._build_template_context(VALID_FORM_DATA)
        assert ctx["physician"]["full_name"] == "Dr. Khalid Al-Rashid"
        assert ctx["physician"]["specialty"] == "Cardiology"
        assert ctx["physician"]["license_number"] == "SAU-MED-12345"
        assert ctx["physician"]["department"] == "Cardiology / Ward 3 / Room 14"

    def test_consent_nested_block(self):
        ctx = pdf_service._build_template_context(VALID_FORM_DATA)
        assert ctx["consent"]["diagnosis"] == "Cardiac catheterization"
        assert ctx["consent"]["icd11_codes"] == ["I10", "E11.9"]

    def test_refusal_nested_block(self):
        ctx = pdf_service._build_template_context(VALID_FORM_DATA)
        assert ctx["refusal"]["reason"] == "Patient declines at this time"
        assert ctx["refusal"]["observation_hours"] == 24

    def test_flat_keys_preserved(self):
        ctx = pdf_service._build_template_context(VALID_FORM_DATA)
        assert ctx["patient_name"] == "Mohammed Al-Harbi"
        assert ctx["form_number"] == "WQ-RF-ABC12345"

    def test_hospital_name_default(self):
        data = {k: v for k, v in VALID_FORM_DATA.items() if k != "hospital_name"}
        ctx = pdf_service._build_template_context(data)
        assert ctx["hospital_name"] == "WathiqCare Hospital"


# ---------------------------------------------------------------------------
# 3. render_html — Jinja2 template rendering
# ---------------------------------------------------------------------------

class TestRenderHtml:
    def test_medical_discharge_refusal_renders(self):
        html = pdf_service.render_html("medical_discharge_refusal", VALID_FORM_DATA)
        assert "Mohammed Al-Harbi" in html
        assert "1098765432" in html
        assert "Dr. Khalid Al-Rashid" in html
        assert "Cardiac catheterization" in html
        assert "Medical Discharge Refusal Form" in html
        assert "رفض الخروج" in html

    def test_procedure_refusal_renders(self):
        html = pdf_service.render_html("procedure_refusal", VALID_FORM_DATA)
        assert "Mohammed Al-Harbi" in html
        assert "Procedure / Treatment Consent Refusal Form" in html
        assert "رفض إجراء طبي" in html
        assert "I10" in html

    def test_financial_notice_renders(self):
        html = pdf_service.render_html("financial_responsibility_notice", VALID_FORM_DATA)
        assert "Financial Responsibility Notice" in html
        assert "المسؤولية المالية" in html
        assert "The patient assumes full liability." in html

    def test_icd_codes_rendered(self):
        html = pdf_service.render_html("medical_discharge_refusal", VALID_FORM_DATA)
        assert "I10" in html
        assert "E11.9" in html

    def test_signature_sections_present(self):
        for form_type in [
            "medical_discharge_refusal",
            "procedure_refusal",
            "financial_responsibility_notice",
        ]:
            html = pdf_service.render_html(form_type, VALID_FORM_DATA)
            assert "Patient / Guardian Signature" in html
            assert "توقيع المريض" in html
            assert "Attending Physician Signature" in html
            assert "Witness Signature" in html
            assert "رفض التوقيع" in html

    def test_form_footer_metadata_present(self):
        html = pdf_service.render_html("medical_discharge_refusal", VALID_FORM_DATA)
        assert "WQ-RF-ABC12345" in html
        assert "v1.0" in html

    def test_unknown_form_type_raises(self):
        with pytest.raises(ValueError, match="No template registered"):
            pdf_service.render_html("invalid_type", VALID_FORM_DATA)

    def test_high_risk_flag_shown_in_procedure_form(self):
        data = {**VALID_FORM_DATA, "high_risk_flag": True}
        html = pdf_service.render_html("procedure_refusal", data)
        assert "HIGH-RISK" in html

    def test_refused_to_sign_section_bilingual(self):
        html = pdf_service.render_html("financial_responsibility_notice", VALID_FORM_DATA)
        assert "رفض التوقيع" in html


# ---------------------------------------------------------------------------
# 4. render_pdf — WeasyPrint mocked via weasyprint.HTML
# ---------------------------------------------------------------------------

class TestRenderPdf:
    def test_render_pdf_calls_weasyprint(self):
        """render_pdf invokes WeasyPrint with the rendered HTML."""
        mock_html_instance = MagicMock()
        mock_html_instance.write_pdf.return_value = b"%PDF-1.4 mock"

        with patch("weasyprint.HTML") as mock_html_cls:
            mock_html_cls.return_value = mock_html_instance
            result = pdf_service.render_pdf("medical_discharge_refusal", VALID_FORM_DATA)

        assert result == b"%PDF-1.4 mock"
        mock_html_cls.assert_called_once()
        call_kwargs = mock_html_cls.call_args[1]
        assert "string" in call_kwargs
        assert "Mohammed Al-Harbi" in call_kwargs["string"]

    def test_render_pdf_fails_validation_before_weasyprint(self):
        """WeasyPrint must NOT be called if validation fails."""
        data = {**VALID_FORM_DATA, "patient_name": "", "physician_name": ""}
        with patch("weasyprint.HTML") as mock_html_cls:
            with pytest.raises(ValueError, match="validation failed"):
                pdf_service.render_pdf("medical_discharge_refusal", data)
        mock_html_cls.assert_not_called()

    def test_render_pdf_all_three_forms(self):
        """render_pdf completes (with mock) for all three form types."""
        mock_html_instance = MagicMock()
        mock_html_instance.write_pdf.return_value = b"%PDF-mock"
        with patch("weasyprint.HTML", return_value=mock_html_instance):
            for form_type in [
                "medical_discharge_refusal",
                "procedure_refusal",
                "financial_responsibility_notice",
            ]:
                result = pdf_service.render_pdf(form_type, VALID_FORM_DATA)
                assert result == b"%PDF-mock"


# ---------------------------------------------------------------------------
# 5. PDF endpoint — GET /refusal-forms/{id}/pdf
# ---------------------------------------------------------------------------

class TestPdfEndpoint:
    def test_pdf_endpoint_happy_path(self, client, refused_consent_pdf, doctor_token):
        """GET /refusal-forms/{id}/pdf returns application/pdf (WeasyPrint mocked)."""
        form = _generate_form(client, refused_consent_pdf, doctor_token)

        mock_html_instance = MagicMock()
        mock_html_instance.write_pdf.return_value = b"%PDF-1.4 mock"

        with patch("weasyprint.HTML", return_value=mock_html_instance):
            response = client.get(
                f"/refusal-forms/{form['id']}/pdf",
                headers={"Authorization": f"Bearer {doctor_token}"},
            )

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert "attachment" in response.headers.get("content-disposition", "")
        assert response.content == b"%PDF-1.4 mock"

    def test_pdf_endpoint_404_for_unknown_form(self, client, refused_consent_pdf, doctor_token):
        response = client.get(
            "/refusal-forms/00000000-0000-0000-0000-000000000000/pdf",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 404

    def test_pdf_endpoint_422_when_physician_missing(
        self, client, refused_consent_pdf, doctor_token
    ):
        """Form without physician_name → PDF endpoint returns 422."""
        form = client.post(
            "/refusal-forms",
            json={
                "consent_id": refused_consent_pdf.id,
                "form_type": "medical_discharge_refusal",
                # No physician_name → PDF validation will fail
            },
            headers={"Authorization": f"Bearer {doctor_token}"},
        ).json()

        with patch("weasyprint.HTML") as mock_html_cls:
            response = client.get(
                f"/refusal-forms/{form['id']}/pdf",
                headers={"Authorization": f"Bearer {doctor_token}"},
            )
        assert response.status_code == 422
        assert "physician_name" in response.json()["detail"]
        mock_html_cls.assert_not_called()

    def test_pdf_endpoint_unauthenticated(self, client):
        response = client.get("/refusal-forms/some-id/pdf")
        assert response.status_code == 401

    def test_physician_fields_stored_in_form_data(
        self, client, refused_consent_pdf, doctor_token
    ):
        """Physician info from POST /refusal-forms is persisted in form_data."""
        form = _generate_form(client, refused_consent_pdf, doctor_token)
        fd = form["form_data"]
        assert fd["physician_name"] == "Dr. Khalid Al-Rashid"
        assert fd["physician_specialty"] == "Cardiology"
        assert fd["physician_license_number"] == "SAU-MED-12345"
        assert fd["department"] == "Cardiology / Ward 3"
        assert fd["risk_summary"] == "Risk of deterioration if discharged without supervision."
        assert fd["hospital_name"] == "WathiqCare General Hospital"

    def test_mrn_and_form_number_in_form_data(
        self, client, refused_consent_pdf, doctor_token, sample_patient
    ):
        """form_data includes MRN (from patient.id) and form_number."""
        form = _generate_form(client, refused_consent_pdf, doctor_token)
        fd = form["form_data"]
        assert fd["mrn"] == sample_patient.id[:8].upper()
        assert fd["form_number"].startswith("WQ-RF-")
        assert fd["form_version"] == "v1.0"
        assert fd["generated_date"]
        assert fd["generated_time"]

    def test_pdf_for_all_three_form_types(self, client, refused_consent_pdf, doctor_token):
        """All 3 form types render to PDF without error (WeasyPrint mocked)."""
        mock_html_instance = MagicMock()
        mock_html_instance.write_pdf.return_value = b"%PDF-mock"

        for form_type in [
            "medical_discharge_refusal",
            "procedure_refusal",
            "financial_responsibility_notice",
        ]:
            form = _generate_form(client, refused_consent_pdf, doctor_token, form_type)
            with patch("weasyprint.HTML", return_value=mock_html_instance):
                response = client.get(
                    f"/refusal-forms/{form['id']}/pdf",
                    headers={"Authorization": f"Bearer {doctor_token}"},
                )
            assert response.status_code == 200, f"Failed for {form_type}: {response.text}"
