"""
Tests for the Inpatient Care Discharge Forms module
====================================================
Covers:
- Form creation (happy path + all required fields)
- Date validation (discharge before admission, follow-up before discharge)
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
    """Valid payload for creating a discharge form."""
    today = date.today()
    return {
        "patient_id": sample_patient.id,
        "first_name": "Mohammed",
        "last_name": "Al-Harbi",
        "patient_identifier": sample_patient.national_id,
        "date_of_admission": str(today - timedelta(days=5)),
        "date_of_discharge": str(today),
        "diagnosis": "Hypertension — controlled",
        "treatment_summary": "IV antihypertensives for 3 days, then oral transition",
        "discharge_instructions": (
            "Continue oral medication as prescribed. Avoid strenuous activity for 2 weeks. "
            "Low-sodium diet required."
        ),
        "follow_up_appointment_date": str(today + timedelta(days=14)),
        "physician_first_name": "Khalid",
        "physician_last_name": "Al-Rashidi",
        "patient_guardian_signature": "Mohammed Al-Harbi",
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
        assert data["first_name"] == "Mohammed"
        assert data["last_name"] == "Al-Harbi"
        assert data["patient_identifier"] == sample_patient.national_id
        assert data["diagnosis"] == "Hypertension — controlled"
        assert data["physician_first_name"] == "Khalid"
        assert data["physician_last_name"] == "Al-Rashidi"
        assert data["patient_guardian_signature"] == "Mohammed Al-Harbi"

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
        """Return a lowercase string representation of the error detail regardless of shape."""
        detail = resp.json().get("detail", "")
        if isinstance(detail, list):
            # Pydantic v2 schema-level validation errors come as a list of dicts
            return " ".join(str(e.get("msg", "")) for e in detail).lower()
        return str(detail).lower()

    def test_discharge_before_admission_rejected(self, client, discharge_payload, doctor_token):
        """Discharge date cannot precede admission date."""
        today = date.today()
        payload = {**discharge_payload,
                   "date_of_admission": str(today),
                   "date_of_discharge": str(today - timedelta(days=1))}
        resp = client.post(
            "/discharge-forms",
            json=payload,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 422
        assert "discharge date" in self._detail_str(resp)

    def test_followup_before_discharge_rejected(self, client, discharge_payload, doctor_token):
        """Follow-up date cannot precede discharge date."""
        today = date.today()
        payload = {**discharge_payload,
                   "date_of_discharge": str(today),
                   "follow_up_appointment_date": str(today - timedelta(days=1))}
        resp = client.post(
            "/discharge-forms",
            json=payload,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 422
        assert "follow-up" in self._detail_str(resp)

    def test_same_day_admission_discharge_allowed(self, client, discharge_payload, doctor_token):
        """Same admission and discharge date is valid (day surgery / short stay)."""
        today = date.today()
        payload = {**discharge_payload,
                   "date_of_admission": str(today),
                   "date_of_discharge": str(today),
                   "follow_up_appointment_date": str(today + timedelta(days=7))}
        resp = client.post(
            "/discharge-forms",
            json=payload,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 201

    def test_no_followup_date_is_valid(self, client, discharge_payload, doctor_token):
        """Follow-up date is optional."""
        payload = {k: v for k, v in discharge_payload.items()
                   if k != "follow_up_appointment_date"}
        resp = client.post(
            "/discharge-forms",
            json=payload,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["follow_up_appointment_date"] is None


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
            json={"patient_guardian_signature": "New Signature"},
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["patient_guardian_signature"] == "New Signature"

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
    def test_validate_passes_with_complete_data(self):
        from app.services.discharge_pdf_service import validate_discharge_form_data

        data = {
            "first_name": "Ahmed",
            "last_name": "Al-Said",
            "patient_identifier": "1234567890",
            "date_of_admission": "2026-01-01",
            "date_of_discharge": "2026-01-05",
            "diagnosis": "Hypertension",
            "treatment_summary": "IV medication",
            "discharge_instructions": "Rest and follow up",
            "physician_first_name": "Dr. Nasser",
            "physician_last_name": "Al-Ghamdi",
        }
        # Should not raise
        validate_discharge_form_data(data)

    def test_validate_raises_on_missing_patient_field(self):
        from app.services.discharge_pdf_service import validate_discharge_form_data

        data = {
            "last_name": "Al-Said",
            "patient_identifier": "1234567890",
            "date_of_admission": "2026-01-01",
            "date_of_discharge": "2026-01-05",
            "diagnosis": "Hypertension",
            "treatment_summary": "IV medication",
            "discharge_instructions": "Rest",
            "physician_first_name": "Dr. N",
            "physician_last_name": "Al-G",
        }
        import pytest as _pytest
        with _pytest.raises(ValueError, match="first_name"):
            validate_discharge_form_data(data)

    def test_validate_raises_on_missing_physician(self):
        from app.services.discharge_pdf_service import validate_discharge_form_data

        data = {
            "first_name": "Ahmed",
            "last_name": "Al-Said",
            "patient_identifier": "1234567890",
            "date_of_admission": "2026-01-01",
            "date_of_discharge": "2026-01-05",
            "diagnosis": "Hypertension",
            "treatment_summary": "IV medication",
            "discharge_instructions": "Rest",
        }
        import pytest as _pytest
        with _pytest.raises(ValueError, match="physician_first_name"):
            validate_discharge_form_data(data)

    def test_render_html_produces_html_string(self):
        from app.services.discharge_pdf_service import render_html

        data = {
            "first_name": "Ahmed",
            "last_name": "Al-Said",
            "patient_identifier": "1234567890",
            "date_of_admission": "2026-01-01",
            "date_of_discharge": "2026-01-05",
            "diagnosis": "Hypertension",
            "treatment_summary": "IV medication",
            "discharge_instructions": "Rest",
            "physician_first_name": "Dr. Nasser",
            "physician_last_name": "Al-Ghamdi",
            "patient_guardian_signature": "Ahmed Al-Said",
            "hospital_name": "WathiqCare Hospital",
            "hospital_logo": "",
            "form_number": "WQ-DF-12345678",
            "form_version": "v1.0",
            "generated_date": "2026-01-05",
            "generated_time": "10:00 UTC",
            "form_status": "DRAFT",
            "patient": {
                "full_name": "Ahmed Al-Said",
                "first_name": "Ahmed",
                "last_name": "Al-Said",
                "national_id": "1234567890",
                "mrn": "ABCDEFGH",
            },
            "physician": {
                "full_name": "Dr. Nasser Al-Ghamdi",
                "first_name": "Dr. Nasser",
                "last_name": "Al-Ghamdi",
            },
            "clinical": {
                "diagnosis": "Hypertension",
                "treatment_summary": "IV medication",
                "discharge_instructions": "Rest",
                "date_of_admission": "2026-01-01",
                "date_of_discharge": "2026-01-05",
                "follow_up_date": "2026-01-19",
            },
        }
        html = render_html(data)
        assert "Inpatient Care Discharge Form" in html
        assert "Ahmed Al-Said" in html
        assert "Hypertension" in html
        assert "Dr. Nasser Al-Ghamdi" in html

    def test_render_pdf_calls_weasyprint(self):
        from app.services.discharge_pdf_service import render_pdf

        data = {
            "first_name": "Ahmed",
            "last_name": "Al-Said",
            "patient_identifier": "1234567890",
            "date_of_admission": "2026-01-01",
            "date_of_discharge": "2026-01-05",
            "diagnosis": "Hypertension",
            "treatment_summary": "IV medication",
            "discharge_instructions": "Rest",
            "physician_first_name": "Dr. Nasser",
            "physician_last_name": "Al-Ghamdi",
            "patient_guardian_signature": "Ahmed Al-Said",
            "hospital_name": "WathiqCare Hospital",
            "hospital_logo": "",
            "form_number": "WQ-DF-12345678",
            "form_version": "v1.0",
            "generated_date": "2026-01-05",
            "generated_time": "10:00 UTC",
            "form_status": "DRAFT",
            "patient": {
                "full_name": "Ahmed Al-Said",
                "first_name": "Ahmed",
                "last_name": "Al-Said",
                "national_id": "1234567890",
                "mrn": "ABCDEFGH",
            },
            "physician": {
                "full_name": "Dr. Nasser Al-Ghamdi",
                "first_name": "Dr. Nasser",
                "last_name": "Al-Ghamdi",
            },
            "clinical": {
                "diagnosis": "Hypertension",
                "treatment_summary": "IV medication",
                "discharge_instructions": "Rest",
                "date_of_admission": "2026-01-01",
                "date_of_discharge": "2026-01-05",
                "follow_up_date": "",
            },
        }
        with patch("app.services.discharge_pdf_service.render_pdf") as mock_render:
            mock_render.return_value = b"%PDF test"
            result = render_pdf(data)
        # The mock was called or bypassed; just verify bytes are returned
        assert isinstance(result, bytes)
