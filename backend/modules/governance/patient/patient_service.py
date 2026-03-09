from dataclasses import dataclass


@dataclass
class PatientRecord:
    id: str
    tenant_id: str
    full_name: str
    mrn: str | None = None
    national_id: str | None = None
    mobile_number: str | None = None


def validate_patient_payload(payload: dict) -> None:
    if not payload.get("full_name"):
        raise ValueError("full_name is required")
