def test_create_consent(client, sample_patient, doctor_token):
    response = client.post(
        "/consents",
        json={
            "patient_id": sample_patient.id,
            "consent_type": "treatment",
            "icd11_codes": ["I10"],
            "procedure_description": "Hypertension treatment",
        },
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert data["consent_type"] == "treatment"


def test_get_consent(client, sample_consent, doctor_token):
    response = client.get(
        f"/consents/{sample_consent.id}",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert response.status_code == 200
    assert response.json()["id"] == sample_consent.id


def test_get_consent_not_found(client, doctor_token):
    response = client.get(
        "/consents/nonexistent", headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert response.status_code == 404


def test_get_patient_consents(client, sample_patient, sample_consent, doctor_token):
    response = client.get(
        f"/consents/patient/{sample_patient.id}",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_update_consent_status_granted(client, sample_consent, doctor_token):
    response = client.patch(
        f"/consents/{sample_consent.id}",
        json={"status": "granted"},
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "granted"
    assert data["signed_at"] is not None


def test_update_consent_status_refused(client, sample_consent, doctor_token):
    response = client.patch(
        f"/consents/{sample_consent.id}",
        json={"status": "refused", "refusal_reason": "Patient does not wish to proceed"},
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "refused"


def test_nurse_can_view_consent(client, sample_consent, nurse_token):
    response = client.get(
        f"/consents/{sample_consent.id}",
        headers={"Authorization": f"Bearer {nurse_token}"},
    )
    assert response.status_code == 200
