def test_create_patient(client, doctor_token):
    response = client.post(
        "/patients",
        json={
            "national_id": "9876543210",
            "full_name": "Fatima Al-Zahra",
            "date_of_birth": "1990-05-20",
            "gender": "female",
            "contact_phone": "+966509876543",
        },
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["national_id"] == "9876543210"
    assert data["full_name"] == "Fatima Al-Zahra"


def test_create_patient_duplicate_national_id(client, sample_patient, doctor_token):
    response = client.post(
        "/patients",
        json={
            "national_id": "1234567890",
            "full_name": "Another Person",
            "date_of_birth": "1990-01-01",
            "gender": "male",
        },
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert response.status_code == 400


def test_get_patient(client, sample_patient, doctor_token):
    response = client.get(
        f"/patients/{sample_patient.id}",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert response.status_code == 200
    assert response.json()["id"] == sample_patient.id


def test_get_patient_not_found(client, doctor_token):
    response = client.get(
        "/patients/nonexistent-id", headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert response.status_code == 404


def test_list_patients(client, sample_patient, doctor_token):
    response = client.get("/patients", headers={"Authorization": f"Bearer {doctor_token}"})
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_update_patient(client, sample_patient, doctor_token):
    response = client.patch(
        f"/patients/{sample_patient.id}",
        json={"contact_phone": "+966501111111"},
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert response.status_code == 200
    assert response.json()["contact_phone"] == "+966501111111"


def test_nurse_cannot_create_patient(client, nurse_token):
    response = client.post(
        "/patients",
        json={
            "national_id": "1111111111",
            "full_name": "Test Person",
            "date_of_birth": "1990-01-01",
            "gender": "male",
        },
        headers={"Authorization": f"Bearer {nurse_token}"},
    )
    assert response.status_code == 403
