from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.models.integration_alert_log import IntegrationAlertLog
from backend.models.integration_connector import IntegrationConnector
from backend.models.integration_run import IntegrationRun
from backend.models.integration_sla_breach import IntegrationSLABreach
from backend.services import integration_monitoring_service as svc


def _make_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    IntegrationConnector.__table__.create(bind=engine)
    IntegrationRun.__table__.create(bind=engine)
    IntegrationAlertLog.__table__.create(bind=engine)
    IntegrationSLABreach.__table__.create(bind=engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)


def test_scheduler_debug_endpoint_reports_disabled_state(monkeypatch):
    from backend.api.routers import integration as integration_router

    app = FastAPI()
    app.include_router(integration_router.router)

    local_session = _make_session()
    monkeypatch.setattr(integration_router, "SessionLocal", local_session)

    monkeypatch.setenv("INTEGRATION_SCHEDULER_ENABLED", "false")
    monkeypatch.setenv("INTEGRATION_SCHEDULER_POLL_SECONDS", "15")
    monkeypatch.setenv("INTEGRATION_SCHEDULER_STALE_RUN_SECONDS", "600")

    monkeypatch.setattr(svc, "_scheduler_started", False)
    monkeypatch.setattr(svc, "_scheduler_thread", None)
    monkeypatch.setattr(svc, "_scheduler_last_tick_status", {"status": "ok", "scheduled": 0, "skipped": 0, "disabled": 0})
    monkeypatch.setattr(svc, "_scheduler_last_recovery_count", 0)

    db = local_session()
    connector = IntegrationConnector(
        connector_key="fhir_integration",
        connector_name="FHIR Integration",
        enabled=True,
        connection_url="http://example-fhir.test",
        auth_type="none",
        sync_interval_minutes=15,
        timeout_seconds=10,
        retry_count=1,
        retry_backoff_seconds=0,
    )
    db.add(connector)
    db.commit()
    db.refresh(connector)

    db.add(
        IntegrationRun(
            connector_id=connector.id,
            connector_key=connector.connector_key,
            connector_name=connector.connector_name,
            run_type="scheduled",
            status="running",
            triggered_by="scheduler",
        )
    )
    db.add(
        IntegrationRun(
            connector_id=connector.id,
            connector_key=connector.connector_key,
            connector_name=connector.connector_name,
            run_type="scheduled",
            status="queued",
            triggered_by="scheduler",
        )
    )
    db.commit()
    db.close()

    route = next(
        r
        for r in app.routes
        if getattr(r, "path", None) == "/api/integrations/scheduler/debug"
        and "GET" in getattr(r, "methods", set())
    )
    auth_dependency = route.dependant.dependencies[0].call
    app.dependency_overrides[auth_dependency] = lambda: {
        "id": "user-ops",
        "email": "ops@example.test",
        "role": "tenant_admin",
        "tenant_id": "tenant-ops",
    }

    try:
        with TestClient(app) as client:
            response = client.get("/api/integrations/scheduler/debug")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()

    expected_fields = {
        "scheduler_enabled",
        "scheduler_running",
        "poll_seconds",
        "stale_run_threshold_seconds",
        "last_tick_at",
        "last_tick_status",
        "active_runs_count",
        "queued_runs_count",
        "enabled_connectors_count",
        "last_recovery_at",
        "last_recovery_count",
        "overall_status",
    }
    assert expected_fields.issubset(payload.keys())

    assert payload["scheduler_enabled"] is False
    assert payload["scheduler_running"] is False
    assert payload["poll_seconds"] == 15
    assert payload["stale_run_threshold_seconds"] == 600
    assert payload["active_runs_count"] == 1
    assert payload["queued_runs_count"] == 1
    assert payload["enabled_connectors_count"] >= 1
    assert payload["overall_status"] == "disabled"
