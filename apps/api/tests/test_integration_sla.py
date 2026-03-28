"""Tests for the SLA breach detection layer."""
from __future__ import annotations

from datetime import timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.models.integration_alert_log import IntegrationAlertLog
import os
import tempfile
import shutil
import sqlalchemy

# Import the service module as svc for test usage
from backend.services import integration_monitoring_service as svc

# Import IntegrationConnector for use in tests
from backend.models.integration_connector import IntegrationConnector

# Import IntegrationSLABreach for use in tests
from backend.models.integration_sla_breach import IntegrationSLABreach

# Use a file-based SQLite DB for test and app
TEST_DB_PATH = os.path.abspath("test_sla.db")
TEST_DB_URL = f"sqlite:///{TEST_DB_PATH}"

@pytest.fixture(scope="session")
def test_engine_and_session():
    # Remove old test DB if exists
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    engine = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
    )
    from backend.models.integration_connector import IntegrationConnector
    from backend.models.integration_run import IntegrationRun
    from backend.models.integration_alert_log import IntegrationAlertLog
    from backend.models.integration_sla_breach import IntegrationSLABreach
    IntegrationConnector.__table__.create(bind=engine)
    IntegrationRun.__table__.create(bind=engine)
    IntegrationAlertLog.__table__.create(bind=engine)
    IntegrationSLABreach.__table__.create(bind=engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    yield engine, Session

    engine.dispose()
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)

@pytest.fixture
def local_session(test_engine_and_session):
    _, Session = test_engine_and_session
    return Session

def test_sla_delayed_sync_breach_detected(monkeypatch, local_session):
    monkeypatch.setattr(svc, "SessionLocal", local_session)
    monkeypatch.setenv("INTEGRATION_ALERTS_ENABLED", "false")
    monkeypatch.setenv("INTEGRATION_SLA_MAX_SYNC_DELAY_SECONDS", "100")

    db = local_session()
    # last_success_at is None; created_at is far in the past → delay > threshold
    connector = _make_connector(db, created_at=svc.utcnow() - timedelta(seconds=200))
    db.close()

    db = local_session()
    connector = db.query(IntegrationConnector).first()
    breaches = svc.evaluate_sla_for_connector(db, connector)
    db.close()

    assert any(b["breach_type"] == "delayed_sync" for b in breaches)

    db = local_session()
    stored = db.query(IntegrationSLABreach).filter_by(breach_type="delayed_sync", status="open").first()
    assert stored is not None
    assert stored.connector_key == "fhir_integration"
    assert stored.metric_value > 100
    assert stored.threshold_value == 100.0
    db.close()


# ---------------------------------------------------------------------------
# Test: delayed_sync breach NOT created when within threshold
# ---------------------------------------------------------------------------

def test_sla_no_breach_when_recent_sync(monkeypatch, local_session):
    monkeypatch.setattr(svc, "SessionLocal", local_session)
    monkeypatch.setenv("INTEGRATION_ALERTS_ENABLED", "false")
    monkeypatch.setenv("INTEGRATION_SLA_MAX_SYNC_DELAY_SECONDS", "3600")

    db = local_session()
    # last_success_at = 10 minutes ago (well within 1-hour threshold)
    _make_connector(db, last_success_at=svc.utcnow() - timedelta(minutes=10))
    db.close()

    db = local_session()
    connector = db.query(IntegrationConnector).first()
    breaches = svc.evaluate_sla_for_connector(db, connector)
    db.close()

    assert not any(b["breach_type"] == "delayed_sync" for b in breaches)

    db = local_session()
    assert db.query(IntegrationSLABreach).count() == 0
    db.close()


# ---------------------------------------------------------------------------
# Test: high_failure_rate breach detected
# ---------------------------------------------------------------------------

def test_sla_high_failure_rate_breach(monkeypatch, local_session):
    monkeypatch.setattr(svc, "SessionLocal", local_session)
    monkeypatch.setenv("INTEGRATION_ALERTS_ENABLED", "false")
    # Use 1-hour threshold so delayed_sync doesn't fire → focus on failure_rate
    monkeypatch.setenv("INTEGRATION_SLA_MAX_SYNC_DELAY_SECONDS", "3600")
    monkeypatch.setenv("INTEGRATION_SLA_MAX_FAILURE_RATE", "0.3")
    monkeypatch.setenv("INTEGRATION_SLA_FAILURE_RATE_WINDOW", "5")

    db = local_session()
    connector = _make_connector(db, last_success_at=svc.utcnow() - timedelta(minutes=5))
    now = svc.utcnow()
    # 4 failed out of 5 → 80% failure rate, exceeds 30% SLA threshold
    for i in range(4):
        db.add(IntegrationRun(
            connector_id=connector.id,
            connector_key=connector.connector_key,
            connector_name=connector.connector_name,
            run_type="scheduled",
            status="failed",
            started_at=now - timedelta(minutes=i + 1),
            completed_at=now - timedelta(minutes=i),
        ))
    db.add(IntegrationRun(
        connector_id=connector.id,
        connector_key=connector.connector_key,
        connector_name=connector.connector_name,
        run_type="scheduled",
        status="success",
        started_at=now - timedelta(minutes=10),
        completed_at=now - timedelta(minutes=9),
    ))
    db.commit()
    db.close()

    db = local_session()
    connector = db.query(IntegrationConnector).first()
    breaches = svc.evaluate_sla_for_connector(db, connector)
    db.close()

    assert any(b["breach_type"] == "high_failure_rate" for b in breaches)

    db = local_session()
    stored = db.query(IntegrationSLABreach).filter_by(breach_type="high_failure_rate", status="open").first()
    assert stored is not None
    assert stored.metric_value > 0.3
    assert stored.threshold_value == pytest.approx(0.3)
    db.close()


# ---------------------------------------------------------------------------
# Test: max_queue_time breach detected for stuck queued run
# ---------------------------------------------------------------------------

def test_sla_max_queue_time_breach(monkeypatch, local_session):
    monkeypatch.setattr(svc, "SessionLocal", local_session)
    monkeypatch.setenv("INTEGRATION_ALERTS_ENABLED", "false")
    monkeypatch.setenv("INTEGRATION_SLA_MAX_SYNC_DELAY_SECONDS", "3600")
    monkeypatch.setenv("INTEGRATION_SLA_MAX_QUEUE_TIME_SECONDS", "60")

    db = local_session()
    connector = _make_connector(db, last_success_at=svc.utcnow() - timedelta(minutes=5))
    now = svc.utcnow()
    db.add(IntegrationRun(
        connector_id=connector.id,
        connector_key=connector.connector_key,
        connector_name=connector.connector_name,
        run_type="scheduled",
        status="queued",
        started_at=now - timedelta(seconds=200),  # queued 200s > 60s threshold
    ))
    db.commit()
    db.close()

    db = local_session()
    connector = db.query(IntegrationConnector).first()
    breaches = svc.evaluate_sla_for_connector(db, connector)
    db.close()

    assert any(b["breach_type"] == "max_queue_time" for b in breaches)

    db = local_session()
    stored = db.query(IntegrationSLABreach).filter_by(breach_type="max_queue_time", status="open").first()
    assert stored is not None
    assert stored.metric_value > 60
    db.close()


# ---------------------------------------------------------------------------
# Test: breach is auto-resolved when condition clears
# ---------------------------------------------------------------------------

def test_sla_breach_auto_resolved(monkeypatch, local_session):
    monkeypatch.setattr(svc, "SessionLocal", local_session)
    monkeypatch.setenv("INTEGRATION_ALERTS_ENABLED", "false")
    monkeypatch.setenv("INTEGRATION_SLA_MAX_SYNC_DELAY_SECONDS", "100")

    db = local_session()
    # Seed an existing open delayed_sync breach
    db.add(IntegrationSLABreach(
        connector_key="fhir_integration",
        breach_type="delayed_sync",
        severity="warning",
        status="open",
        message="old breach",
        metric_value=300.0,
        threshold_value=100.0,
        alert_dispatched=False,
    ))
    db.commit()
    # Connector with recent success → no longer in breach
    connector = _make_connector(db, last_success_at=svc.utcnow() - timedelta(seconds=10))
    db.close()

    db = local_session()
    connector = db.query(IntegrationConnector).first()
    breaches = svc.evaluate_sla_for_connector(db, connector)
    db.close()

    assert not any(b["breach_type"] == "delayed_sync" for b in breaches)

    db = local_session()
    stored = db.query(IntegrationSLABreach).filter_by(breach_type="delayed_sync").first()
    assert stored.status == "resolved"
    assert stored.resolved_at is not None
    db.close()


# ---------------------------------------------------------------------------
# Test: GET /api/integrations/sla/status endpoint
# ---------------------------------------------------------------------------

def test_sla_status_endpoint_structure(monkeypatch, local_session):

    from backend.api.routers import integration as integration_router

    app = FastAPI()
    app.include_router(integration_router.router)

    from datetime import timezone
    import pytest

    monkeypatch.setenv("INTEGRATION_ALERTS_ENABLED", "false")
    monkeypatch.setenv("INTEGRATION_SLA_MAX_SYNC_DELAY_SECONDS", "3600")

    db = local_session()
    now = svc.utcnow().replace(tzinfo=timezone.utc)
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
        last_success_at=now - timedelta(minutes=30),
    )
    db.add(connector)
    db.add(IntegrationSLABreach(
        connector_key="fhir_integration",
        breach_type="high_failure_rate",
        severity="error",
        status="open",
        message="Failure rate 80% exceeds threshold 50%",
        metric_value=0.8,
        threshold_value=0.5,
        alert_dispatched=False,
        detected_at=now - timedelta(minutes=5),
    ))
    db.commit()
    db.close()

    # Patch get_current_user for authentication
    from backend.api import deps
    app.dependency_overrides[deps.get_current_user] = lambda: {
        "id": "ops-user",
        "email": "ops@example.test",
        "role": "tenant_admin",
        "tenant_id": "tenant-ops",
        "is_active": True,
    }
    # Patch get_db to use the test's local_session

    def _test_get_db():
        db = local_session()
        try:
            yield db
        finally:
            db.close()
    app.dependency_overrides[deps.get_db] = _test_get_db

    client = TestClient(app, raise_server_exceptions=True)
    resp = client.get("/api/integrations/sla/status")
    assert resp.status_code == 200

    body = resp.json()
    assert "evaluated_at" in body
    assert "summary" in body
    assert "connectors" in body

    summary = body["summary"]
    assert "connectors_ok" in summary
    assert "connectors_breached" in summary
    assert "connectors_disabled" in summary
    assert "total_open_breaches" in summary
    assert len(body["connectors"]) >= 1
    fhir = next((c for c in body["connectors"] if c["connector_key"] == "fhir_integration"), None)
    assert fhir is not None
    assert fhir["enabled"] is True
    assert fhir["sla_status"] == "breached"
    assert fhir["open_breach_count"] == 1
    assert len(fhir["breaches"]) == 1

    breach = fhir["breaches"][0]
    assert breach["breach_type"] == "high_failure_rate"
    assert breach["severity"] == "error"
    assert breach["metric_value"] == pytest.approx(0.8)
    assert breach["threshold_value"] == pytest.approx(0.5)

    sla_rules = fhir["sla_rules"]
    assert "max_sync_delay_seconds" in sla_rules
    assert "max_failure_rate" in sla_rules
    assert "max_queue_time_seconds" in sla_rules
    assert "failure_rate_window" in sla_rules

    client = TestClient(app, raise_server_exceptions=True)
    resp = client.get("/api/integrations/sla/status")
    assert resp.status_code == 200

    body = resp.json()
    assert "evaluated_at" in body
    assert "summary" in body
    assert "connectors" in body

    summary = body["summary"]
    assert "connectors_ok" in summary
    assert "connectors_breached" in summary
    assert "connectors_disabled" in summary
    assert "total_open_breaches" in summary

    assert len(body["connectors"]) >= 1
    fhir = next((c for c in body["connectors"] if c["connector_key"] == "fhir_integration"), None)
    assert fhir is not None
    assert fhir["enabled"] is True
    assert fhir["sla_status"] == "breached"
    assert fhir["open_breach_count"] == 1
    assert len(fhir["breaches"]) == 1

    breach = fhir["breaches"][0]
    assert breach["breach_type"] == "high_failure_rate"
    assert breach["severity"] == "error"
    assert breach["metric_value"] == pytest.approx(0.8)
    assert breach["threshold_value"] == pytest.approx(0.5)

    sla_rules = fhir["sla_rules"]
    assert "max_sync_delay_seconds" in sla_rules
    assert "max_failure_rate" in sla_rules
    assert "max_queue_time_seconds" in sla_rules
    assert "failure_rate_window" in sla_rules
