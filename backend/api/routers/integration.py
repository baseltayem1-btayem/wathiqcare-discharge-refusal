from backend.core.database import SessionLocal


from fastapi import APIRouter, Depends, Request
from backend.models.integration_connector import IntegrationConnector
from backend.models.integration_sla_breach import IntegrationSLABreach
from backend.services.integration_monitoring_service import evaluate_sla_for_connector
from sqlalchemy.orm import Session
from backend.api.deps import get_db, require_roles
import os
from datetime import datetime, timezone
from typing import Dict

router = APIRouter(tags=["Integration"])
INTEGRATION_VIEW_ROLES = (
    "tenant_admin",
    "legal_admin",
    "doctor",
    "nursing",
    "patient_affairs",
    "social_services",
    "quality",
    "compliance",
)
from backend.integration.emr_connector import FHIRBuilder, InMemoryEMRConnector
_connector = InMemoryEMRConnector()

# --- SLA STATUS ENDPOINT ---
@router.get("/api/integrations/sla/status")
def get_sla_status(
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
):
    _ = current_user
    now = datetime.now(timezone.utc)
    connectors = db.query(IntegrationConnector).all()
    connector_results = []
    connectors_ok = 0
    connectors_breached = 0
    connectors_disabled = 0
    total_open_breaches = 0
    for connector in connectors:
        evaluation = evaluate_sla_for_connector(db, connector)
        evaluation["connector_name"] = connector.connector_name
        evaluation["enabled"] = connector.enabled
        evaluation["sla_rules"] = {
            "max_sync_delay_seconds": float(os.getenv("INTEGRATION_SLA_MAX_SYNC_DELAY_SECONDS", "3600")),
            "max_failure_rate": float(os.getenv("INTEGRATION_SLA_MAX_FAILURE_RATE", "0.5")),
            "max_queue_time_seconds": float(os.getenv("INTEGRATION_SLA_MAX_QUEUE_TIME_SECONDS", "300")),
            "failure_rate_window": int(os.getenv("INTEGRATION_SLA_FAILURE_RATE_WINDOW", "10")),
        }
        if not evaluation["enabled"]:
            connectors_disabled += 1
        elif evaluation["sla_status"] == "breached":
            connectors_breached += 1
        else:
            connectors_ok += 1
        total_open_breaches += evaluation.get("open_breach_count", 0)
        connector_results.append(evaluation)
    summary = {
        "connectors_ok": connectors_ok,
        "connectors_breached": connectors_breached,
        "connectors_disabled": connectors_disabled,
        "total_open_breaches": total_open_breaches,
    }
    return {
        "evaluated_at": now.isoformat(),
        "summary": summary,
        "connectors": connector_results,
    }



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
def get_his_patient(
    mrn: str,
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
):
    _ = current_user
    patient = _seed_if_missing(mrn)
    return {
        "source": "his",
        "patient": patient,
    }


@router.get("/fhir/patient/{patient_id}")
def get_fhir_patient(
    patient_id: str,
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
):
    _ = current_user
    patient = _seed_if_missing(patient_id)
    return FHIRBuilder.build_patient(
        patient_id=patient["id"],
        name=patient.get("name", ""),
        birth_date=patient.get("birthDate", ""),
    )


@router.get("/fhir/encounter/{encounter_id}")
def get_fhir_encounter(
    encounter_id: str,
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
):
    _ = current_user
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
def get_fhir_procedure(
    procedure_id: str,
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
):
    _ = current_user
    return {
        "resourceType": "Procedure",
        "id": procedure_id,
        "status": "completed",
        "code": {
            "text": "Discharge workflow legal-medical procedure",
        },
    }


@router.get("/fhir/consent/{consent_id}")
def get_fhir_consent(
    consent_id: str,
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
):
    _ = current_user
    return FHIRBuilder.build_consent(
        form_id=consent_id,
        patient_id="unknown",
        status="active",
    )


@router.get("/integrations/systems")
def get_integration_systems_status(
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
):
    _ = current_user

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
