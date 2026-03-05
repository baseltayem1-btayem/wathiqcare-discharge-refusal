from app.services.fhir_service import consent_to_fhir, parse_fhir_patient, patient_to_fhir


def test_patient_to_fhir(sample_patient):
    fhir = patient_to_fhir(sample_patient)
    assert fhir["resourceType"] == "Patient"
    assert fhir["id"] == sample_patient.id
    assert any(i["value"] == sample_patient.national_id for i in fhir["identifier"])


def test_consent_to_fhir(sample_consent):
    fhir = consent_to_fhir(sample_consent)
    assert fhir["resourceType"] == "Consent"
    assert fhir["id"] == sample_consent.id
    assert fhir["status"] in ["proposed", "active", "rejected", "inactive"]


def test_parse_fhir_patient():
    fhir_data = {
        "resourceType": "Patient",
        "identifier": [{"system": "urn:oid:2.16", "value": "SA12345678"}],
        "name": [
            {"text": "Mohammed Al-Farsi", "family": "Al-Farsi", "given": ["Mohammed"]}
        ],
        "telecom": [{"system": "phone", "value": "+966501234567"}],
        "birthDate": "1980-07-15",
        "gender": "male",
    }
    patient_create = parse_fhir_patient(fhir_data)
    assert patient_create.national_id == "SA12345678"
    assert patient_create.full_name == "Mohammed Al-Farsi"
    assert patient_create.gender == "male"
    assert str(patient_create.date_of_birth) == "1980-07-15"


def test_fhir_metadata_endpoint(client, doctor_token):
    response = client.get(
        "/fhir/metadata", headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert response.status_code == 200
    assert response.json()["resourceType"] == "CapabilityStatement"


def test_get_fhir_patient_endpoint(client, sample_patient, doctor_token):
    response = client.get(
        f"/fhir/Patient/{sample_patient.id}",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert response.status_code == 200
    assert response.json()["resourceType"] == "Patient"


def test_get_fhir_consent_endpoint(client, sample_consent, doctor_token):
    response = client.get(
        f"/fhir/Consent/{sample_consent.id}",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert response.status_code == 200
    assert response.json()["resourceType"] == "Consent"


def test_create_fhir_patient_endpoint(client, doctor_token):
    fhir_data = {
        "resourceType": "Patient",
        "identifier": [{"value": "SA99999999"}],
        "name": [{"text": "Test FHIR Patient", "family": "FHIR", "given": ["Test"]}],
        "birthDate": "1975-03-20",
        "gender": "female",
    }
    response = client.post(
        "/fhir/Patient",
        json=fhir_data,
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert response.status_code == 201
