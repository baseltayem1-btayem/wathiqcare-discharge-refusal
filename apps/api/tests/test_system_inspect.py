"""
test_system_inspect.py
----------------------
Tests for the authenticated ``GET /api/system/inspect`` endpoint.
"""

from __future__ import annotations

import pytest


# ---------------------------------------------------------------------------
# Unit tests – exercise the helper functions directly
# ---------------------------------------------------------------------------

class TestSystemInspectHelpers:
    def test_modules_list_contains_required_entries(self):
        from backend.api.routers.system_inspect import _modules

        result = _modules()
        keys = {m["name"] for m in result}
        assert "discharge_refusal" in keys
        assert "forms_engine" in keys
        assert "home_healthcare" in keys
        assert "icd11_validator" in keys
        assert "signature" in keys

    def test_always_enabled_modules_have_bool_enabled_field(self):
        from backend.api.routers.system_inspect import _modules

        for m in _modules():
            assert isinstance(m["enabled"], bool), (
                f"Module '{m['name']}' 'enabled' must be a bool"
            )

    def test_discharge_refusal_module_is_always_enabled(self):
        from backend.api.routers.system_inspect import _modules

        discharge = next(m for m in _modules() if m["name"] == "discharge_refusal")
        assert discharge["enabled"] is True

    def test_shc_module_disabled_by_default(self, monkeypatch):
        monkeypatch.delenv("SHC_COMPLIANCE_MODULE", raising=False)
        from backend.api.routers.system_inspect import _modules

        shc = next(m for m in _modules() if m["name"] == "shc_discharge_compliance")
        assert shc["enabled"] is False
        assert shc["status"]["engine_status"] == "disabled"

    def test_shc_module_enabled_via_env(self, monkeypatch):
        monkeypatch.setenv("SHC_COMPLIANCE_MODULE", "true")
        monkeypatch.setenv("JWT_SECRET_KEY", "test-secret")
        monkeypatch.setenv("JWT_ALGORITHM", "HS256")
        from backend.api.routers.system_inspect import _modules

        shc = next(m for m in _modules() if m["name"] == "shc_discharge_compliance")
        assert shc["enabled"] is True
        assert shc["status"]["engine_status"] == "active"

    def test_shc_enabled_but_missing_jwt_secret_reports_stopped(self, monkeypatch):
        monkeypatch.setenv("SHC_COMPLIANCE_MODULE", "true")
        monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
        monkeypatch.setenv("JWT_ALGORITHM", "HS256")
        from backend.api.routers.system_inspect import _shc_status

        status = _shc_status()
        assert status["module_enabled"] is True
        assert status["engine_status"] == "stopped"
        assert "JWT_SECRET_KEY" in status["reason"]

    def test_shc_enabled_with_wrong_algorithm_reports_stopped(self, monkeypatch):
        monkeypatch.setenv("SHC_COMPLIANCE_MODULE", "true")
        monkeypatch.setenv("JWT_SECRET_KEY", "test-secret")
        monkeypatch.setenv("JWT_ALGORITHM", "RS256")
        from backend.api.routers.system_inspect import _shc_status

        status = _shc_status()
        assert status["module_enabled"] is True
        assert status["engine_status"] == "stopped"
        assert "JWT_ALGORITHM" in status["reason"]

    def test_integrations_has_required_keys(self):
        from backend.api.routers.system_inspect import _integrations

        result = _integrations()
        assert set(result.keys()) == {"his", "fhir", "docuware", "sharepoint", "erp"}

    def test_his_and_fhir_enabled_by_default(self, monkeypatch):
        monkeypatch.delenv("HIS_INTEGRATION_ENABLED", raising=False)
        monkeypatch.delenv("FHIR_INTEGRATION_ENABLED", raising=False)
        from backend.api.routers.system_inspect import _integrations

        result = _integrations()
        # Both default to "true"
        assert result["his"]["enabled"] is True
        assert result["fhir"]["enabled"] is True

    def test_optional_integrations_disabled_by_default(self, monkeypatch):
        for env in ("DOCUWARE_ENABLED", "SHAREPOINT_ENABLED", "ERP_ENABLED"):
            monkeypatch.delenv(env, raising=False)
        from backend.api.routers.system_inspect import _integrations

        result = _integrations()
        assert result["docuware"]["enabled"] is False
        assert result["sharepoint"]["enabled"] is False
        assert result["erp"]["enabled"] is False


# ---------------------------------------------------------------------------
# Integration-level tests – call the FastAPI route via TestClient
# ---------------------------------------------------------------------------

@pytest.fixture()
def client(monkeypatch):
    """Create an authenticated TestClient with a patched DB check."""
    from fastapi.testclient import TestClient
    from backend.api.deps import get_current_user
    from backend.main import app

    monkeypatch.setattr(
        "backend.api.routers.system_inspect._check_db",
        lambda: {"reachable": True, "error": None},
    )
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "test-platform-admin",
        "email": "admin@test.local",
        "role": "platform_superadmin",
        "tenant_id": "test-tenant",
        "tenant_code": "TEST",
        "is_active": True,
    }
    try:
        yield TestClient(app, raise_server_exceptions=True)
    finally:
        app.dependency_overrides.pop(get_current_user, None)


class TestSystemInspectEndpoint:
    def test_endpoint_requires_authentication(self, monkeypatch):
        from fastapi.testclient import TestClient
        from backend.main import app

        monkeypatch.setattr(
            "backend.api.routers.system_inspect._check_db",
            lambda: {"reachable": True, "error": None},
        )

        response = TestClient(app, raise_server_exceptions=True).get("/api/system/inspect")
        assert response.status_code == 401

    def test_endpoint_returns_200(self, client):
        response = client.get("/api/system/inspect")
        assert response.status_code == 200

    def test_response_has_required_top_level_keys(self, client):
        data = client.get("/api/system/inspect").json()
        assert "status" in data
        assert "api" in data
        assert "database" in data
        assert "modules" in data
        assert "shc" in data
        assert "integrations" in data

    def test_status_is_healthy_when_db_reachable(self, client):
        data = client.get("/api/system/inspect").json()
        assert data["status"] == "healthy"

    def test_status_is_degraded_when_shc_enabled_but_invalid(self, monkeypatch):
        from fastapi.testclient import TestClient
        from backend.api.deps import get_current_user
        from backend.main import app

        monkeypatch.setattr(
            "backend.api.routers.system_inspect._check_db",
            lambda: {"reachable": True, "error": None},
        )
        monkeypatch.setenv("SHC_COMPLIANCE_MODULE", "true")
        monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
        monkeypatch.setenv("JWT_ALGORITHM", "HS256")

        app.dependency_overrides[get_current_user] = lambda: {
            "id": "test-platform-admin",
            "email": "admin@test.local",
            "role": "platform_superadmin",
            "tenant_id": "test-tenant",
            "tenant_code": "TEST",
            "is_active": True,
        }
        response = TestClient(app).get("/api/system/inspect")
        app.dependency_overrides.pop(get_current_user, None)
        data = response.json()
        assert response.status_code == 200
        assert data["status"] == "degraded"
        assert data["shc"]["engine_status"] == "stopped"

    def test_status_is_degraded_when_db_unreachable(self, monkeypatch):
        from fastapi.testclient import TestClient
        from backend.api.deps import get_current_user
        from backend.main import app

        monkeypatch.setattr(
            "backend.api.routers.system_inspect._check_db",
            lambda: {"reachable": False, "error": "Connection refused"},
        )
        app.dependency_overrides[get_current_user] = lambda: {
            "id": "test-platform-admin",
            "email": "admin@test.local",
            "role": "platform_superadmin",
            "tenant_id": "test-tenant",
            "tenant_code": "TEST",
            "is_active": True,
        }
        response = TestClient(app).get("/api/system/inspect")
        app.dependency_overrides.pop(get_current_user, None)
        assert response.status_code == 200
        assert response.json()["status"] == "degraded"

    def test_api_block_contains_version_and_title(self, client):
        api = client.get("/api/system/inspect").json()["api"]
        assert api["title"] == "WathiqCare Core API"
        assert api["version"] == "0.1.0"
        assert "inspected_at" in api

    def test_modules_list_is_non_empty(self, client):
        modules = client.get("/api/system/inspect").json()["modules"]
        assert isinstance(modules, list)
        assert len(modules) > 0

    def test_integrations_block_structure(self, client):
        integrations = client.get("/api/system/inspect").json()["integrations"]
        for key in ("his", "fhir", "docuware", "sharepoint", "erp"):
            assert key in integrations
            assert "enabled" in integrations[key]
            assert "description" in integrations[key]
