from __future__ import annotations

from datetime import timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models.integration_alert_log import IntegrationAlertLog
from backend.models.integration_connector import IntegrationConnector
from backend.models.integration_run import IntegrationError, IntegrationRun, IntegrationRunItem
from backend.models.integration_sla_breach import IntegrationSLABreach
from backend.services import integration_monitoring_service as svc


class _ImmediateThread:
    def __init__(self, target, args=(), daemon=None):
        self._target = target
        self._args = args

    def start(self):
        self._target(*self._args)

    def join(self, timeout=None):
        return None


def _make_session():
    engine = create_engine("sqlite:///:memory:")
    IntegrationConnector.__table__.create(bind=engine)
    IntegrationRun.__table__.create(bind=engine)
    IntegrationRunItem.__table__.create(bind=engine)
    IntegrationError.__table__.create(bind=engine)
    IntegrationAlertLog.__table__.create(bind=engine)
    IntegrationSLABreach.__table__.create(bind=engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)


def _seed_connector(db, *, enabled: bool, key: str = "fhir_integration"):
    connector = IntegrationConnector(
        connector_key=key,
        connector_name="FHIR Integration" if key == "fhir_integration" else key,
        enabled=enabled,
        connection_url="http://example-fhir.test" if key == "fhir_integration" else "http://example.test",
        auth_type="none",
        sync_interval_minutes=15,
        timeout_seconds=5,
        retry_count=1,
        retry_backoff_seconds=0,
    )
    db.add(connector)
    db.commit()
    db.refresh(connector)
    return connector


def test_scheduler_triggers_enabled_connector(monkeypatch):
    local_session = _make_session()
    monkeypatch.setattr(svc, "SessionLocal", local_session)
    monkeypatch.setattr(svc.threading, "Thread", _ImmediateThread)
    monkeypatch.setattr(svc, "ensure_connectors_seeded", lambda db: None)
    monkeypatch.setattr(svc, "run_due_escalation_sweep", lambda now=None: {"escalated": 0})

    def _fake_fhir(db, connector, run):
        run.status = "success"
        run.records_processed = 3
        run.records_created = 3
        run.records_updated = 0
        run.records_failed = 0
        run.error_summary = None

    monkeypatch.setattr(svc, "_run_fhir_sync", _fake_fhir)

    db = local_session()
    _seed_connector(db, enabled=True)
    db.close()

    stats = svc.run_scheduler_tick()
    assert stats["scheduled"] == 1

    db = local_session()
    runs = db.query(IntegrationRun).all()
    assert len(runs) == 1
    assert runs[0].run_type == "scheduled"
    assert runs[0].status == "success"
    db.close()


def test_scheduler_skips_disabled_connector(monkeypatch):
    local_session = _make_session()
    monkeypatch.setattr(svc, "SessionLocal", local_session)
    monkeypatch.setattr(svc.threading, "Thread", _ImmediateThread)
    monkeypatch.setattr(svc, "ensure_connectors_seeded", lambda db: None)
    monkeypatch.setattr(svc, "run_due_escalation_sweep", lambda now=None: {"escalated": 0})

    db = local_session()
    _seed_connector(db, enabled=False)
    db.close()

    stats = svc.run_scheduler_tick()
    assert stats["scheduled"] == 0
    assert stats["disabled"] == 1

    db = local_session()
    assert db.query(IntegrationRun).count() == 0
    db.close()


def test_scheduler_no_overlap_with_active_run(monkeypatch):
    local_session = _make_session()
    monkeypatch.setattr(svc, "SessionLocal", local_session)
    monkeypatch.setattr(svc.threading, "Thread", _ImmediateThread)
    monkeypatch.setattr(svc, "ensure_connectors_seeded", lambda db: None)
    monkeypatch.setattr(svc, "run_due_escalation_sweep", lambda now=None: {"escalated": 0})

    db = local_session()
    connector = _seed_connector(db, enabled=True)
    db.add(
        IntegrationRun(
            connector_id=connector.id,
            connector_key=connector.connector_key,
            connector_name=connector.connector_name,
            run_type="scheduled",
            status="running",
            started_at=svc.utcnow(),
            triggered_by="scheduler",
            details_json={"phase": "running"},
        )
    )
    db.commit()
    db.close()

    stats = svc.run_scheduler_tick()
    assert stats["scheduled"] == 0

    db = local_session()
    runs = db.query(IntegrationRun).all()
    assert len(runs) == 1
    assert runs[0].status == "running"
    db.close()


def test_run_status_persistence_for_scheduled_run(monkeypatch):
    local_session = _make_session()
    monkeypatch.setattr(svc, "SessionLocal", local_session)
    monkeypatch.setattr(svc.threading, "Thread", _ImmediateThread)
    monkeypatch.setattr(svc, "run_due_escalation_sweep", lambda now=None: {"escalated": 0})

    def _fake_fhir(db, connector, run):
        run.status = "partial_success"
        run.records_processed = 5
        run.records_created = 4
        run.records_updated = 1
        run.records_failed = 1
        run.error_summary = "One resource failed"

    monkeypatch.setattr(svc, "_run_fhir_sync", _fake_fhir)

    db = local_session()
    connector = _seed_connector(db, enabled=True)
    run = svc.enqueue_scheduled_sync(db, connector, scheduled_for=svc.utcnow() - timedelta(minutes=1))
    assert run is not None
    db.close()

    db = local_session()
    persisted = db.query(IntegrationRun).filter(IntegrationRun.id == run.id).first()
    assert persisted is not None
    assert persisted.run_type == "scheduled"
    assert persisted.status == "partial_success"
    assert persisted.started_at is not None
    assert persisted.completed_at is not None
    assert persisted.records_processed == 5
    assert persisted.records_created == 4
    assert persisted.records_updated == 1
    assert persisted.records_failed == 1
    assert persisted.error_summary == "One resource failed"
    db.close()


def test_scheduler_reports_automated_escalations(monkeypatch):
    local_session = _make_session()
    monkeypatch.setattr(svc, "SessionLocal", local_session)
    monkeypatch.setattr(svc.threading, "Thread", _ImmediateThread)
    monkeypatch.setattr(svc, "ensure_connectors_seeded", lambda db: None)
    monkeypatch.setattr(svc, "run_due_escalation_sweep", lambda now=None: {"escalated": 2})

    db = local_session()
    _seed_connector(db, enabled=False)
    db.close()

    stats = svc.run_scheduler_tick()
    assert stats["automated_escalations"] == 2
