"""
tests/test_secure_link_route_registration.py
=============================================
Route-registration smoke tests for the secure-discharge-link module.

These tests verify that all four secure-link endpoints are mounted in the
FastAPI application.  They do NOT require a live database and will catch any
future regression where an import error or misconfiguration silently drops the
router from the app.

Routes exercised
----------------
GET  /api/discharge/secure/{token}          canonical public token resolver
GET  /api/secure-links/{token}              compatibility alias
POST /api/discharge/secure/{token}/decision canonical decision submission
POST /api/secure-links/{token}/decision     compatibility alias
"""

from __future__ import annotations

import os

# Must be set before any backend import so database/config modules initialise
os.environ.setdefault("DB_USER", "postgres")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("DB_NAME", "wathiqcare")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("APP_BASE_URL", "http://localhost:3000")
os.environ.setdefault("PUBLIC_LINK_TOKEN_PEPPER", "test-pepper")

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_SECURE_ROUTES = {
    "GET /api/discharge/secure/{token}",
    "GET /api/secure-links/{token}",
    "POST /api/discharge/secure/{token}/decision",
    "POST /api/secure-links/{token}/decision",
}


def _registered_routes(app) -> set[str]:
    """Return a set of '{METHOD} {path}' strings for all routes in *app*."""
    result = set()
    for route in app.routes:
        methods = getattr(route, "methods", None) or set()
        path = getattr(route, "path", "")
        for method in methods:
            result.add(f"{method} {path}")
    return result


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestSecureLinkRouteRegistration:
    """Verify that all secure-link endpoints are present in the app router."""

    @pytest.fixture(autouse=True)
    def _patch_db(self):
        """Prevent any real DB connection during import/startup."""
        with patch("sqlalchemy.create_engine"), \
             patch("backend.core.database.Base.metadata.create_all"):
            yield

    def test_all_secure_link_routes_are_registered(self):
        from backend.main import app

        registered = _registered_routes(app)
        for route in _SECURE_ROUTES:
            assert route in registered, (
                f"Secure-link route '{route}' is NOT registered in the FastAPI app. "
                "Check that secure_links_router is imported and mounted in backend/main.py."
            )

    def test_canonical_token_resolver_route_exists(self):
        """GET /api/discharge/secure/{token} must be reachable (returns 4xx, not a routing 404)."""
        from backend.main import app

        with patch("backend.services.secure_link_service.validate_token",
                   side_effect=ValueError("invalid token")):
            with TestClient(app, raise_server_exceptions=False) as client:
                response = client.get("/api/discharge/secure/smoke-test-token")
        # The route exists → the application returns its own 404, not a framework-level
        # 404 {"detail": "Not Found"} caused by a missing route.
        assert not (response.status_code == 404 and response.json().get("detail") == "Not Found"), (
            "GET /api/discharge/secure/{token} appears unregistered — framework returned 'Not Found'."
        )
        # Should be 404 (invalid token) or 410 (expired), never a raw framework 404
        assert response.status_code in (404, 410, 422), (
            f"Unexpected status {response.status_code} for canonical token resolver."
        )

    def test_compatibility_token_resolver_route_exists(self):
        """GET /api/secure-links/{token} must be reachable (returns 4xx, not a routing 404)."""
        from backend.main import app

        with patch("backend.services.secure_link_service.validate_token",
                   side_effect=ValueError("invalid token")):
            with TestClient(app, raise_server_exceptions=False) as client:
                response = client.get("/api/secure-links/smoke-test-token")
        assert not (response.status_code == 404 and response.json().get("detail") == "Not Found"), (
            "GET /api/secure-links/{token} appears unregistered — framework returned 'Not Found'."
        )
        assert response.status_code in (404, 410, 422), (
            f"Unexpected status {response.status_code} for compatibility token resolver."
        )

    def test_secure_link_router_tag(self):
        """The secure-links router must carry the expected OpenAPI tag."""
        from backend.api.routers.secure_links import router

        assert "Secure Discharge Links" in router.tags, (
            "secure_links router tag changed — verify OpenAPI docs are correct."
        )
