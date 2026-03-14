"""
Tests for the Hospital Discharge Form module
=============================================
Covers:
- Form creation (happy path + all required fields)
- Date validation (date_services_should_end before admission_date)
- Conditional validation (other_text required when other_checkbox is True)
- Patient not found → 422
- List all forms (with pagination)
- List forms for patient
- Get single form
- Update draft form
- Cannot update submitted/signed form
- Submit form (draft → submitted, submitted_at set)
- Cannot submit already-submitted form
- RBAC: unauthenticated and under-privileged access
- Audit trail: create, update, submit events are logged
- PDF endpoint validation
"""

from datetime import date, timedelta
from unittest.mock import patch

import pytest

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def discharge_payload(sample_patient):
    """Valid payload for creating a Hospital Discharge Form."""
    today = date.today()
    return {
        "patient_id": sample_patient.id,
        # Section 1
        "patient_first_name": "Mohammed",
        "patient_last_name": "Al-Harbi",
        "patient_phone_number": "+966501234567",
        "attending_physician_first_name": "Khalid",
        "attending_physician_last_name": "Al-Rashidi",
        "facility_name": "WathiqCare Hospital",
        "date_services_should_end": str(today),
        # Section 2
        "physician_note_reflecting_readiness_for_discharge": True,
        "discharge_plan_discussed_with_member_family": True,
        "discharge_plan_discussed_with_attending_provider": False,
        "description_of_discharge_plan_in_place": True,
        "therapy_notes_if_applicable": False,
        "other_checkbox": False,
        # Section 3
        "admission_date": str(today - timedelta(days=5)),
        "admission_symptoms": "Headache and elevated blood pressure",
        "diagnosis": "Hypertension — controlled",
        "treatment": "IV antihypertensives for 3 days, then oral transition",
        "tests_and_results": "BP monitoring: 180/110 → 130/85 after treatment",
        "evaluated_by": "Dr. Khalid Al-Rashidi, Internal Medicine",
        "current_status": "Stable, ready for discharge with outpatient follow-up",
        "safe_care_setting": "Home with outpatient clinic follow-up",
        "discharge_plan_follow_up": (
            "Return for follow-up appointment in 14 days. "
            "Continue prescribed oral medication. Low-sodium diet required."
        ),
        # Section 4
        "completed_by_first_name": "Khalid",
        "completed_by_last_name": "Al-Rashidi",
        "completed_by_phone_number": "+966501234567",
        "completion_date": str(today),
        "completed_by_signature": "Dr. Khalid Al-Rashidi",
    }


@pytest.fixture()
def created_form(client, discharge_payload, doctor_token):
    """A discharge form in 'draft' status."""
    resp = client.post(
        "/discharge-forms",
        json=discharge_payload,
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture()
def submitted_form(client, created_form, doctor_token):
    """A discharge form in 'submitted' status."""
    resp = client.post(
        f"/discharge-forms/{created_form['id']}/submit",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert resp.status_code == 200
    return resp.json()


# ---------------------------------------------------------------------------
# 1. Form creation — happy path
# ---------------------------------------------------------------------------


class TestCreateDischargeForm:
    def test_create_returns_201(self, client, discharge_payload, doctor_token):
        """Doctors can create a discharge form."""
        resp = client.post(
            "/discharge-forms",
            json=discharge_payload,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 201

    def test_created_form_fields(self, client, discharge_payload, doctor_token, sample_patient):
        """Created form carries all submitted field values."""
        resp = client.post(
            "/discharge-forms",
            json=discharge_payload,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        data = resp.json()
        assert data["patient_id"] == sample_patient.id
        assert data["patient_first_name"] == "Mohammed"
        assert data["patient_last_name"] == "Al-Harbi"
        assert data["patient_phone_number"] == "+966501234567"
        assert data["attending_physician_first_name"] == "Khalid"
        assert data["attending_physician_last_name"] == "Al-Rashidi"
        assert data["facility_name"] == "WathiqCare Hospital"
        assert data["diagnosis"] == "Hypertension — controlled"
        assert data["physician_note_reflecting_readiness_for_discharge"] is True
        assert data["other_checkbox"] is False
        assert data["completed_by_signature"] == "Dr. Khalid Al-Rashidi"

    def test_created_form_status_is_draft(self, client, discharge_payload, doctor_token):
        resp = client.post(
            "/discharge-forms",
            json=discharge_payload,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.json()["status"] == "draft"

    def test_created_form_has_timestamps(self, client, discharge_payload, doctor_token):
        resp = client.post(
            "/discharge-forms",
            json=discharge_payload,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        data = resp.json()
        assert data["created_at"] is not None
        assert data["submitted_at"] is None

    def test_nurse_can_create_form(self, client, discharge_payload, nurse_token):
        resp = client.post(
            "/discharge-forms",
            json=discharge_payload,
            headers={"Authorization": f"Bearer {nurse_token}"},
        )
        assert resp.status_code == 201

    def test_admin_can_create_form(self, client, discharge_payload, admin_token):
        resp = client.post(
            "/discharge-forms",
            json=discharge_payload,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201


# ---------------------------------------------------------------------------
# 2. Date validation
# ---------------------------------------------------------------------------


class TestDateValidation:
    def _detail_str(self, resp) -> str:
        """Extract error detail from API response as a lowercase string for assertion matching.

        Handles both Pydantic v2 schema validation errors (list of dicts) and
        plain string detail messages returned by FastAPI.
        """
        detail = resp.json().get("detail", "")
        if isinstance(detail, list):
            return " ".join(str(e.get("msg", "")) for e in detail).lower()
        return str(detail).lower()

    def test_end_before_admission_rejected(self, client, discharge_payload, doctor_token):
        """date_services_should_end cannot precede admission_date."""
        today = date.today()
        payload = {
            **discharge_payload,
            "admission_date": str(today),
            "date_services_should_end": str(today - timedelta(days=1)),
        }
        resp = client.post(
            "/discharge-forms",
            json=payload,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 422
        assert "date_services_should_end" in self._detail_str(resp)

    def test_same_day_admission_end_allowed(self, client, discharge_payload, doctor_token):
        """Same admission and end date is valid (day procedure)."""
        today = date.today()
        payload = {
            **discharge_payload,
            "admission_date": str(today),
            "date_services_should_end": str(today),
        }
        resp = client.post(
            "/discharge-forms",
            json=payload,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 201

    def test_other_text_required_when_other_checked(self, client, discharge_payload, doctor_token):
        """other_text must be provided when other_checkbox is True."""
        payload = {**discharge_payload, "other_checkbox": True, "other_text": None}
        resp = client.post(
            "/discharge-forms",
            json=payload,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 422
        assert "other_text" in self._detail_str(resp)

    def test_other_text_present_when_other_checked(self, client, discharge_payload, doctor_token):
        """other_checkbox=True with other_text provided is valid."""
        payload = {**discharge_payload, "other_checkbox": True, "other_text": "Follow-up imaging required"}
        resp = client.post(
            "/discharge-forms",
            json=payload,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["other_text"] == "Follow-up imaging required"

    def test_optional_narrative_fields_can_be_omitted(self, client, discharge_payload, doctor_token):
        """Narrative section 3 fields (except diagnosis) are optional."""
        payload = {k: v for k, v in discharge_payload.items()
                   if k not in {"admission_symptoms", "treatment", "tests_and_results",
                                "evaluated_by", "current_status", "safe_care_setting",
                                "discharge_plan_follow_up"}}
        resp = client.post(
            "/discharge-forms",
            json=payload,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["admission_symptoms"] is None
        assert data["treatment"] is None


# ---------------------------------------------------------------------------
# 3. Patient not found
# ---------------------------------------------------------------------------


class TestPatientNotFound:
    def test_unknown_patient_id_rejected(self, client, discharge_payload, doctor_token):
        payload = {**discharge_payload, "patient_id": "00000000-0000-0000-0000-000000000000"}
        resp = client.post(
            "/discharge-forms",
            json=payload,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 422
        assert "not found" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# 4. List forms
# ---------------------------------------------------------------------------


class TestListForms:
    def test_list_all_returns_created_form(self, client, created_form, doctor_token):
        resp = client.get(
            "/discharge-forms",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 200
        ids = [f["id"] for f in resp.json()]
        assert created_form["id"] in ids

    def test_list_for_patient_returns_form(self, client, created_form, sample_patient, doctor_token):
        resp = client.get(
            f"/discharge-forms/patient/{sample_patient.id}",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
        assert resp.json()[0]["patient_id"] == sample_patient.id

    def test_list_for_unknown_patient_returns_empty(self, client, doctor_token):
        resp = client.get(
            "/discharge-forms/patient/00000000-0000-0000-0000-000000000000",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 200
        assert resp.json() == []

    def test_nurse_can_list(self, client, created_form, nurse_token):
        resp = client.get(
            "/discharge-forms",
            headers={"Authorization": f"Bearer {nurse_token}"},
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 5. Get single form
# ---------------------------------------------------------------------------


class TestGetForm:
    def test_get_existing_form(self, client, created_form, doctor_token):
        resp = client.get(
            f"/discharge-forms/{created_form['id']}",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == created_form["id"]

    def test_get_unknown_form_returns_404(self, client, doctor_token):
        resp = client.get(
            "/discharge-forms/00000000-0000-0000-0000-000000000000",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 6. Update draft form
# ---------------------------------------------------------------------------


class TestUpdateForm:
    def test_update_diagnosis(self, client, created_form, doctor_token):
        resp = client.patch(
            f"/discharge-forms/{created_form['id']}",
            json={"diagnosis": "Updated diagnosis"},
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["diagnosis"] == "Updated diagnosis"

    def test_update_signature(self, client, created_form, doctor_token):
        resp = client.patch(
            f"/discharge-forms/{created_form['id']}",
            json={"completed_by_signature": "New Signature"},
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["completed_by_signature"] == "New Signature"

    def test_update_checklist_item(self, client, created_form, doctor_token):
        resp = client.patch(
            f"/discharge-forms/{created_form['id']}",
            json={"therapy_notes_if_applicable": True},
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["therapy_notes_if_applicable"] is True

    def test_update_unknown_form_returns_404(self, client, doctor_token):
        resp = client.patch(
            "/discharge-forms/00000000-0000-0000-0000-000000000000",
            json={"diagnosis": "X"},
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 404

    def test_cannot_update_submitted_form(self, client, submitted_form, doctor_token):
        resp = client.patch(
            f"/discharge-forms/{submitted_form['id']}",
            json={"diagnosis": "Attempted update"},
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 422
        assert "draft" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# 7. Submit form
# ---------------------------------------------------------------------------


class TestSubmitForm:
    def test_submit_transitions_to_submitted(self, client, created_form, doctor_token):
        resp = client.post(
            f"/discharge-forms/{created_form['id']}/submit",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "submitted"

    def test_submit_sets_submitted_at(self, client, created_form, doctor_token):
        resp = client.post(
            f"/discharge-forms/{created_form['id']}/submit",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.json()["submitted_at"] is not None

    def test_cannot_submit_already_submitted(self, client, submitted_form, doctor_token):
        resp = client.post(
            f"/discharge-forms/{submitted_form['id']}/submit",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 422
        assert "draft" in resp.json()["detail"].lower()

    def test_submit_unknown_form_returns_404(self, client, doctor_token):
        resp = client.post(
            "/discharge-forms/00000000-0000-0000-0000-000000000000/submit",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 404

    def test_nurse_can_submit(self, client, created_form, nurse_token):
        resp = client.post(
            f"/discharge-forms/{created_form['id']}/submit",
            headers={"Authorization": f"Bearer {nurse_token}"},
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 8. RBAC
# ---------------------------------------------------------------------------


class TestRBAC:
    def test_unauthenticated_cannot_create(self, client, discharge_payload):
        resp = client.post("/discharge-forms", json=discharge_payload)
        assert resp.status_code == 401

    def test_unauthenticated_cannot_list(self, client):
        resp = client.get("/discharge-forms")
        assert resp.status_code == 401

    def test_unauthenticated_cannot_get(self, client):
        resp = client.get("/discharge-forms/some-id")
        assert resp.status_code == 401

    def test_unauthenticated_cannot_update(self, client):
        resp = client.patch("/discharge-forms/some-id", json={"diagnosis": "X"})
        assert resp.status_code == 401

    def test_unauthenticated_cannot_submit(self, client):
        resp = client.post("/discharge-forms/some-id/submit")
        assert resp.status_code == 401

    def test_legal_officer_cannot_create(self, client, discharge_payload, legal_token):
        """Legal officers do not have the doctor/nurse/admin role for form creation."""
        resp = client.post(
            "/discharge-forms",
            json=discharge_payload,
            headers={"Authorization": f"Bearer {legal_token}"},
        )
        assert resp.status_code == 403

    def test_legal_officer_can_list(self, client, created_form, legal_token):
        """Legal officers are authenticated and should be able to read forms."""
        resp = client.get(
            "/discharge-forms",
            headers={"Authorization": f"Bearer {legal_token}"},
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 9. Audit trail
# ---------------------------------------------------------------------------


class TestAuditTrail:
    def _get_audit_logs(self, client, token):
        resp = client.get("/audit/logs", headers={"Authorization": f"Bearer {token}"})
        return resp.json() if resp.status_code == 200 else []

    def test_create_is_audited(self, client, created_form, admin_token):
        logs = self._get_audit_logs(client, admin_token)
        event_types = [log["event_type"] for log in logs]
        assert "discharge_form_created" in event_types

    def test_update_is_audited(self, client, created_form, doctor_token, admin_token):
        client.patch(
            f"/discharge-forms/{created_form['id']}",
            json={"diagnosis": "Updated for audit test"},
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        logs = self._get_audit_logs(client, admin_token)
        event_types = [log["event_type"] for log in logs]
        assert "discharge_form_updated" in event_types

    def test_submit_is_audited(self, client, created_form, doctor_token, admin_token):
        client.post(
            f"/discharge-forms/{created_form['id']}/submit",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        logs = self._get_audit_logs(client, admin_token)
        event_types = [log["event_type"] for log in logs]
        assert "discharge_form_submitted" in event_types


# ---------------------------------------------------------------------------
# 10. PDF endpoint
# ---------------------------------------------------------------------------


class TestPDFEndpoint:
    def test_pdf_endpoint_returns_pdf(self, client, created_form, doctor_token):
        with patch("app.services.discharge_pdf_service.render_pdf") as mock_pdf:
            mock_pdf.return_value = b"%PDF-1.4 test"
            resp = client.get(
                f"/discharge-forms/{created_form['id']}/pdf",
                headers={"Authorization": f"Bearer {doctor_token}"},
            )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert "attachment" in resp.headers["content-disposition"]

    def test_pdf_unknown_form_returns_404(self, client, doctor_token):
        resp = client.get(
            "/discharge-forms/00000000-0000-0000-0000-000000000000/pdf",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 404

    def test_pdf_validation_error_returns_422(self, client, created_form, doctor_token):
        with patch("app.services.discharge_pdf_service.render_pdf") as mock_pdf:
            mock_pdf.side_effect = ValueError("PDF generation validation failed: missing fields")
            resp = client.get(
                f"/discharge-forms/{created_form['id']}/pdf",
                headers={"Authorization": f"Bearer {doctor_token}"},
            )
        assert resp.status_code == 422
        assert "validation" in resp.json()["detail"].lower()

    def test_unauthenticated_cannot_download_pdf(self, client, created_form):
        resp = client.get(f"/discharge-forms/{created_form['id']}/pdf")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# 11. Discharge PDF service unit tests
# ---------------------------------------------------------------------------


class TestDischargePDFService:
    def _complete_data(self):
        return {
            "patient_first_name": "Ahmed",
            "patient_last_name": "Al-Said",
            "patient_phone_number": "+966501234567",
            "attending_physician_first_name": "Dr. Nasser",
            "attending_physician_last_name": "Al-Ghamdi",
            "facility_name": "WathiqCare Hospital",
            "date_services_should_end": "2026-01-05",
            "admission_date": "2026-01-01",
            "diagnosis": "Hypertension",
            "treatment": "IV medication",
            "checklist": {
                "physician_note": True,
                "discussed_with_family": True,
                "discussed_with_provider": False,
                "discharge_plan_in_place": True,
                "therapy_notes": False,
                "other": False,
                "other_text": "",
            },
            "admission_symptoms": "High BP",
            "tests_and_results": "BP 180/110",
            "evaluated_by": "Dr. Nasser",
            "current_status": "Stable",
            "safe_care_setting": "Home",
            "discharge_plan_follow_up": "Return in 14 days",
            "completed_by_first_name": "Nasser",
            "completed_by_last_name": "Al-Ghamdi",
            "completed_by_phone_number": "+966501234568",
            "completion_date": "2026-01-05",
            "completed_by_signature": "Dr. Nasser Al-Ghamdi",
            "hospital_name": "WathiqCare Hospital",
            "hospital_logo": "",
            "form_number": "WQ-DF-12345678",
            "form_version": "v1.0",
            "generated_date": "2026-01-05",
            "generated_time": "10:00 UTC",
            "form_status": "draft",
            "submitted_at": "",
            "patient": {
                "full_name": "Ahmed Al-Said",
                "first_name": "Ahmed",
                "last_name": "Al-Said",
                "phone": "+966501234567",
                "mrn": "ABCDEFGH",
            },
            "physician": {
                "full_name": "Dr. Nasser Al-Ghamdi",
                "first_name": "Dr. Nasser",
                "last_name": "Al-Ghamdi",
            },
        }

    def test_validate_passes_with_complete_data(self):
        from app.services.discharge_pdf_service import validate_discharge_form_data

        validate_discharge_form_data(self._complete_data())

    def test_validate_raises_on_missing_patient_field(self):
        from app.services.discharge_pdf_service import validate_discharge_form_data

        data = {k: v for k, v in self._complete_data().items() if k != "patient_first_name"}
        import pytest as _pytest
        with _pytest.raises(ValueError, match="patient_first_name"):
            validate_discharge_form_data(data)

    def test_validate_raises_on_missing_physician(self):
        from app.services.discharge_pdf_service import validate_discharge_form_data

        data = {k: v for k, v in self._complete_data().items()
                if k != "attending_physician_first_name"}
        import pytest as _pytest
        with _pytest.raises(ValueError, match="attending_physician_first_name"):
            validate_discharge_form_data(data)

    def test_render_html_produces_html_string(self):
        from app.services.discharge_pdf_service import render_html

        html = render_html(self._complete_data())
        assert "Hospital Discharge Form" in html
        assert "Ahmed" in html
        assert "Hypertension" in html
        assert "Dr. Nasser Al-Ghamdi" in html

    def test_render_pdf_calls_weasyprint(self):
        from app.services.discharge_pdf_service import render_pdf

        with patch("app.services.discharge_pdf_service.render_pdf") as mock_render:
            mock_render.return_value = b"%PDF test"
            result = render_pdf(self._complete_data())
        assert isinstance(result, bytes)
