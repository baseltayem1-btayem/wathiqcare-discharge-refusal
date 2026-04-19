from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from backend.api.routers.sms_test import SmsTestRequest, test_sms as sms_test_route
from backend.core.rbac import can_access_case, has_permission, require_permission
from backend.core.roles import canonicalize_role


def test_role_alias_defaults_are_supported():
    assert canonicalize_role("er_doctor") == "doctor"
    assert canonicalize_role("treating_physician") == "doctor"
    assert canonicalize_role("legal_affairs") == "legal_admin"
    assert canonicalize_role("quality_compliance") == "quality"
    assert canonicalize_role("nurse_coordinator") == "nursing"


def test_permission_mapping_for_required_roles():
    platform_admin = {"role": "platform_admin"}
    tenant_admin = {"role": "tenant_admin"}
    er_doctor = {"role": "er_doctor"}
    physician = {"role": "treating_physician"}
    legal = {"role": "legal_affairs"}
    quality = {"role": "quality_compliance"}

    assert has_permission(platform_admin, "cases.read.all") is True
    assert has_permission(platform_admin, "sms.evidence.read") is True

    assert has_permission(tenant_admin, "cases.read.tenant") is True
    assert has_permission(tenant_admin, "users.manage") is True

    assert has_permission(er_doctor, "cases.create") is True
    assert has_permission(physician, "cases.create") is True
    assert has_permission(physician, "cases.read.assigned") is True
    assert has_permission(physician, "audit.read") is False

    assert has_permission(legal, "legal.review") is True
    assert has_permission(legal, "evidence.generate") is True
    assert has_permission(legal, "documents.generate_pdf") is True

    assert has_permission(quality, "compliance.review") is True
    assert has_permission(quality, "cases.close.final") is False


def test_case_scope_platform_tenant_and_assigned():
    case_row = SimpleNamespace(
        id="case-1",
        tenant_id="tenant-1",
        attending_physician_user_id="doctor-1",
        created_by="nurse-1",
    )

    platform_user = {"id": "platform-1", "role": "platform_admin", "tenant_id": "other-tenant"}
    tenant_legal = {"id": "legal-1", "role": "legal_affairs", "tenant_id": "tenant-1"}
    treating_doctor = {"id": "doctor-1", "role": "treating_physician", "tenant_id": "tenant-1"}
    other_doctor = {"id": "doctor-2", "role": "treating_physician", "tenant_id": "tenant-1"}

    assert can_access_case(platform_user, case_row) is True
    assert can_access_case(tenant_legal, case_row) is True
    assert can_access_case(treating_doctor, case_row) is True
    assert can_access_case(other_doctor, case_row) is False


def test_require_permission_denies_unauthorized(monkeypatch):
    monkeypatch.setattr("backend.core.rbac._write_auth_audit", lambda **kwargs: None)

    with pytest.raises(HTTPException) as exc:
        require_permission({"id": "u1", "tenant_id": "t1", "role": "treating_physician"}, "audit.read")

    assert exc.value.status_code == 403


def test_sms_test_route_enforces_sms_send_permission(monkeypatch):
    with pytest.raises(HTTPException) as exc:
        sms_test_route(SmsTestRequest(to="+966500000000", message="test"), {"role": "treating_physician"})

    assert exc.value.status_code == 403
