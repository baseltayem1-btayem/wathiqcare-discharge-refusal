from __future__ import annotations

from datetime import timedelta

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


def test_scheduler_degraded_creates_alert_log(monkeypatch):
    local_session = _make_session()
    monkeypatch.setattr(svc, "SessionLocal", local_session)

    monkeypatch.setenv("INTEGRATION_ALERTS_ENABLED", "true")
    monkeypatch.setenv("INTEGRATION_SCHEDULER_ENABLED", "true")
    monkeypatch.setenv("INTEGRATION_ALERT_COOLDOWN_SECONDS", "300")

    monkeypatch.setattr(svc, "_scheduler_started", False)
    monkeypatch.setattr(svc, "_scheduler_thread", None)
    monkeypatch.setattr(svc, "_send_alert_via_email", lambda **kwargs: (False, "no email", []))
    monkeypatch.setattr(svc, "_send_alert_via_webhook", lambda **kwargs: (False, "no webhook", None))

    db = local_session()
    db.add(
        IntegrationConnector(
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
    )
    db.commit()
    db.close()

    svc.evaluate_scheduler_alerts()

    db = local_session()
    logs = db.query(IntegrationAlertLog).filter(IntegrationAlertLog.alert_type == "scheduler_degraded").all()
    assert len(logs) >= 1
    assert logs[-1].status in {"skipped", "failed", "sent", "suppressed"}
    db.close()


def test_repeated_connector_failures_alert_and_rate_limit(monkeypatch):
    local_session = _make_session()
    monkeypatch.setattr(svc, "SessionLocal", local_session)

    monkeypatch.setenv("INTEGRATION_ALERTS_ENABLED", "true")
    monkeypatch.setenv("INTEGRATION_ALERT_REPEATED_FAILURE_THRESHOLD", "3")
    monkeypatch.setenv("INTEGRATION_ALERT_COOLDOWN_SECONDS", "3600")

    monkeypatch.setattr(svc, "_send_alert_via_email", lambda **kwargs: (False, "no email", []))
    monkeypatch.setattr(svc, "_send_alert_via_webhook", lambda **kwargs: (True, None, "https://ops-hook.local/alerts"))

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
    connector_id = connector.id
    connector_key = connector.connector_key

    now = svc.utcnow()
    for idx in range(3):
        db.add(
            IntegrationRun(
                connector_id=connector.id,
                connector_key=connector.connector_key,
                connector_name=connector.connector_name,
                run_type="scheduled",
                status="failed",
                started_at=now - timedelta(minutes=idx + 2),
                completed_at=now - timedelta(minutes=idx + 1),
                triggered_by="scheduler",
                error_summary="test failure",
            )
        )
    db.commit()
    db.close()

    first = svc.evaluate_connector_failure_alert(connector_id)
    second = svc.evaluate_connector_failure_alert(connector_id)

    assert first is True
    assert second is False

    db = local_session()
    key = f"connector_repeated_failures:{connector_key}"
    logs = (
        db.query(IntegrationAlertLog)
        .filter(IntegrationAlertLog.alert_key == key)
        .all()
    )
    assert any(item.status == "sent" and item.channel == "webhook" for item in logs)
    assert any(item.status == "suppressed" for item in logs)
    db.close()
