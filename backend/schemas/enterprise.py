from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class TemplateAvailabilityResponse(BaseModel):
    available: bool
    template_key: str
    requested_language: Optional[str]
    resolved_language: Optional[str]
    version: Optional[str]
    fallback_chain: List[str] = Field(default_factory=list)
    reason: Optional[str] = None


class DepartmentCreateRequest(BaseModel):
    code: str
    name_en: str
    name_ar: str
    parent_code: Optional[str] = None


class IntegrationConfigUpsertRequest(BaseModel):
    integration_key: str
    integration_type: str
    endpoint_url: str
    auth_type: str = "none"
    secret_reference: Optional[str] = None
    status: str = "disabled"
    retry_policy_json: Optional[Dict[str, Any]] = None
    timeout_seconds: int = 30
    headers_json: Optional[Dict[str, Any]] = None
    provider_name: Optional[str] = None


class SystemSettingUpsertRequest(BaseModel):
    setting_key: str
    value_json: Any
    description: Optional[str] = None


class FinancialGuaranteeCreateRequest(BaseModel):
    patient_id: str
    admission_id: Optional[str] = None
    refusal_case_id: Optional[str] = None
    financial_liability_record_id: Optional[str] = None
    amount: Decimal
    currency: str = "SAR"
    guarantee_type: str
    issue_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    issuing_authority: Optional[str] = None
    obligor: Optional[str] = None
    status: str = "draft"
    reference_number: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
