from __future__ import annotations

from datetime import timedelta

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.models.integration_alert_log import IntegrationAlertLog


def _make_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    IntegrationAlertLog.__table__.create(bind=engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)


def test_alerts_endpoint_filters_and_pagination(monkeypatch):
    from backend.api.routers import integration as integration_router

    app = FastAPI()
    app.include_router(integration_router.router)

    local_session = _make_session()
    monkeypatch.setattr(integration_router, "SessionLocal", local_session)

    now = integration_router.datetime.utcnow()
    db = local_session()
    db.add(
        IntegrationAlertLog(
            alert_type="scheduler_degraded",
            alert_key="scheduler_degraded",
            connector_key="scheduler",
            severity="critical",
            status="sent",
            channel="webhook",
            target="https://ops.example/alerts",
            message="Scheduler degraded",
            is_suppressed=False,
            triggered_at=now - timedelta(minutes=5),
            notified_at=now - timedelta(minutes=5),
        )
    )
    db.add(
        IntegrationAlertLog(
            alert_type="connector_repeated_failures",
            alert_key="connector_repeated_failures:fhir_integration",
            connector_key="fhir_integration",
            severity="error",
            status="suppressed",
            channel="internal",
            target=None,
            message="Repeated failures",
            is_suppressed=True,
            triggered_at=now - timedelta(minutes=2),
            notified_at=None,
        )
    )
    db.commit()
    db.close()

    route = next(
        r
        for r in app.routes
        if getattr(r, "path", None) == "/api/integrations/alerts"
        and "GET" in getattr(r, "methods", set())
    )
    auth_dependency = route.dependant.dependencies[0].call
    app.dependency_overrides[auth_dependency] = lambda: {
        "id": "ops-user",
        "email": "ops@example.test",
        "role": "tenant_admin",
        "tenant_id": "tenant-ops",
    }

    try:
        with TestClient(app) as client:
            response = client.get(
                "/api/integrations/alerts",
                params={
                    "connector_key": "fhir_integration",
                    "status": "suppressed",
                    "limit": 10,
                    "offset": 0,
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()

    assert payload["limit"] == 10
    assert payload["offset"] == 0
    assert payload["total"] == 1
    assert len(payload["alerts"]) == 1

    alert = payload["alerts"][0]
    assert alert["alert_type"] == "connector_repeated_failures"
    assert alert["severity"] == "error"
    assert alert["connector_key"] == "fhir_integration"
    assert alert["status"] == "suppressed"
    assert "message" in alert
    assert alert["is_suppressed"] is True
    assert "triggered_at" in alert
    assert "notified_at" in alert

    # Ensure sensitive fields are not exposed
    assert "target" not in alert
    assert "payload_json" not in alert
    assert "error_message" not in alert
