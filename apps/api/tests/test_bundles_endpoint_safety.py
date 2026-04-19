from __future__ import annotations

import json
import logging
import zipfile
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend.api.deps import get_current_user
from backend.api.routers.discharge import router
from backend.api.routers.discharge import build_evidence_bundle
from backend.api.routers.discharge import get_bundles
from backend.core.discharge_query_service import list_bundles


def _write_bundle(path: Path, tenant_id: str | None) -> None:
    payload = {"tenant": {"id": tenant_id}} if tenant_id is not None else {"tenant": {}}
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("case_summary.json", json.dumps(payload))


def test_list_bundles_empty_returns_empty_list(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.chdir(tmp_path)

    result = list_bundles("tenant-1")

    assert result == []


def test_list_bundles_returns_matching_tenant_rows(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.chdir(tmp_path)
    bundles_dir = tmp_path / "backend" / "generated" / "bundles"
    bundles_dir.mkdir(parents=True, exist_ok=True)

    _write_bundle(bundles_dir / "bundle_tenant_1.zip", "tenant-1")
    _write_bundle(bundles_dir / "bundle_other_tenant.zip", "tenant-2")

    result = list_bundles("tenant-1")

    assert len(result) == 1
    assert result[0]["name"] == "bundle_tenant_1.zip"
    assert result[0]["path"].endswith("bundle_tenant_1.zip")


def test_list_bundles_ignores_malformed_legacy_rows(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.chdir(tmp_path)
    bundles_dir = tmp_path / "backend" / "generated" / "bundles"
    bundles_dir.mkdir(parents=True, exist_ok=True)

    _write_bundle(bundles_dir / "valid.zip", "tenant-1")

    with zipfile.ZipFile(bundles_dir / "missing_case_summary.zip", "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("other.json", "{}")

    with zipfile.ZipFile(bundles_dir / "bad_json.zip", "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("case_summary.json", "not-json")

    (bundles_dir / "legacy_invalid.zip").write_bytes(b"not-a-zip-file")

    result = list_bundles("tenant-1")

    assert [item["name"] for item in result] == ["valid.zip"]


def test_bundles_route_returns_403_for_user_without_permission(caplog: pytest.LogCaptureFixture):
    caplog.set_level(logging.INFO)
    current_user = {
        "id": "user-viewer-1",
        "tenant_id": "tenant-1",
        "role": "viewer",
    }

    with pytest.raises(HTTPException) as exc:
        get_bundles(current_user=current_user)

    assert exc.value.status_code == 403
    assert "bundles_list_permission_denied" in caplog.text


def test_bundles_route_returns_500_with_traceback_logging(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
):
    caplog.set_level(logging.INFO)
    current_user = {
        "id": "user-legal-1",
        "tenant_id": "tenant-1",
        "role": "legal_admin",
    }

    def _boom(_tenant_id: str):
        raise RuntimeError("disk scan failed")

    monkeypatch.setattr("backend.api.routers.discharge.list_bundles", _boom)

    with pytest.raises(HTTPException) as exc:
        get_bundles(current_user=current_user)

    assert exc.value.status_code == 500
    assert exc.value.detail == "حدث خطأ داخلي في الخادم"
    assert "bundles_unexpected_error" in caplog.text
    assert "Traceback" in caplog.text


def _test_client_for_user(user: dict) -> TestClient:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app)


def test_bundles_endpoint_authorized_no_bundles_returns_200_empty(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr("backend.api.routers.discharge.list_bundles", lambda _tenant_id: [])

    client = _test_client_for_user(
        {
            "id": "user-legal-1",
            "tenant_id": "tenant-1",
            "role": "legal_admin",
            "tenant_code": "TENANT_1",
        }
    )

    response = client.get("/api/discharge/bundles")

    assert response.status_code == 200
    assert response.json() == []


def test_bundles_endpoint_authorized_existing_bundles_returns_200(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        "backend.api.routers.discharge.list_bundles",
        lambda _tenant_id: [{"name": "bundle_1.zip", "path": "backend/generated/bundles/bundle_1.zip"}],
    )

    client = _test_client_for_user(
        {
            "id": "user-legal-1",
            "tenant_id": "tenant-1",
            "role": "legal_admin",
            "tenant_code": "TENANT_1",
        }
    )

    response = client.get("/api/discharge/bundles")

    assert response.status_code == 200
    assert response.json() == [{"name": "bundle_1.zip", "path": "backend/generated/bundles/bundle_1.zip"}]


def test_bundles_endpoint_unauthorized_returns_403(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr("backend.api.routers.discharge.list_bundles", lambda _tenant_id: [])

    client = _test_client_for_user(
        {
            "id": "user-viewer-1",
            "tenant_id": "tenant-1",
            "role": "viewer",
            "tenant_code": "TENANT_1",
        }
    )

    response = client.get("/api/discharge/bundles")

    assert response.status_code == 403


def test_bundles_endpoint_unexpected_failure_returns_500(monkeypatch: pytest.MonkeyPatch):
    def _boom(_tenant_id: str):
        raise RuntimeError("disk scan failed")

    monkeypatch.setattr("backend.api.routers.discharge.list_bundles", _boom)

    client = _test_client_for_user(
        {
            "id": "user-legal-1",
            "tenant_id": "tenant-1",
            "role": "legal_admin",
            "tenant_code": "TENANT_1",
        }
    )

    response = client.get("/api/discharge/bundles")

    assert response.status_code == 500
    assert response.json().get("detail") == "حدث خطأ داخلي في الخادم"


def test_evidence_bundle_route_returns_403_for_user_without_generate_permission():
    current_user = {
        "id": "user-viewer-1",
        "tenant_id": "tenant-1",
        "role": "viewer",
    }

    with pytest.raises(HTTPException) as exc:
        build_evidence_bundle("case-1", current_user=current_user)

    assert exc.value.status_code == 403


def test_evidence_bundle_endpoint_legal_officer_returns_200(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr("backend.api.routers.discharge.require_case_access", lambda _user, _case_id: object())
    monkeypatch.setattr(
        "backend.api.routers.discharge.generate_evidence_bundle",
        lambda case_id, tenant_id=None, actor_user_id=None: {
            "bundle_file": f"evidence_bundle_{case_id}.zip",
            "tenant_id": tenant_id,
            "actor_user_id": actor_user_id,
        },
    )

    client = _test_client_for_user(
        {
            "id": "user-legal-2",
            "tenant_id": "tenant-1",
            "role": "legal_officer",
            "tenant_code": "TENANT_1",
        }
    )

    response = client.post("/api/discharge/evidence-bundle/case-1")

    assert response.status_code == 200
    assert response.json()["bundle_file"] == "evidence_bundle_case-1.zip"
