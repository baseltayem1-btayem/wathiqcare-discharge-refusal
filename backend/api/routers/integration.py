from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Dict

from fastapi import APIRouter

from backend.integration.emr_connector import FHIRBuilder, InMemoryEMRConnector

router = APIRouter(tags=["Integration"])
_connector = InMemoryEMRConnector()


def _seed_if_missing(mrn: str) -> Dict[str, str]:
    existing = _connector.fetch_patient(mrn)
    if existing:
        return existing

    patient = {
        "id": mrn,
        "mrn": mrn,
        "name": f"Patient {mrn}",
        "birthDate": "1985-01-01",
        "gender": "unknown",
    }
    _connector.seed_patient(patient)
    return patient


@router.get("/his/patient/{mrn}")
def get_his_patient(mrn: str):
    patient = _seed_if_missing(mrn)
    return {
        "source": "his",
        "patient": patient,
    }


@router.get("/fhir/patient/{patient_id}")
def get_fhir_patient(patient_id: str):
    patient = _seed_if_missing(patient_id)
    return FHIRBuilder.build_patient(
        patient_id=patient["id"],
        name=patient.get("name", ""),
        birth_date=patient.get("birthDate", ""),
    )


@router.get("/fhir/encounter/{encounter_id}")
def get_fhir_encounter(encounter_id: str):
    now = datetime.now(timezone.utc).isoformat()
    return {
        "resourceType": "Encounter",
        "id": encounter_id,
        "status": "in-progress",
        "class": {
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            "code": "IMP",
            "display": "inpatient encounter",
        },
        "period": {
            "start": now,
        },
    }


@router.get("/fhir/procedure/{procedure_id}")
def get_fhir_procedure(procedure_id: str):
    return {
        "resourceType": "Procedure",
        "id": procedure_id,
        "status": "completed",
        "code": {
            "text": "Discharge workflow legal-medical procedure",
        },
    }


@router.get("/fhir/consent/{consent_id}")
def get_fhir_consent(consent_id: str):
    return FHIRBuilder.build_consent(
        form_id=consent_id,
        patient_id="unknown",
        status="active",
    )


@router.get("/integrations/systems")
def get_integration_systems_status():
    def flag(name: str, default: str = "false") -> bool:
        return os.getenv(name, default).lower() == "true"

    return {
        "his": {
            "enabled": flag("HIS_INTEGRATION_ENABLED", "true"),
            "patientLookupEndpoint": "/his/patient/{mrn}",
        },
        "fhir": {
            "enabled": flag("FHIR_INTEGRATION_ENABLED", "true"),
            "resources": ["Patient", "Encounter", "Procedure", "Consent"],
        },
        "docuware": {
            "enabled": flag("DOCUWARE_ENABLED"),
        },
        "sharepoint": {
            "enabled": flag("SHAREPOINT_ENABLED"),
        },
        "erp": {
            "enabled": flag("ERP_ENABLED"),
        },
    }
