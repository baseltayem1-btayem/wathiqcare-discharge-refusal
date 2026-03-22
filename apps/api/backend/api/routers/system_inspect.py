"""
system_inspect.py
-----------------
System inspection endpoint for WathiqCare.

Provides an authenticated ``GET /api/system/inspect`` endpoint
that returns the operational status of all system modules, third-party
integrations, and database connectivity.  The response is deliberately
schema-stable so that external health-check probes and the frontend
"Launch Status" page can consume it.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy import text

from backend.api.deps import require_roles

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


def _shc_status() -> Dict[str, Any]:
    """Return structured SHC module status and readiness reason."""
    module_enabled = _flag("SHC_COMPLIANCE_MODULE")
    if not module_enabled:
        return {
            "module_enabled": False,
            "engine_status": "disabled",
            "reason": "SHC_COMPLIANCE_MODULE=false",
        }

    jwt_secret = (os.getenv("JWT_SECRET_KEY") or "").strip()
    if not jwt_secret or jwt_secret == "change-me":
        return {
            "module_enabled": True,
            "engine_status": "stopped",
            "reason": "JWT_SECRET_KEY is missing or using default placeholder",
        }

    jwt_algorithm = (os.getenv("JWT_ALGORITHM") or "HS256").strip().upper()
    if jwt_algorithm != "HS256":
        return {
            "module_enabled": True,
            "engine_status": "stopped",
            "reason": f"JWT_ALGORITHM must be HS256 (got: {jwt_algorithm})",
        }

    return {
        "module_enabled": True,
        "engine_status": "active",
        "reason": None,
    }


def _modules() -> List[Dict[str, Any]]:
    """Report which optional feature modules are active."""
    shc_status = _shc_status()
    return [
        {
            "name": "discharge_refusal",
            "description": "Discharge Refusal Workflow",
            "enabled": True,
        },
        {
            "name": "shc_discharge_compliance",
            "description": "SHC Discharge Compliance Engine",
            "enabled": shc_status["module_enabled"],
            "status": shc_status,
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
def system_inspect(
    _: Dict[str, Any] = Depends(require_roles("platform_superadmin", "platform_admin")),
) -> Dict[str, Any]:
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
    shc_status = _shc_status()

    # "healthy" means: DB is reachable AND the two mandatory integration
    # flags are switched on.  Integration flags reflect *configuration*
    # only – they do not probe the external systems at runtime.
    core_integrations_configured = (
        integrations["his"]["enabled"] and integrations["fhir"]["enabled"]
    )
    overall_status = (
        "healthy"
        if db_status["reachable"]
        and core_integrations_configured
        and not (shc_status["module_enabled"] and shc_status["engine_status"] != "active")
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
        "shc": shc_status,
        "integrations": integrations,
    }
