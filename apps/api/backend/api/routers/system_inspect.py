"""
system_inspect.py
-----------------
System inspection endpoint for WathiqCare.

Provides a lightweight, unauthenticated ``GET /api/system/inspect`` endpoint
that returns the operational status of all system modules, third-party
integrations, and database connectivity.  The response is deliberately
schema-stable so that external health-check probes and the frontend
"Launch Status" page can consume it.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter
from sqlalchemy import text

router = APIRouter(prefix="/api/system", tags=["System"])


def _flag(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).lower() == "true"


def _check_db() -> Dict[str, Any]:
    """Try to open a DB session and run a trivial query."""
    try:
        from backend.core.database import SessionLocal  # local import to avoid circular deps

        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            return {"reachable": True, "error": None}
        finally:
            db.close()
    except Exception as exc:
        return {"reachable": False, "error": str(exc)}


def _modules() -> List[Dict[str, Any]]:
    """Report which optional feature modules are active."""
    return [
        {
            "name": "discharge_refusal",
            "description": "Discharge Refusal Workflow",
            "enabled": True,
        },
        {
            "name": "shc_discharge_compliance",
            "description": "SHC Discharge Compliance Engine",
            "enabled": _flag("SHC_COMPLIANCE_MODULE"),
        },
        {
            "name": "home_healthcare",
            "description": "Home Healthcare Agreement",
            "enabled": True,
        },
        {
            "name": "forms_engine",
            "description": "Medical-Legal Forms Engine",
            "enabled": True,
        },
        {
            "name": "signature",
            "description": "Digital Signature Service",
            "enabled": True,
        },
        {
            "name": "icd11_validator",
            "description": "ICD-11 Code Validator",
            "enabled": True,
        },
    ]


def _integrations() -> Dict[str, Any]:
    return {
        "his": {
            "enabled": _flag("HIS_INTEGRATION_ENABLED", "true"),
            "description": "Hospital Information System",
        },
        "fhir": {
            "enabled": _flag("FHIR_INTEGRATION_ENABLED", "true"),
            "description": "FHIR R4 Resource Layer",
        },
        "docuware": {
            "enabled": _flag("DOCUWARE_ENABLED"),
            "description": "DocuWare Document Archive",
        },
        "sharepoint": {
            "enabled": _flag("SHAREPOINT_ENABLED"),
            "description": "SharePoint Document Store",
        },
        "erp": {
            "enabled": _flag("ERP_ENABLED"),
            "description": "ERP / Finance System",
        },
    }


@router.get("/inspect")
def system_inspect() -> Dict[str, Any]:
    """
    Return a comprehensive snapshot of the system's operational health:

    * **api** – version and uptime timestamp.
    * **modules** – list of feature modules and whether each is enabled.
    * **integrations** – external system *configuration* flags (enabled/disabled).
    * **database** – whether the backing store is reachable.
    * **status** – overall ``"healthy"`` / ``"degraded"`` verdict.
    """
    db_status = _check_db()
    modules = _modules()
    integrations = _integrations()

    # "healthy" means: DB is reachable AND the two mandatory integration
    # flags are switched on.  Integration flags reflect *configuration*
    # only – they do not probe the external systems at runtime.
    core_integrations_configured = (
        integrations["his"]["enabled"] and integrations["fhir"]["enabled"]
    )
    overall_status = (
        "healthy"
        if db_status["reachable"] and core_integrations_configured
        else "degraded"
    )

    return {
        "status": overall_status,
        "api": {
            "title": "WathiqCare Core API",
            "version": "0.1.0",
            "inspected_at": datetime.now(timezone.utc).isoformat(),
        },
        "database": db_status,
        "modules": modules,
        "integrations": integrations,
    }
