from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc

from backend.core.database import SessionLocal
from backend.models.integration_alert_log import IntegrationAlertLog
from backend.models.integration_connector import IntegrationConnector

from backend.api.deps import require_roles
from backend.integration.emr_connector import FHIRBuilder, InMemoryEMRConnector
from backend.services.integration_monitoring_service import (
    connector_health_snapshot,
    enqueue_manual_sync,
    ensure_connectors_seeded,
    get_connector_or_404,
    get_sla_status_snapshot,
    list_runs,
    scheduler_health_snapshot,
    serialize_connector_status,
    serialize_run,
)

router = APIRouter(tags=["Integration"])
_connector = InMemoryEMRConnector()

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


@router.get("/api/integrations/status")
def get_integrations_status(
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
):
    _ = current_user
    db = SessionLocal()
    try:
        ensure_connectors_seeded(db)
        connectors = (
            db.query(IntegrationConnector)
            .order_by(IntegrationConnector.connector_name.asc())
            .all()
        )

        payload = [serialize_connector_status(db, connector) for connector in connectors]
        summary = {
            "total": len(payload),
            "enabled": sum(1 for item in payload if item["enabled"]),
            "running": sum(1 for item in payload if item["status"] in {"queued", "running"}),
            "failed": sum(1 for item in payload if item["status"] == "failed"),
            "disabled": sum(1 for item in payload if item["status"] == "disabled"),
            "live": sum(1 for item in payload if item["live_mode"]),
        }
        return {
            "summary": summary,
            "connectors": payload,
        }
    finally:
        db.close()


@router.get("/api/integrations/runs")
def get_integration_runs(
    connector: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
):
    _ = current_user
    db = SessionLocal()
    try:
        ensure_connectors_seeded(db)
        runs = list_runs(db, connector_key=connector, limit=limit)
        return {
            "runs": [serialize_run(run) for run in runs],
        }
    finally:
        db.close()


@router.post("/api/integrations/{connector}/sync")
def trigger_connector_sync(
    connector: str,
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
):
    db = SessionLocal()
    try:
        ensure_connectors_seeded(db)
        try:
            target = get_connector_or_404(db, connector)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc))

        actor = current_user.get("email") or current_user.get("id")
        run = enqueue_manual_sync(
            db,
            target,
            triggered_by=actor,
            triggered_by_user_id=current_user.get("id"),
            triggered_by_tenant_id=current_user.get("tenant_id"),
        )
        return {
            "message": "Sync queued",
            "connector_key": target.connector_key,
            "run": serialize_run(run),
        }
    finally:
        db.close()


@router.get("/api/integrations/{connector}/history")
def get_connector_history(
    connector: str,
    limit: int = Query(default=25, ge=1, le=200),
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
):
    _ = current_user
    db = SessionLocal()
    try:
        ensure_connectors_seeded(db)
        try:
            target = get_connector_or_404(db, connector)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc))

        runs = list_runs(db, connector_key=target.connector_key, limit=limit)
        return {
            "connector_key": target.connector_key,
            "connector_name": target.connector_name,
            "runs": [serialize_run(run) for run in runs],
        }
    finally:
        db.close()


@router.get("/api/integrations/{connector}/health")
def get_connector_health(
    connector: str,
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
):
    _ = current_user
    db = SessionLocal()
    try:
        ensure_connectors_seeded(db)
        try:
            target = get_connector_or_404(db, connector)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc))

        return connector_health_snapshot(db, target)
    finally:
        db.close()


@router.get("/api/integrations/scheduler/debug")
def get_scheduler_health(
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
):
    _ = current_user
    db = SessionLocal()
    try:
        ensure_connectors_seeded(db)
        return scheduler_health_snapshot(db)
    finally:
        db.close()


@router.get("/api/integrations/alerts")
def get_integration_alerts(
    alert_type: Optional[str] = Query(default=None),
    connector_key: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
):
    _ = current_user
    db = SessionLocal()
    try:
        query = db.query(IntegrationAlertLog)

        if alert_type:
            query = query.filter(IntegrationAlertLog.alert_type == alert_type)
        if connector_key:
            query = query.filter(IntegrationAlertLog.connector_key == connector_key)
        if status:
            query = query.filter(IntegrationAlertLog.status == status)
        if start_date:
            query = query.filter(IntegrationAlertLog.triggered_at >= start_date)
        if end_date:
            query = query.filter(IntegrationAlertLog.triggered_at <= end_date)

        total = query.count()
        rows = (
            query
            .order_by(desc(IntegrationAlertLog.triggered_at))
            .offset(offset)
            .limit(limit)
            .all()
        )

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "alerts": [
                {
                    "alert_type": row.alert_type,
                    "severity": row.severity,
                    "connector_key": row.connector_key,
                    "status": row.status,
                    "message": row.message,
                    "is_suppressed": row.is_suppressed,
                    "triggered_at": row.triggered_at.isoformat() if row.triggered_at else None,
                    "notified_at": row.notified_at.isoformat() if row.notified_at else None,
                }
                for row in rows
            ],
        }
    finally:
        db.close()


@router.get("/api/integrations/sla/status")
def get_sla_status(
    current_user=Depends(require_roles(*INTEGRATION_VIEW_ROLES)),
):
    _ = current_user
    db = SessionLocal()
    try:
        ensure_connectors_seeded(db)
        return get_sla_status_snapshot(db)
    finally:
        db.close()
