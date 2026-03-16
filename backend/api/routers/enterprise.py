from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.api.deps import require_roles
from backend.core.database import SessionLocal
from backend.models.department import Department
from backend.schemas.enterprise import (
    DepartmentCreateRequest,
    FinancialGuaranteeCreateRequest,
    IntegrationConfigUpsertRequest,
    SystemSettingUpsertRequest,
)
from backend.services.department_service import DepartmentService
from backend.services.financial_guarantee_service import FinancialGuaranteeService
from backend.services.integration_abstraction_service import IntegrationConfigService
from backend.services.system_settings_service import SystemSettingsService
from backend.services.template_localization_service import TemplateLocalizationService


router = APIRouter(prefix="/api/enterprise", tags=["Enterprise Governance"])


def _db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


MANAGE_ROLES = (
    "tenant_admin",
    "legal_admin",
    "compliance",
)

READ_ROLES = (
    "tenant_admin",
    "legal_admin",
    "doctor",
    "nursing",
    "patient_affairs",
    "social_services",
    "quality",
    "compliance",
)


@router.get("/templates")
def list_templates(
    template_key: Optional[str] = Query(default=None),
    language_code: Optional[str] = Query(default=None),
    template_type: Optional[str] = Query(default=None),
    current_user=Depends(require_roles(*READ_ROLES)),
    db=Depends(_db_session),
):
    service = TemplateLocalizationService(db)
    service.ensure_default_templates(tenant_id=current_user["tenant_id"], created_by=current_user["id"])
    db.commit()

    rows = service.list_templates(
        tenant_id=current_user["tenant_id"],
        template_key=template_key,
        language_code=language_code,
        template_type=template_type,
        active_only=True,
    )
    return {
        "items": [
            {
                "id": row.id,
                "template_key": row.template_key,
                "language_code": row.language_code,
                "template_type": row.template_type,
                "version": row.version,
                "is_active": row.is_active,
                "title": row.title,
                "document_code": row.document_code,
                "renderer_hint": row.renderer_hint,
                "owner_department_code": row.owner_department_code,
            }
            for row in rows
        ]
    }


@router.get("/templates/{template_key}")
def get_template_by_key_language(
    template_key: str,
    language_code: Optional[str] = Query(default=None),
    current_user=Depends(require_roles(*READ_ROLES)),
    db=Depends(_db_session),
):
    service = TemplateLocalizationService(db)
    service.ensure_default_templates(tenant_id=current_user["tenant_id"], created_by=current_user["id"])
    db.commit()

    try:
        resolved = service.resolve_template(
            tenant_id=current_user["tenant_id"],
            template_key=template_key,
            requested_language=language_code,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return {
        "id": resolved.template.id,
        "template_key": resolved.template_key,
        "requested_language": resolved.requested_language,
        "resolved_language": resolved.resolved_language,
        "template_type": resolved.template.template_type,
        "version": resolved.version,
        "is_active": resolved.template.is_active,
        "title": resolved.title,
        "document_code": resolved.document_code,
        "fallback_chain": resolved.fallback_chain,
    }


@router.get("/templates/{template_key}/validate")
def validate_template_availability(
    template_key: str,
    language_code: Optional[str] = Query(default=None),
    current_user=Depends(require_roles(*READ_ROLES)),
    db=Depends(_db_session),
):
    service = TemplateLocalizationService(db)
    service.ensure_default_templates(tenant_id=current_user["tenant_id"], created_by=current_user["id"])
    db.commit()

    return service.validate_template_availability(
        tenant_id=current_user["tenant_id"],
        template_key=template_key,
        requested_language=language_code,
    )


@router.get("/departments")
def list_departments(
    current_user=Depends(require_roles(*READ_ROLES)),
    db=Depends(_db_session),
):
    _ = current_user
    service = DepartmentService(db)
    service.ensure_defaults()
    db.commit()
    rows = service.list_departments(active_only=True)
    return {
        "items": [
            {
                "id": row.id,
                "code": row.code,
                "name_en": row.name_en,
                "name_ar": row.name_ar,
                "parent_code": row.parent_code,
                "is_active": row.is_active,
            }
            for row in rows
        ]
    }


@router.post("/departments")
def create_department(
    payload: DepartmentCreateRequest,
    current_user=Depends(require_roles(*MANAGE_ROLES)),
    db=Depends(_db_session),
):
    _ = current_user

    service = DepartmentService(db)
    rows = service.list_departments(active_only=False)
    if any(item.code == payload.code for item in rows):
        raise HTTPException(status_code=400, detail="Department code already exists")

    row = Department(
        code=payload.code,
        name_en=payload.name_en,
        name_ar=payload.name_ar,
        parent_code=payload.parent_code,
        is_active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "id": row.id,
        "code": row.code,
        "name_en": row.name_en,
        "name_ar": row.name_ar,
        "parent_code": row.parent_code,
        "is_active": row.is_active,
    }


@router.get("/integrations")
def list_integrations(
    current_user=Depends(require_roles(*READ_ROLES)),
    db=Depends(_db_session),
):
    rows = IntegrationConfigService(db).list_configs(tenant_id=current_user["tenant_id"])
    return {
        "items": [
            {
                "id": row.id,
                "integration_key": row.integration_key,
                "integration_type": row.integration_type,
                "provider_name": row.provider_name,
                "endpoint_url": row.endpoint_url,
                "auth_type": row.auth_type,
                "secret_reference": row.secret_reference,
                "status": row.status,
                "retry_policy_json": row.retry_policy_json,
                "timeout_seconds": row.timeout_seconds,
                "headers_json": row.headers_json,
            }
            for row in rows
        ]
    }


@router.post("/integrations")
def upsert_integration(
    payload: IntegrationConfigUpsertRequest,
    current_user=Depends(require_roles(*MANAGE_ROLES)),
    db=Depends(_db_session),
):
    row = IntegrationConfigService(db).upsert_config(
        tenant_id=current_user["tenant_id"],
        integration_key=payload.integration_key,
        integration_type=payload.integration_type,
        endpoint_url=payload.endpoint_url,
        auth_type=payload.auth_type,
        status=payload.status,
        secret_reference=payload.secret_reference,
        retry_policy_json=payload.retry_policy_json,
        timeout_seconds=payload.timeout_seconds,
        headers_json=payload.headers_json,
        provider_name=payload.provider_name,
        created_by=current_user["id"],
    )
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "integration_key": row.integration_key,
        "integration_type": row.integration_type,
        "provider_name": row.provider_name,
        "endpoint_url": row.endpoint_url,
        "auth_type": row.auth_type,
        "secret_reference": row.secret_reference,
        "status": row.status,
        "retry_policy_json": row.retry_policy_json,
        "timeout_seconds": row.timeout_seconds,
        "headers_json": row.headers_json,
    }


@router.get("/settings")
def list_settings(
    current_user=Depends(require_roles(*READ_ROLES)),
    db=Depends(_db_session),
):
    service = SystemSettingsService(db)
    service.ensure_defaults(tenant_id=current_user["tenant_id"])
    db.commit()
    rows = service.list_settings(tenant_id=current_user["tenant_id"])
    return {
        "items": [
            {
                "id": row.id,
                "setting_key": row.setting_key,
                "setting_scope": row.setting_scope,
                "value_json": row.value_json,
                "description": row.description,
                "is_active": row.is_active,
            }
            for row in rows
        ]
    }


@router.post("/settings")
def upsert_setting(
    payload: SystemSettingUpsertRequest,
    current_user=Depends(require_roles(*MANAGE_ROLES)),
    db=Depends(_db_session),
):
    service = SystemSettingsService(db)
    row = service.set(
        key=payload.setting_key,
        value=payload.value_json,
        tenant_id=current_user["tenant_id"],
        description=payload.description,
    )
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "setting_key": row.setting_key,
        "setting_scope": row.setting_scope,
        "value_json": row.value_json,
        "description": row.description,
        "is_active": row.is_active,
    }


@router.get("/financial-guarantees")
def list_financial_guarantees(
    patient_id: Optional[str] = Query(default=None),
    refusal_case_id: Optional[str] = Query(default=None),
    current_user=Depends(require_roles(*READ_ROLES)),
    db=Depends(_db_session),
):
    rows = FinancialGuaranteeService(db).list_guarantees(
        tenant_id=current_user["tenant_id"],
        patient_id=patient_id,
        refusal_case_id=refusal_case_id,
    )
    return {
        "items": [
            {
                "id": row.id,
                "patient_id": row.patient_id,
                "admission_id": row.admission_id,
                "refusal_case_id": row.refusal_case_id,
                "financial_liability_record_id": row.financial_liability_record_id,
                "guarantee_type": row.guarantee_type,
                "amount": str(row.amount),
                "currency": row.currency,
                "issue_date": row.issue_date.isoformat() if row.issue_date else None,
                "expiry_date": row.expiry_date.isoformat() if row.expiry_date else None,
                "issuing_authority": row.issuing_authority,
                "obligor": row.obligor,
                "status": row.status,
                "reference_number": row.reference_number,
                "metadata_json": row.metadata_json,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ]
    }


@router.post("/financial-guarantees")
def create_financial_guarantee(
    payload: FinancialGuaranteeCreateRequest,
    current_user=Depends(require_roles(*MANAGE_ROLES)),
    db=Depends(_db_session),
):
    try:
        row = FinancialGuaranteeService(db).create_guarantee(
            tenant_id=current_user["tenant_id"],
            patient_id=payload.patient_id,
            admission_id=payload.admission_id,
            refusal_case_id=payload.refusal_case_id,
            financial_liability_record_id=payload.financial_liability_record_id,
            amount=payload.amount,
            currency=payload.currency,
            guarantee_type=payload.guarantee_type,
            issue_date=payload.issue_date,
            expiry_date=payload.expiry_date,
            issuing_authority=payload.issuing_authority,
            obligor=payload.obligor,
            status=payload.status,
            reference_number=payload.reference_number,
            metadata_json=payload.metadata_json,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "patient_id": row.patient_id,
        "admission_id": row.admission_id,
        "refusal_case_id": row.refusal_case_id,
        "financial_liability_record_id": row.financial_liability_record_id,
        "guarantee_type": row.guarantee_type,
        "amount": str(row.amount),
        "currency": row.currency,
        "issue_date": row.issue_date.isoformat() if row.issue_date else None,
        "expiry_date": row.expiry_date.isoformat() if row.expiry_date else None,
        "issuing_authority": row.issuing_authority,
        "obligor": row.obligor,
        "status": row.status,
        "reference_number": row.reference_number,
        "metadata_json": row.metadata_json,
    }
