from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException

from backend.api.deps import require_roles
from backend.core.database import SessionLocal
from backend.integration.emr_connector import FHIRBuilder
from backend.services.integration_abstraction_service import IntegrationConfigService, IntegrationDispatcher

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


def _db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_default_integration_configs(db, *, tenant_id: str, created_by: str) -> None:
    svc = IntegrationConfigService(db)
    existing = {item.integration_key: item for item in svc.list_configs(tenant_id=tenant_id)}

    defaults = [
        {
            "integration_key": "emr_his_primary",
            "integration_type": "emr_his",
            "endpoint_url": "https://example-his.local/api",
            "auth_type": "oauth2",
            "status": "active",
        },
        {
            "integration_key": "fhir_gateway",
            "integration_type": "fhir",
            "endpoint_url": "https://example-fhir.local/fhir",
            "auth_type": "oauth2",
            "status": "active",
        },
        {
            "integration_key": "notification_gateway",
            "integration_type": "notification_gateway",
            "endpoint_url": "https://example-notify.local/api",
            "auth_type": "api_key",
            "status": "active",
        },
    ]

    for item in defaults:
        if item["integration_key"] in existing:
            continue
        svc.upsert_config(
            tenant_id=tenant_id,
            integration_key=item["integration_key"],
            integration_type=item["integration_type"],
            endpoint_url=item["endpoint_url"],
            auth_type=item["auth_type"],
            status=item["status"],
            created_by=created_by,
            retry_policy_json={"max_retries": 3, "backoff_seconds": 2},
            timeout_seconds=30,
        )
    db.flush()


def _fetch_patient_via_integration(db, *, tenant_id: str, created_by: str, mrn: str) -> Dict[str, str]:
    _ensure_default_integration_configs(db, tenant_id=tenant_id, created_by=created_by)
    dispatcher = IntegrationDispatcher(db)
    result = dispatcher.dispatch(
        tenant_id=tenant_id,
        integration_key="emr_his_primary",
        operation="fetch_patient",
        payload={"mrn": mrn},
    )
    patient = result.response_payload.get("patient") if isinstance(result.response_payload, dict) else None
    if not isinstance(patient, dict):
        raise ValueError("Integration adapter did not return patient payload")
    return patient


@router.get("/his/patient/{mrn}")
def get_his_patient(
    mrn: str,
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
    db=Depends(_db_session),
):
    try:
        patient = _fetch_patient_via_integration(
            db,
            tenant_id=current_user["tenant_id"],
            created_by=current_user["id"],
            mrn=mrn,
        )
        db.commit()
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))

    return {
        "source": "his",
        "patient": patient,
    }


@router.get("/fhir/patient/{patient_id}")
def get_fhir_patient(
    patient_id: str,
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
    db=Depends(_db_session),
):
    try:
        patient = _fetch_patient_via_integration(
            db,
            tenant_id=current_user["tenant_id"],
            created_by=current_user["id"],
            mrn=patient_id,
        )
        db.commit()
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))

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
    db=Depends(_db_session),
):
    _ensure_default_integration_configs(
        db,
        tenant_id=current_user["tenant_id"],
        created_by=current_user["id"],
    )
    rows = IntegrationConfigService(db).list_configs(tenant_id=current_user["tenant_id"])
    db.commit()

    by_type = {item.integration_type: item for item in rows}
    by_key = {item.integration_key: item for item in rows}

    return {
        "his": {
            "enabled": (by_key.get("emr_his_primary").status if by_key.get("emr_his_primary") else "disabled") in {"active", "enabled"},
            "patientLookupEndpoint": "/his/patient/{mrn}",
        },
        "fhir": {
            "enabled": (by_key.get("fhir_gateway").status if by_key.get("fhir_gateway") else "disabled") in {"active", "enabled"},
            "resources": ["Patient", "Encounter", "Procedure", "Consent"],
        },
        "docuware": {
            "enabled": bool(by_type.get("document_management") and by_type["document_management"].status in {"active", "enabled"}),
        },
        "sharepoint": {
            "enabled": bool(by_key.get("sharepoint") and by_key["sharepoint"].status in {"active", "enabled"}),
        },
        "erp": {
            "enabled": bool(by_type.get("payment_billing") and by_type["payment_billing"].status in {"active", "enabled"}),
        },
    }
