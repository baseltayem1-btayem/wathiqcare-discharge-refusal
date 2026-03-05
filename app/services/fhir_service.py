from datetime import date

from app.models.consent import Consent
from app.models.patient import Patient
from app.schemas.patient import PatientCreate


def patient_to_fhir(patient: Patient) -> dict:
    name_parts = patient.full_name.split() if patient.full_name else []
    family = name_parts[-1] if name_parts else ""
    given = name_parts[:-1] if len(name_parts) > 1 else name_parts
    resource = {
        "resourceType": "Patient",
        "id": patient.id,
        "identifier": [
            {"system": "urn:oid:2.16.840.1.113883.2.36.1", "value": patient.national_id}
        ],
        "name": [{"text": patient.full_name, "family": family, "given": given}],
        "telecom": [],
        "birthDate": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
        "gender": patient.gender.lower() if patient.gender else None,
    }
    if patient.contact_phone:
        resource["telecom"].append({"system": "phone", "value": patient.contact_phone})
    if patient.contact_email:
        resource["telecom"].append({"system": "email", "value": patient.contact_email})
    return resource


def consent_to_fhir(consent: Consent) -> dict:
    fhir_status_map = {
        "pending": "proposed",
        "granted": "active",
        "refused": "rejected",
        "escalated": "proposed",
        "withdrawn": "inactive",
    }
    return {
        "resourceType": "Consent",
        "id": consent.id,
        "status": fhir_status_map.get(consent.status, "proposed"),
        "scope": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/consentscope",
                    "code": "patient-privacy",
                }
            ]
        },
        "category": [{"coding": [{"system": "http://loinc.org", "code": "59284-0"}]}],
        "subject": {"reference": f"Patient/{consent.patient_id}"},
        "dateTime": consent.created_at.isoformat() if consent.created_at else None,
    }


def parse_fhir_patient(fhir_data: dict) -> PatientCreate:
    national_id = ""
    for ident in fhir_data.get("identifier", []):
        national_id = ident.get("value", "")
        break

    full_name = ""
    name_list = fhir_data.get("name", [])
    if name_list:
        name_obj = name_list[0]
        full_name = name_obj.get("text", "")
        if not full_name:
            given = " ".join(name_obj.get("given", []))
            family = name_obj.get("family", "")
            full_name = f"{given} {family}".strip()

    contact_phone = None
    contact_email = None
    for telecom in fhir_data.get("telecom", []):
        if telecom.get("system") == "phone":
            contact_phone = telecom.get("value")
        elif telecom.get("system") == "email":
            contact_email = telecom.get("value")

    birth_date_str = fhir_data.get("birthDate", "")
    try:
        birth_date = date.fromisoformat(birth_date_str)
    except (ValueError, TypeError):
        birth_date = date(2000, 1, 1)

    gender = fhir_data.get("gender", "unknown")
    return PatientCreate(
        national_id=national_id,
        full_name=full_name,
        date_of_birth=birth_date,
        gender=gender,
        contact_phone=contact_phone,
        contact_email=contact_email,
    )
