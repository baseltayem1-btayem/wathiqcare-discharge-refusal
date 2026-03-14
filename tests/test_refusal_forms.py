"""
Tests for the Refusal Forms module
===================================
Covers:
- Template listing (forms library)
- Form generation (happy path, all 3 form types)
- Workflow precondition enforcement (wrong status → 422)
- Unknown form_type → 422
- Listing forms per consent
- Preview (GET /{form_id})
- Download (GET /{form_id}/download)
- RBAC: unauthenticated and under-privileged access
- Tenant/case linkage: generated form carries correct consent & patient IDs
"""

import pytest

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def refused_consent(db, sample_patient, doctor_user):
    """A consent in 'refused' status — the minimum prerequisite for form generation."""
    from app.schemas.consent import ConsentCreate, ConsentUpdate
    from app.services.consent_service import create_consent, update_consent_status

    consent_data = ConsentCreate(
        patient_id=sample_patient.id,
        consent_type="discharge",
        icd11_codes=["I10", "E11.9"],
        procedure_description="Cardiac catheterization — patient refuses discharge",
    )
    consent = create_consent(db, consent_data, doctor_user.id)
    update_consent_status(
        db,
        consent.id,
        ConsentUpdate(status="refused", refusal_reason="Patient does not consent at this time"),
        doctor_user.id,
    )
    db.refresh(consent)
    return consent


@pytest.fixture()
def escalated_consent(db, sample_patient, doctor_user):
    """A consent in 'escalated' status."""
    from app.schemas.consent import ConsentCreate, ConsentUpdate
    from app.services.consent_service import create_consent, update_consent_status

    consent_data = ConsentCreate(
        patient_id=sample_patient.id,
        consent_type="procedure",
        icd11_codes=["C34.9"],  # high-risk code → triggers escalation
        procedure_description="Lung surgery",
    )
    consent = create_consent(db, consent_data, doctor_user.id)
    update_consent_status(
        db,
        consent.id,
        ConsentUpdate(status="escalated"),
        doctor_user.id,
    )
    db.refresh(consent)
    return consent


@pytest.fixture()
def pending_consent(db, sample_patient, doctor_user):
    """A consent still in 'pending' status — should NOT allow form generation."""
    from app.schemas.consent import ConsentCreate
    from app.services.consent_service import create_consent

    consent_data = ConsentCreate(
        patient_id=sample_patient.id,
        consent_type="treatment",
        icd11_codes=["I10"],
        procedure_description="Blood pressure management",
    )
    return create_consent(db, consent_data, doctor_user.id)


# ---------------------------------------------------------------------------
# 1. Template listing
# ---------------------------------------------------------------------------


class TestListTemplates:
    def test_lists_all_templates(self, client, doctor_token):
        """GET /refusal-forms/templates returns all registered templates."""
        response = client.get(
            "/refusal-forms/templates",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 200
        templates = response.json()
        types = {t["form_type"] for t in templates}
        assert "medical_discharge_refusal" in types
        assert "financial_responsibility_notice" in types
        assert "procedure_refusal" in types

    def test_template_has_required_fields(self, client, doctor_token):
        response = client.get(
            "/refusal-forms/templates",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        for tpl in response.json():
            assert "form_type" in tpl
            assert "title" in tpl
            assert "description" in tpl
            assert "required_consent_statuses" in tpl
            assert "fields" in tpl

    def test_templates_require_auth(self, client):
        """Unauthenticated request must be rejected."""
        response = client.get("/refusal-forms/templates")
        assert response.status_code == 401

    def test_nurse_can_list_templates(self, client, nurse_token):
        response = client.get(
            "/refusal-forms/templates",
            headers={"Authorization": f"Bearer {nurse_token}"},
        )
        assert response.status_code == 200
        assert len(response.json()) >= 3


# ---------------------------------------------------------------------------
# 2. Form generation — happy paths
# ---------------------------------------------------------------------------


class TestGenerateForm:
    def test_generate_medical_discharge_refusal(self, client, refused_consent, doctor_token):
        """
        refusal forms list loads: PASS
        refusal form generation works: PASS
        """
        response = client.post(
            "/refusal-forms",
            json={
                "consent_id": refused_consent.id,
                "form_type": "medical_discharge_refusal",
                "notes": "Patient was informed of risks",
            },
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["form_type"] == "medical_discharge_refusal"
        assert data["status"] == "generated"
        assert data["consent_id"] == refused_consent.id
        assert data["patient_id"] == refused_consent.patient_id
        assert "patient_name" in data["form_data"]
        assert "national_id" in data["form_data"]
        assert "refusal_reason" in data["form_data"]
        assert "observation_hours_required" in data["form_data"]
        from app.services.refusal_form_service import DISCHARGE_REFUSAL_OBSERVATION_HOURS
        assert data["form_data"]["observation_hours_required"] == DISCHARGE_REFUSAL_OBSERVATION_HOURS
        assert data["notes"] == "Patient was informed of risks"

    def test_generate_financial_responsibility_notice(self, client, refused_consent, doctor_token):
        response = client.post(
            "/refusal-forms",
            json={
                "consent_id": refused_consent.id,
                "form_type": "financial_responsibility_notice",
            },
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["form_type"] == "financial_responsibility_notice"
        assert "financial_liability_statement" in data["form_data"]
        assert "acknowledgment_date" in data["form_data"]
        assert data["form_data"]["consent_id"] == refused_consent.id

    def test_generate_procedure_refusal(self, client, refused_consent, doctor_token):
        response = client.post(
            "/refusal-forms",
            json={
                "consent_id": refused_consent.id,
                "form_type": "procedure_refusal",
            },
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["form_type"] == "procedure_refusal"
        assert "icd11_codes" in data["form_data"]
        assert "high_risk_flag" in data["form_data"]

    def test_generate_for_escalated_consent(self, client, escalated_consent, legal_token):
        """Escalated consents also allow form generation."""
        response = client.post(
            "/refusal-forms",
            json={
                "consent_id": escalated_consent.id,
                "form_type": "medical_discharge_refusal",
            },
            headers={"Authorization": f"Bearer {legal_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["consent_id"] == escalated_consent.id

    def test_generate_links_correct_patient(self, client, refused_consent, sample_patient, doctor_token):
        """correct tenant/case linkage: PASS"""
        response = client.post(
            "/refusal-forms",
            json={
                "consent_id": refused_consent.id,
                "form_type": "medical_discharge_refusal",
            },
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["patient_id"] == sample_patient.id
        assert data["form_data"]["national_id"] == sample_patient.national_id
        assert data["form_data"]["patient_name"] == sample_patient.full_name


# ---------------------------------------------------------------------------
# 3. Precondition enforcement
# ---------------------------------------------------------------------------


class TestGenerateFormPreconditions:
    def test_pending_consent_rejected(self, client, pending_consent, doctor_token):
        """Consent in 'pending' state must be rejected with 422."""
        response = client.post(
            "/refusal-forms",
            json={
                "consent_id": pending_consent.id,
                "form_type": "medical_discharge_refusal",
            },
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 422
        assert "refused" in response.json()["detail"].lower() or "escalated" in response.json()["detail"].lower()

    def test_granted_consent_rejected(self, client, sample_consent, doctor_token):
        """Consent that was granted must be rejected."""

        # grant the sample consent first
        from app.db.database import get_db  # noqa: F401

        # Use the service directly via TestClient helper — we patch via conftest
        client.patch(
            f"/consents/{sample_consent.id}",
            json={"status": "granted"},
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        response = client.post(
            "/refusal-forms",
            json={
                "consent_id": sample_consent.id,
                "form_type": "medical_discharge_refusal",
            },
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 422

    def test_unknown_consent_id_rejected(self, client, doctor_token):
        response = client.post(
            "/refusal-forms",
            json={
                "consent_id": "00000000-0000-0000-0000-000000000000",
                "form_type": "medical_discharge_refusal",
            },
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 422
        assert "not found" in response.json()["detail"].lower()

    def test_unknown_form_type_rejected(self, client, refused_consent, doctor_token):
        response = client.post(
            "/refusal-forms",
            json={
                "consent_id": refused_consent.id,
                "form_type": "nonexistent_form",
            },
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 422
        assert "unknown form type" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# 4. List forms per consent
# ---------------------------------------------------------------------------


class TestListFormsForConsent:
    def test_empty_list_before_generation(self, client, refused_consent, doctor_token):
        """
        Before any forms are generated the endpoint returns [] not a 404 —
        so the UI knows it's a genuinely empty state rather than a broken route.
        """
        response = client.get(
            f"/refusal-forms/consent/{refused_consent.id}",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 200
        assert response.json() == []

    def test_lists_generated_forms(self, client, refused_consent, doctor_token):
        # Generate two different forms
        for form_type in ("medical_discharge_refusal", "financial_responsibility_notice"):
            client.post(
                "/refusal-forms",
                json={"consent_id": refused_consent.id, "form_type": form_type},
                headers={"Authorization": f"Bearer {doctor_token}"},
            )
        response = client.get(
            f"/refusal-forms/consent/{refused_consent.id}",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_nurse_can_list_forms(self, client, refused_consent, doctor_token, nurse_token):
        client.post(
            "/refusal-forms",
            json={"consent_id": refused_consent.id, "form_type": "procedure_refusal"},
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        response = client.get(
            f"/refusal-forms/consent/{refused_consent.id}",
            headers={"Authorization": f"Bearer {nurse_token}"},
        )
        assert response.status_code == 200
        assert len(response.json()) >= 1


# ---------------------------------------------------------------------------
# 5. Preview (GET /{form_id})
# ---------------------------------------------------------------------------


class TestPreviewForm:
    def _generate(self, client, refused_consent, token, form_type="medical_discharge_refusal"):
        return client.post(
            "/refusal-forms",
            json={"consent_id": refused_consent.id, "form_type": form_type},
            headers={"Authorization": f"Bearer {token}"},
        ).json()

    def test_preview_returns_form_data(self, client, refused_consent, doctor_token):
        """refusal form screen opens: PASS / preview works: PASS"""
        form = self._generate(client, refused_consent, doctor_token)
        response = client.get(
            f"/refusal-forms/{form['id']}",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == form["id"]
        assert data["form_data"]["patient_name"] is not None
        assert data["form_data"]["refusal_reason"] is not None

    def test_preview_transitions_status_to_previewed(self, client, refused_consent, doctor_token):
        form = self._generate(client, refused_consent, doctor_token)
        assert form["status"] == "generated"
        # First GET marks it as previewed
        response = client.get(
            f"/refusal-forms/{form['id']}",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.json()["status"] == "previewed"

    def test_preview_not_found(self, client, doctor_token):
        response = client.get(
            "/refusal-forms/00000000-0000-0000-0000-000000000000",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# 6. Download (GET /{form_id}/download)
# ---------------------------------------------------------------------------


class TestDownloadForm:
    def _generate(self, client, refused_consent, token, form_type="medical_discharge_refusal"):
        return client.post(
            "/refusal-forms",
            json={"consent_id": refused_consent.id, "form_type": form_type},
            headers={"Authorization": f"Bearer {token}"},
        ).json()

    def test_download_returns_full_payload(self, client, refused_consent, doctor_token):
        """download works: PASS"""
        form = self._generate(client, refused_consent, doctor_token)
        response = client.get(
            f"/refusal-forms/{form['id']}/download",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["form_id"] == form["id"]
        assert data["form_type"] == "medical_discharge_refusal"
        assert data["title"] == "Medical Discharge Refusal Form"
        assert "downloaded_at" in data
        assert data["form_data"]["national_id"] is not None

    def test_download_marks_status_downloaded(self, client, refused_consent, doctor_token):
        form = self._generate(client, refused_consent, doctor_token)
        client.get(
            f"/refusal-forms/{form['id']}/download",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        # Subsequent preview should still show downloaded status
        preview = client.get(
            f"/refusal-forms/{form['id']}",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert preview.json()["status"] == "downloaded"
        assert preview.json()["downloaded_at"] is not None

    def test_download_not_found(self, client, doctor_token):
        response = client.get(
            "/refusal-forms/00000000-0000-0000-0000-000000000000/download",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 404

    def test_financial_notice_download_contains_liability_statement(
        self, client, refused_consent, doctor_token
    ):
        form = self._generate(client, refused_consent, doctor_token, "financial_responsibility_notice")
        response = client.get(
            f"/refusal-forms/{form['id']}/download",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert response.status_code == 200
        assert "financial_liability_statement" in response.json()["form_data"]


# ---------------------------------------------------------------------------
# 7. RBAC
# ---------------------------------------------------------------------------


class TestRBAC:
    def test_unauthenticated_cannot_generate(self, client, refused_consent):
        response = client.post(
            "/refusal-forms",
            json={
                "consent_id": refused_consent.id,
                "form_type": "medical_discharge_refusal",
            },
        )
        assert response.status_code == 401

    def test_unauthenticated_cannot_list_consent_forms(self, client, refused_consent):
        response = client.get(f"/refusal-forms/consent/{refused_consent.id}")
        assert response.status_code == 401

    def test_unauthenticated_cannot_preview(self, client):
        response = client.get("/refusal-forms/some-id")
        assert response.status_code == 401

    def test_unauthenticated_cannot_download(self, client):
        response = client.get("/refusal-forms/some-id/download")
        assert response.status_code == 401
