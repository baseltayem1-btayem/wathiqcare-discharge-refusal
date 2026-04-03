from __future__ import annotations

import logging
import os
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional

import requests
from sqlalchemy import desc
from sqlalchemy.orm import Session

from backend.core.email_service import EmailConfigurationError, EmailServiceConfig, MicrosoftGraphClient
from backend.core.database import SessionLocal
from backend.models.integration_alert_log import IntegrationAlertLog
from backend.models.integration_sla_breach import IntegrationSLABreach
from backend.models.audit_log import AuditLog
from backend.models.integration_connector import IntegrationConnector
from backend.models.integration_run import IntegrationError, IntegrationRun, IntegrationRunItem
from backend.services.workflow_automation_service import run_due_escalation_sweep

logger = logging.getLogger(__name__)

CONNECTOR_DEFINITIONS = {
    "epic_emr": {"name": "Epic EMR", "kind": "mock"},
    "cerner_millennium": {"name": "Cerner Millennium", "kind": "mock"},
    # Legacy system removed
    "fhir_integration": {"name": "FHIR Integration", "kind": "live"},
}

CONNECTOR_KEY_ALIASES = {
    "epic": "epic_emr",
    "epic-emr": "epic_emr",
    "epic_emr": "epic_emr",
    "cerner": "cerner_millennium",
    "cerner-millennium": "cerner_millennium",
    "cerner_millennium": "cerner_millennium",
    # Legacy system aliases removed
    "fhir": "fhir_integration",
    "fhir-integration": "fhir_integration",
    "fhir_integration": "fhir_integration",
}

ACTIVE_STATUSES = {"queued", "running"}
_scheduler_lock = threading.Lock()
_scheduler_started = False
_scheduler_stop_event: Optional[threading.Event] = None
_scheduler_thread: Optional[threading.Thread] = None
_scheduler_last_tick_at: Optional[datetime] = None
_scheduler_last_tick_status: Optional[Dict[str, Any]] = None
_scheduler_last_recovery_at: Optional[datetime] = None
_scheduler_last_recovery_count: int = 0


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def normalize_connector_key(value: str) -> str:
    key = (value or "").strip().lower().replace(" ", "_")
    return CONNECTOR_KEY_ALIASES.get(key, key)


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _parse_csv_env(name: str) -> List[str]:
    raw = os.getenv(name, "")
    return [item.strip() for item in raw.split(",") if item.strip()]


def _alerting_enabled() -> bool:
    return _bool_env("INTEGRATION_ALERTS_ENABLED", True)


def _alert_cooldown_seconds() -> int:
    return max(60, _int_env("INTEGRATION_ALERT_COOLDOWN_SECONDS", 900))


def _repeated_failure_threshold() -> int:
    return max(2, _int_env("INTEGRATION_ALERT_REPEATED_FAILURE_THRESHOLD", 3))


def _alert_webhook_timeout_seconds() -> int:
    return max(3, _int_env("INTEGRATION_ALERT_WEBHOOK_TIMEOUT_SECONDS", 10))


def _resource_set_from_env(connector_key: str) -> Optional[List[str]]:
    env_key = f"INTEGRATION_{connector_key.upper()}_RESOURCE_SET"
    raw = os.getenv(env_key)
    if raw is None and connector_key == "fhir_integration":
        raw = os.getenv("FHIR_RESOURCE_SET", "Patient,Encounter,Procedure,Consent")
    if not raw:
        return None
    parsed = [item.strip() for item in raw.split(",") if item.strip()]
    return parsed or None


def _get_env_connector_config(connector_key: str, existing: IntegrationConnector) -> Dict[str, Any]:
    prefix = f"INTEGRATION_{connector_key.upper()}"
    fallback_url = "FHIR_BASE_URL" if connector_key == "fhir_integration" else None
    fallback_token = "FHIR_AUTH_TOKEN" if connector_key == "fhir_integration" else None

    connection_url = os.getenv(f"{prefix}_URL")
    if not connection_url and fallback_url:
        connection_url = os.getenv(fallback_url)

    auth_token = os.getenv(f"{prefix}_AUTH_TOKEN")
    if not auth_token and fallback_token:
        auth_token = os.getenv(fallback_token)

    return {
        "connection_url": connection_url if connection_url is not None else existing.connection_url,
        "auth_type": os.getenv(f"{prefix}_AUTH_TYPE", existing.auth_type or "none"),
        "auth_username": os.getenv(f"{prefix}_AUTH_USERNAME", existing.auth_username),
        "auth_password": os.getenv(f"{prefix}_AUTH_PASSWORD", existing.auth_password),
        "auth_token": auth_token if auth_token is not None else existing.auth_token,
        "api_key": os.getenv(f"{prefix}_API_KEY", existing.api_key),
        "enabled": _bool_env(f"{prefix}_ENABLED", existing.enabled),
        "sync_interval_minutes": _int_env(f"{prefix}_SYNC_INTERVAL_MINUTES", existing.sync_interval_minutes),
        "timeout_seconds": _int_env(f"{prefix}_TIMEOUT_SECONDS", existing.timeout_seconds),
        "retry_count": _int_env(f"{prefix}_RETRY_COUNT", existing.retry_count),
        "retry_backoff_seconds": _int_env(f"{prefix}_RETRY_BACKOFF_SECONDS", existing.retry_backoff_seconds),
        "resource_set_json": _resource_set_from_env(connector_key) or existing.resource_set_json,
    }


def ensure_connectors_seeded(db: Session) -> None:
    for connector_key, details in CONNECTOR_DEFINITIONS.items():
        connector = (
            db.query(IntegrationConnector)
            .filter(IntegrationConnector.connector_key == connector_key)
            .first()
        )
        if not connector:
            connector = IntegrationConnector(
                connector_key=connector_key,
                connector_name=details["name"],
                enabled=False,
                sync_interval_minutes=15 if connector_key == "fhir_integration" else 30,
                timeout_seconds=20,
                retry_count=1,
                retry_backoff_seconds=2,
                resource_set_json=(
                    ["Patient", "Encounter", "Procedure", "Consent"]
                    if connector_key == "fhir_integration"
                    else None
                ),
            )
            db.add(connector)
            db.flush()

        env_config = _get_env_connector_config(connector_key, connector)
        for attr, value in env_config.items():
            setattr(connector, attr, value)

        connector.updated_at = utcnow()

    db.commit()


def _latest_run(db: Session, connector_id: str) -> Optional[IntegrationRun]:
    return (
        db.query(IntegrationRun)
        .filter(IntegrationRun.connector_id == connector_id)
        .order_by(desc(IntegrationRun.started_at))
        .first()
    )


def _latest_scheduled_run(db: Session, connector_id: str) -> Optional[IntegrationRun]:
    return (
        db.query(IntegrationRun)
        .filter(
            IntegrationRun.connector_id == connector_id,
            IntegrationRun.run_type == "scheduled",
        )
        .order_by(desc(IntegrationRun.started_at))
        .first()
    )


def _connector_eligible_for_scheduled_run(connector: IntegrationConnector) -> bool:
    if not connector.enabled:
        return False
    if connector.last_health_status == "disabled":
        return False

    if connector.connector_key == "fhir_integration":
        if not connector.connection_url:
            return False
        auth_type = (connector.auth_type or "none").lower()
        if auth_type == "bearer" and not connector.auth_token:
            return False
        if auth_type == "api_key" and not connector.api_key:
            return False

    return True


def _next_due_at(db: Session, connector: IntegrationConnector, *, now: Optional[datetime] = None) -> datetime:
    current = now or utcnow()
    latest_scheduled = _latest_scheduled_run(db, connector.id)
    if not latest_scheduled:
        return current

    base = latest_scheduled.completed_at or latest_scheduled.started_at or latest_scheduled.created_at or current
    interval_seconds = max(1, connector.sync_interval_minutes) * 60
    return base + timedelta(seconds=interval_seconds)


def serialize_connector_status(db: Session, connector: IntegrationConnector) -> Dict[str, Any]:
    latest = _latest_run(db, connector.id)
    active_run = (
        db.query(IntegrationRun)
        .filter(
            IntegrationRun.connector_id == connector.id,
            IntegrationRun.status.in_(ACTIVE_STATUSES),
        )
        .order_by(desc(IntegrationRun.started_at))
        .first()
    )

    effective_status = "disabled" if not connector.enabled else "success"
    if latest:
        effective_status = latest.status
    if active_run:
        effective_status = active_run.status

    last_scheduled = _latest_scheduled_run(db, connector.id)
    next_scheduled = _next_due_at(db, connector) if connector.enabled else None

    return {
        "connector_key": connector.connector_key,
        "connector_name": connector.connector_name,
        "enabled": connector.enabled,
        "status": effective_status,
        "live_mode": CONNECTOR_DEFINITIONS.get(connector.connector_key, {}).get("kind") == "live",
        "connection_url": connector.connection_url,
        "sync_interval_minutes": connector.sync_interval_minutes,
        "timeout_seconds": connector.timeout_seconds,
        "retry_count": connector.retry_count,
        "retry_backoff_seconds": connector.retry_backoff_seconds,
        "resource_set": connector.resource_set_json or [],
        "last_health_status": connector.last_health_status,
        "last_health_checked_at": (
            connector.last_health_checked_at.isoformat() if connector.last_health_checked_at else None
        ),
        "last_success_at": connector.last_success_at.isoformat() if connector.last_success_at else None,
        "last_error": connector.last_error,
        "active_run": serialize_run(active_run) if active_run else None,
        "latest_run": serialize_run(latest) if latest else None,
        "last_scheduled_run_at": (
            (last_scheduled.completed_at or last_scheduled.started_at).isoformat()
            if last_scheduled and (last_scheduled.completed_at or last_scheduled.started_at)
            else None
        ),
        "next_scheduled_run_at": next_scheduled.isoformat() if next_scheduled else None,
        "scheduler_enabled": _bool_env("INTEGRATION_SCHEDULER_ENABLED", True),
    }


def serialize_run(run: Optional[IntegrationRun]) -> Optional[Dict[str, Any]]:
    if not run:
        return None
    return {
        "id": run.id,
        "connector_key": run.connector_key,
        "connector_name": run.connector_name,
        "run_type": run.run_type,
        "status": run.status,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "records_processed": run.records_processed,
        "records_created": run.records_created,
        "records_updated": run.records_updated,
        "records_failed": run.records_failed,
        "error_summary": run.error_summary,
        "triggered_by": run.triggered_by,
        "details": run.details_json or {},
    }


def _record_error(
    db: Session,
    connector: IntegrationConnector,
    run: Optional[IntegrationRun],
    *,
    message: str,
    code: Optional[str] = None,
    details: Optional[str] = None,
    severity: str = "error",
) -> IntegrationError:
    error = IntegrationError(
        connector_id=connector.id,
        run_id=run.id if run else None,
        connector_key=connector.connector_key,
        connector_name=connector.connector_name,
        severity=severity,
        code=code,
        message=message,
        details=details,
        occurred_at=utcnow(),
    )
    db.add(error)
    connector.last_error = message
    connector.last_health_status = "failed"
    connector.last_health_checked_at = utcnow()
    db.flush()
    return error


def _create_alert_log(
    db: Session,
    *,
    alert_type: str,
    alert_key: str,
    connector_key: Optional[str],
    severity: str,
    status: str,
    channel: str,
    target: Optional[str],
    message: str,
    payload: Optional[Dict[str, Any]],
    error_message: Optional[str] = None,
    is_suppressed: bool = False,
    notified_at: Optional[datetime] = None,
) -> IntegrationAlertLog:
    log = IntegrationAlertLog(
        alert_type=alert_type,
        alert_key=alert_key,
        connector_key=connector_key,
        severity=severity,
        status=status,
        channel=channel,
        target=target,
        message=message,
        error_message=error_message,
        payload_json=payload,
        is_suppressed=is_suppressed,
        triggered_at=utcnow(),
        notified_at=notified_at,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def _is_alert_rate_limited(db: Session, *, alert_key: str, cooldown_seconds: int) -> bool:
    threshold = utcnow() - timedelta(seconds=cooldown_seconds)
    recent = (
        db.query(IntegrationAlertLog)
        .filter(
            IntegrationAlertLog.alert_key == alert_key,
            IntegrationAlertLog.status == "sent",
            IntegrationAlertLog.notified_at.isnot(None),
            IntegrationAlertLog.notified_at >= threshold,
        )
        .order_by(desc(IntegrationAlertLog.notified_at))
        .first()
    )
    return recent is not None


def _send_alert_via_email(*, subject: str, message: str, payload: Dict[str, Any]) -> tuple[bool, Optional[str], List[str]]:
    recipients = _parse_csv_env("INTEGRATION_ALERT_EMAIL_TO")
    if not recipients:
        return False, "INTEGRATION_ALERT_EMAIL_TO is not configured", []

    try:
        config = EmailServiceConfig.from_env()
        client = MicrosoftGraphClient(config)
        html_body = f"<p>{message}</p><pre>{payload}</pre>"
        client.send_mail(
            subject=subject,
            html_body=html_body,
            text_body=f"{message}\n\n{payload}",
            recipients=recipients,
            cc=[],
            attachments=[],
        )
        return True, None, recipients
    except (EmailConfigurationError, Exception) as exc:  # noqa: BLE001
        return False, str(exc), recipients


def _send_alert_via_webhook(*, payload: Dict[str, Any]) -> tuple[bool, Optional[str], Optional[str]]:
    webhook_url = os.getenv("INTEGRATION_ALERT_WEBHOOK_URL", "").strip()
    if not webhook_url:
        return False, "INTEGRATION_ALERT_WEBHOOK_URL is not configured", None

    try:
        response = requests.post(
            webhook_url,
            json=payload,
            timeout=_alert_webhook_timeout_seconds(),
        )
        response.raise_for_status()
        return True, None, webhook_url
    except Exception as exc:  # noqa: BLE001
        return False, str(exc), webhook_url


def _dispatch_alert(
    db: Session,
    *,
    alert_type: str,
    alert_key: str,
    connector_key: Optional[str],
    severity: str,
    message: str,
    payload: Dict[str, Any],
) -> bool:
    if not _alerting_enabled():
        return False

    if _is_alert_rate_limited(db, alert_key=alert_key, cooldown_seconds=_alert_cooldown_seconds()):
        _create_alert_log(
            db,
            alert_type=alert_type,
            alert_key=alert_key,
            connector_key=connector_key,
            severity=severity,
            status="suppressed",
            channel="internal",
            target=None,
            message=message,
            payload=payload,
            is_suppressed=True,
        )
        return False

    sent_any = False
    email_ok, email_err, recipients = _send_alert_via_email(
        subject=f"[WathiqCare Integration Alert] {alert_type}",
        message=message,
        payload=payload,
    )
    if recipients:
        _create_alert_log(
            db,
            alert_type=alert_type,
            alert_key=alert_key,
            connector_key=connector_key,
            severity=severity,
            status="sent" if email_ok else "failed",
            channel="email",
            target=",".join(recipients),
            message=message,
            payload=payload,
            error_message=email_err,
            notified_at=utcnow() if email_ok else None,
        )
    if email_ok:
        sent_any = True

    webhook_ok, webhook_err, webhook_target = _send_alert_via_webhook(payload={
        "alert_type": alert_type,
        "severity": severity,
        "message": message,
        "payload": payload,
        "occurred_at": utcnow().isoformat(),
    })
    if webhook_target:
        _create_alert_log(
            db,
            alert_type=alert_type,
            alert_key=alert_key,
            connector_key=connector_key,
            severity=severity,
            status="sent" if webhook_ok else "failed",
            channel="webhook",
            target=webhook_target,
            message=message,
            payload=payload,
            error_message=webhook_err,
            notified_at=utcnow() if webhook_ok else None,
        )
    if webhook_ok:
        sent_any = True

    if not recipients and not webhook_target:
        _create_alert_log(
            db,
            alert_type=alert_type,
            alert_key=alert_key,
            connector_key=connector_key,
            severity=severity,
            status="skipped",
            channel="internal",
            target=None,
            message="No alert channels configured",
            payload=payload,
            error_message="Configure INTEGRATION_ALERT_EMAIL_TO and/or INTEGRATION_ALERT_WEBHOOK_URL",
        )

    return sent_any


def _write_audit(
    db: Session,
    *,
    tenant_id: Optional[str],
    user_id: Optional[str],
    action: str,
    connector: IntegrationConnector,
    run: Optional[IntegrationRun],
    details: Dict[str, Any],
) -> None:
    if not tenant_id or not user_id:
        return

    entity_id = run.id if run else connector.id
    db.add(
        AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            entity_type="integration_run" if run else "integration_connector",
            entity_id=entity_id,
            action=action,
            details=str(details),
        )
    )
    db.flush()


def _build_auth_headers(connector: IntegrationConnector) -> Dict[str, str]:
    headers = {"Accept": "application/fhir+json, application/json"}

    auth_type = (connector.auth_type or "none").lower()
    if auth_type == "bearer" and connector.auth_token:
        headers["Authorization"] = f"Bearer {connector.auth_token}"
    elif auth_type == "api_key" and connector.api_key:
        headers["x-api-key"] = connector.api_key

    return headers


def _run_fhir_sync(db: Session, connector: IntegrationConnector, run: IntegrationRun) -> None:
    if not connector.connection_url:
        raise RuntimeError("FHIR connector URL is not configured")

    resource_set: Iterable[str] = connector.resource_set_json or [
        "Patient",
        "Encounter",
        "Procedure",
        "Consent",
    ]

    count_per_resource = _int_env("FHIR_SYNC_COUNT_PER_RESOURCE", 25)
    timeout = max(1, connector.timeout_seconds)
    max_attempts = max(1, connector.retry_count + 1)
    backoff_seconds = max(0, connector.retry_backoff_seconds)
    headers = _build_auth_headers(connector)

    total_processed = 0
    total_failed = 0
    resource_failures: List[str] = []
    retry_stats: Dict[str, int] = {}
    resources_pulled: Dict[str, int] = {}

    for resource in resource_set:
        endpoint = f"{connector.connection_url.rstrip('/')}/{resource}"
        last_error: Optional[str] = None
        for attempt in range(1, max_attempts + 1):
            try:
                response = requests.get(
                    endpoint,
                    params={"_count": count_per_resource},
                    headers=headers,
                    timeout=timeout,
                )
                response.raise_for_status()
                payload = response.json() if response.content else {}
                entries = payload.get("entry") or []
                processed = len(entries)

                total_processed += processed
                resources_pulled[resource] = processed
                retry_stats[resource] = attempt - 1

                sample_items = entries[: min(10, len(entries))]
                for item in sample_items:
                    resource_payload = item.get("resource", {}) if isinstance(item, dict) else {}
                    db.add(
                        IntegrationRunItem(
                            run_id=run.id,
                            connector_key=connector.connector_key,
                            resource_type=resource,
                            external_id=(resource_payload.get("id") if isinstance(resource_payload, dict) else None),
                            status="success",
                            message="Fetched from source FHIR server",
                            payload_json=(resource_payload if isinstance(resource_payload, dict) else None),
                        )
                    )
                last_error = None
                break
            except Exception as exc:  # noqa: BLE001
                last_error = str(exc)
                if attempt < max_attempts and backoff_seconds > 0:
                    time.sleep(backoff_seconds)

        if last_error is not None:
            total_failed += 1
            resource_failures.append(resource)
            retry_stats[resource] = max_attempts - 1
            error_message = f"FHIR fetch failed for {resource} after {max_attempts} attempts: {last_error}"
            db.add(
                IntegrationRunItem(
                    run_id=run.id,
                    connector_key=connector.connector_key,
                    resource_type=resource,
                    external_id=None,
                    status="failed",
                    message=error_message,
                    payload_json=None,
                )
            )
            _record_error(
                db,
                connector,
                run,
                message=error_message,
                code="FHIR_FETCH_ERROR",
                details=last_error,
            )

    run.records_processed = total_processed
    run.records_created = total_processed
    run.records_updated = 0
    run.records_failed = total_failed
    details = run.details_json or {}
    details.update({
        "resource_set": list(resource_set),
        "resources_pulled": resources_pulled,
        "resource_failures": resource_failures,
        "resource_retry_counts": retry_stats,
    })
    run.details_json = details

    if total_failed and total_processed:
        run.status = "partial_success"
        run.error_summary = f"Failed resources: {', '.join(resource_failures)}"
    elif total_failed:
        run.status = "failed"
        run.error_summary = f"All requested resources failed: {', '.join(resource_failures)}"
    else:
        run.status = "success"
        run.error_summary = None


def _run_mock_connector(db: Session, connector: IntegrationConnector, run: IntegrationRun) -> None:
    message = (
        "Connector is not live yet. Epic/Cerner adapters are pending implementation."
    )
    run.status = "failed"
    run.records_processed = 0
    run.records_created = 0
    run.records_updated = 0
    run.records_failed = 0
    run.error_summary = message
    details = run.details_json or {}
    details["live_mode"] = False
    run.details_json = details
    _record_error(
        db,
        connector,
        run,
        message=message,
        code="CONNECTOR_NOT_IMPLEMENTED",
        details="Use fhir_integration for live sync in current release",
        severity="warning",
    )


def _run_sync_job(run_id: str) -> None:
    db = SessionLocal()
    try:
        run = db.query(IntegrationRun).filter(IntegrationRun.id == run_id).first()
        if not run:
            logger.error("integration_run_missing run_id=%s", run_id)
            return

        connector = (
            db.query(IntegrationConnector)
            .filter(IntegrationConnector.id == run.connector_id)
            .first()
        )
        if not connector:
            logger.error("integration_connector_missing connector_id=%s", run.connector_id)
            run.status = "failed"
            run.error_summary = "Connector definition not found"
            run.completed_at = utcnow()
            db.commit()
            return

        run.status = "running"
        run.started_at = utcnow()
        details = run.details_json or {}
        details["phase"] = "running"
        run.details_json = details
        db.commit()

        if not connector.enabled:
            run.status = "disabled"
            run.error_summary = "Connector is disabled"
            run.records_processed = 0
            run.records_created = 0
            run.records_updated = 0
            run.records_failed = 0
        elif connector.connector_key == "fhir_integration":
            _run_fhir_sync(db, connector, run)
        else:
            _run_mock_connector(db, connector, run)

        run.completed_at = utcnow()

        if run.status in {"success", "partial_success"}:
            connector.last_success_at = run.completed_at
            connector.last_error = None
            connector.last_health_status = run.status
            connector.last_health_checked_at = run.completed_at

        run_details = run.details_json or {}
        run_details["phase"] = "completed"
        run.details_json = run_details

        _write_audit(
            db,
            tenant_id=run_details.get("triggered_by_tenant_id"),
            user_id=run_details.get("triggered_by_user_id"),
            action="integration_sync_completed",
            connector=connector,
            run=run,
            details={
                "connector_key": run.connector_key,
                "status": run.status,
                "records_processed": run.records_processed,
                "records_failed": run.records_failed,
            },
        )

        db.commit()

        logger.info(
            "integration_run_completed run_id=%s connector=%s run_type=%s status=%s processed=%s failed=%s",
            run.id,
            run.connector_key,
            run.run_type,
            run.status,
            run.records_processed,
            run.records_failed,
        )

        if run.status in {"failed", "partial_success"}:
            evaluate_connector_failure_alert(connector.id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("integration_run_crashed run_id=%s error=%s", run_id, exc)
        db.rollback()
        run = db.query(IntegrationRun).filter(IntegrationRun.id == run_id).first()
        if run:
            connector = (
                db.query(IntegrationConnector)
                .filter(IntegrationConnector.id == run.connector_id)
                .first()
            )
            run.status = "failed"
            run.error_summary = str(exc)
            run.completed_at = utcnow()
            details = run.details_json or {}
            details["phase"] = "failed"
            run.details_json = details
            if connector:
                _record_error(
                    db,
                    connector,
                    run,
                    message=f"Sync execution crashed: {exc}",
                    code="SYNC_CRASH",
                    details=str(exc),
                    severity="critical",
                )
                _write_audit(
                    db,
                    tenant_id=details.get("triggered_by_tenant_id"),
                    user_id=details.get("triggered_by_user_id"),
                    action="integration_sync_failed",
                    connector=connector,
                    run=run,
                    details={
                        "connector_key": run.connector_key,
                        "error": str(exc),
                    },
                )
            db.commit()

            if connector:
                evaluate_connector_failure_alert(connector.id)
    finally:
        db.close()


def enqueue_manual_sync(
    db: Session,
    connector: IntegrationConnector,
    *,
    triggered_by: Optional[str],
    triggered_by_user_id: Optional[str] = None,
    triggered_by_tenant_id: Optional[str] = None,
) -> IntegrationRun:
    active = (
        db.query(IntegrationRun)
        .filter(
            IntegrationRun.connector_id == connector.id,
            IntegrationRun.status.in_(ACTIVE_STATUSES),
        )
        .first()
    )
    if active:
        return active

    run = IntegrationRun(
        connector_id=connector.id,
        connector_key=connector.connector_key,
        connector_name=connector.connector_name,
        run_type="manual",
        status="queued",
        started_at=utcnow(),
        triggered_by=triggered_by,
        details_json={
            "phase": "queued",
            "triggered_by_user_id": triggered_by_user_id,
            "triggered_by_tenant_id": triggered_by_tenant_id,
        },
    )
    db.add(run)
    _write_audit(
        db,
        tenant_id=triggered_by_tenant_id,
        user_id=triggered_by_user_id,
        action="integration_sync_queued",
        connector=connector,
        run=run,
        details={"connector_key": connector.connector_key, "triggered_by": triggered_by},
    )
    db.commit()
    db.refresh(run)

    worker = threading.Thread(target=_run_sync_job, args=(run.id,), daemon=True)
    worker.start()

    logger.info(
        "integration_run_queued run_id=%s connector=%s triggered_by=%s",
        run.id,
        connector.connector_key,
        triggered_by,
    )
    return run


def _scheduled_slot_key(at: datetime) -> str:
    return at.replace(second=0, microsecond=0).isoformat()


def _recent_scheduled_run_for_slot(
    db: Session,
    connector: IntegrationConnector,
    *,
    slot_key: str,
) -> Optional[IntegrationRun]:
    recent = (
        db.query(IntegrationRun)
        .filter(
            IntegrationRun.connector_id == connector.id,
            IntegrationRun.run_type == "scheduled",
        )
        .order_by(desc(IntegrationRun.started_at))
        .limit(20)
        .all()
    )
    for run in recent:
        details = run.details_json or {}
        if details.get("scheduled_slot") == slot_key:
            return run
    return None


def enqueue_scheduled_sync(
    db: Session,
    connector: IntegrationConnector,
    *,
    scheduled_for: Optional[datetime] = None,
) -> Optional[IntegrationRun]:
    if not _connector_eligible_for_scheduled_run(connector):
        return None

    active = (
        db.query(IntegrationRun)
        .filter(
            IntegrationRun.connector_id == connector.id,
            IntegrationRun.status.in_(ACTIVE_STATUSES),
        )
        .first()
    )
    if active:
        return None

    slot_at = scheduled_for or utcnow()
    slot_key = _scheduled_slot_key(slot_at)
    existing_slot_run = _recent_scheduled_run_for_slot(db, connector, slot_key=slot_key)
    if existing_slot_run:
        return None

    run = IntegrationRun(
        connector_id=connector.id,
        connector_key=connector.connector_key,
        connector_name=connector.connector_name,
        run_type="scheduled",
        status="queued",
        started_at=utcnow(),
        triggered_by="scheduler",
        details_json={
            "phase": "queued",
            "trigger_source": "scheduler",
            "scheduled_for": slot_at.isoformat(),
            "scheduled_slot": slot_key,
        },
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    worker = threading.Thread(target=_run_sync_job, args=(run.id,), daemon=True)
    worker.start()

    logger.info(
        "integration_run_scheduled run_id=%s connector=%s scheduled_for=%s",
        run.id,
        connector.connector_key,
        slot_at.isoformat(),
    )
    return run


def recover_stale_active_runs(db: Session, *, stale_after_seconds: int = 600) -> int:
    global _scheduler_last_recovery_at, _scheduler_last_recovery_count
    threshold = utcnow() - timedelta(seconds=max(60, stale_after_seconds))
    stale = (
        db.query(IntegrationRun)
        .filter(
            IntegrationRun.status.in_(ACTIVE_STATUSES),
            IntegrationRun.started_at < threshold,
        )
        .all()
    )
    if not stale:
        _scheduler_last_recovery_at = utcnow()
        _scheduler_last_recovery_count = 0
        return 0

    count = 0
    for run in stale:
        run.status = "failed"
        run.error_summary = "Recovered after worker restart (stale active run)"
        run.completed_at = utcnow()
        details = run.details_json or {}
        details["phase"] = "failed"
        details["recovery"] = "stale_active_run"
        run.details_json = details
        count += 1

    db.commit()
    _scheduler_last_recovery_at = utcnow()
    _scheduler_last_recovery_count = count
    logger.warning("integration_stale_runs_recovered count=%s", count)
    return count


def run_scheduler_tick(*, now: Optional[datetime] = None) -> Dict[str, int]:
    global _scheduler_last_tick_at, _scheduler_last_tick_status
    db = SessionLocal()
    current = now or utcnow()
    results = {"scheduled": 0, "skipped": 0, "disabled": 0, "automated_escalations": 0}
    try:
        ensure_connectors_seeded(db)
        recover_stale_active_runs(
            db,
            stale_after_seconds=max(60, _int_env("INTEGRATION_SCHEDULER_STALE_RUN_SECONDS", 600)),
        )
        connectors = (
            db.query(IntegrationConnector)
            .order_by(IntegrationConnector.connector_name.asc())
            .all()
        )
        for connector in connectors:
            if not connector.enabled:
                results["disabled"] += 1
                continue
            if not _connector_eligible_for_scheduled_run(connector):
                results["skipped"] += 1
                continue

            next_due = _next_due_at(db, connector, now=current)
            if current < next_due:
                continue

            run = enqueue_scheduled_sync(db, connector, scheduled_for=next_due)
            if run is None:
                results["skipped"] += 1
                continue
            results["scheduled"] += 1

        automation_results = run_due_escalation_sweep(now=current)
        results["automated_escalations"] = automation_results.get("escalated", 0)

        _scheduler_last_tick_at = utcnow()
        _scheduler_last_tick_status = {
            "status": "ok",
            **results,
        }
        evaluate_scheduler_alerts()
        evaluate_all_sla()
        return results
    except Exception as exc:  # noqa: BLE001
        _scheduler_last_tick_at = utcnow()
        _scheduler_last_tick_status = {
            "status": "error",
            "error": str(exc),
        }
        evaluate_scheduler_alerts(extra_payload={"error": str(exc)})
        raise
    finally:
        db.close()


def scheduler_health_snapshot(db: Session) -> Dict[str, Any]:
    scheduler_enabled = _bool_env("INTEGRATION_SCHEDULER_ENABLED", True)
    poll_seconds = max(5, _int_env("INTEGRATION_SCHEDULER_POLL_SECONDS", 15))
    stale_run_threshold_seconds = max(60, _int_env("INTEGRATION_SCHEDULER_STALE_RUN_SECONDS", 600))
    scheduler_running = bool(_scheduler_started and _scheduler_thread and _scheduler_thread.is_alive())

    enabled_connectors_count = (
        db.query(IntegrationConnector)
        .filter(IntegrationConnector.enabled.is_(True))
        .count()
    )
    active_runs_count = (
        db.query(IntegrationRun)
        .filter(IntegrationRun.status == "running")
        .count()
    )
    queued_runs_count = (
        db.query(IntegrationRun)
        .filter(IntegrationRun.status == "queued")
        .count()
    )

    if not scheduler_enabled:
        overall_status = "disabled"
    elif not scheduler_running:
        overall_status = "degraded"
    elif _scheduler_last_tick_status and _scheduler_last_tick_status.get("status") == "error":
        overall_status = "degraded"
    else:
        overall_status = "healthy"

    return {
        "scheduler_enabled": scheduler_enabled,
        "scheduler_running": scheduler_running,
        "poll_seconds": poll_seconds,
        "stale_run_threshold_seconds": stale_run_threshold_seconds,
        "last_tick_at": _scheduler_last_tick_at.isoformat() if _scheduler_last_tick_at else None,
        "last_tick_status": _scheduler_last_tick_status,
        "active_runs_count": active_runs_count,
        "queued_runs_count": queued_runs_count,
        "enabled_connectors_count": enabled_connectors_count,
        "last_recovery_at": _scheduler_last_recovery_at.isoformat() if _scheduler_last_recovery_at else None,
        "last_recovery_count": _scheduler_last_recovery_count,
        "overall_status": overall_status,
    }


def evaluate_scheduler_alerts(*, extra_payload: Optional[Dict[str, Any]] = None) -> bool:
    db = SessionLocal()
    try:
        snapshot = scheduler_health_snapshot(db)
        if snapshot["overall_status"] == "healthy":
            return False
        payload = {**snapshot, **(extra_payload or {})}
        message = (
            f"Integration scheduler status is {snapshot['overall_status']}. "
            f"running={snapshot['scheduler_running']} enabled={snapshot['scheduler_enabled']}"
        )
        return _dispatch_alert(
            db,
            alert_type="scheduler_degraded",
            alert_key="scheduler_degraded",
            connector_key="scheduler",
            severity="critical" if snapshot["overall_status"] == "degraded" else "warning",
            message=message,
            payload=payload,
        )
    finally:
        db.close()


def evaluate_connector_failure_alert(connector_id: str) -> bool:
    db = SessionLocal()
    try:
        connector = db.query(IntegrationConnector).filter(IntegrationConnector.id == connector_id).first()
        if not connector:
            return False

        threshold = _repeated_failure_threshold()
        recent_runs = (
            db.query(IntegrationRun)
            .filter(IntegrationRun.connector_id == connector.id)
            .order_by(desc(IntegrationRun.started_at))
            .limit(threshold)
            .all()
        )
        if len(recent_runs) < threshold:
            return False

        if not all(run.status in {"failed", "partial_success"} for run in recent_runs):
            return False

        message = (
            f"Connector {connector.connector_name} has {threshold} consecutive failed/partial runs."
        )
        payload = {
            "connector_key": connector.connector_key,
            "connector_name": connector.connector_name,
            "threshold": threshold,
            "recent_runs": [serialize_run(run) for run in recent_runs],
        }
        return _dispatch_alert(
            db,
            alert_type="connector_repeated_failures",
            alert_key=f"connector_repeated_failures:{connector.connector_key}",
            connector_key=connector.connector_key,
            severity="error",
            message=message,
            payload=payload,
        )
    finally:
        db.close()


# ---------------------------------------------------------------------------
# SLA configuration helpers
# ---------------------------------------------------------------------------

def _float_env(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _get_sla_thresholds(connector_key: str) -> Dict[str, Any]:
    """Return effective SLA thresholds for a connector, resolved from env vars.

    Global defaults come from INTEGRATION_SLA_* env vars.
    Per-connector overrides use INTEGRATION_SLA_{CONNECTOR_KEY_UPPER}_* env vars.
    """
    ck = connector_key.upper()
    global_prefix = "INTEGRATION_SLA"
    per_prefix = f"INTEGRATION_SLA_{ck}"

    max_sync_delay = _int_env(
        f"{per_prefix}_MAX_SYNC_DELAY_SECONDS",
        _int_env(f"{global_prefix}_MAX_SYNC_DELAY_SECONDS", 3600),
    )
    max_failure_rate = _float_env(
        f"{per_prefix}_MAX_FAILURE_RATE",
        _float_env(f"{global_prefix}_MAX_FAILURE_RATE", 0.5),
    )
    max_queue_time = _int_env(
        f"{per_prefix}_MAX_QUEUE_TIME_SECONDS",
        _int_env(f"{global_prefix}_MAX_QUEUE_TIME_SECONDS", 300),
    )
    failure_rate_window = _int_env(
        f"{per_prefix}_FAILURE_RATE_WINDOW",
        _int_env(f"{global_prefix}_FAILURE_RATE_WINDOW", 10),
    )

    return {
        "max_sync_delay_seconds": max(1, max_sync_delay),
        "max_failure_rate": max(0.0, min(1.0, max_failure_rate)),
        "max_queue_time_seconds": max(1, max_queue_time),
        "failure_rate_window": max(1, failure_rate_window),
    }


# ---------------------------------------------------------------------------
# SLA breach persistence helpers
# ---------------------------------------------------------------------------

def _open_breach_exists(db: Session, connector_key: str, breach_type: str) -> bool:
    return (
        db.query(IntegrationSLABreach)
        .filter(
            IntegrationSLABreach.connector_key == connector_key,
            IntegrationSLABreach.breach_type == breach_type,
            IntegrationSLABreach.status == "open",
        )
        .first()
    ) is not None


def _auto_resolve_breach(db: Session, connector_key: str, breach_type: str) -> bool:
    breach = (
        db.query(IntegrationSLABreach)
        .filter(
            IntegrationSLABreach.connector_key == connector_key,
            IntegrationSLABreach.breach_type == breach_type,
            IntegrationSLABreach.status == "open",
        )
        .first()
    )
    if breach:
        breach.status = "resolved"
        breach.resolved_at = utcnow()
        db.commit()
        return True
    return False


def _compute_connector_failure_rate(
    db: Session,
    connector_id: str,
    window: int,
) -> Optional[float]:
    recent = (
        db.query(IntegrationRun)
        .filter(
            IntegrationRun.connector_id == connector_id,
            IntegrationRun.status.in_({"success", "failed", "partial_success"}),
        )
        .order_by(desc(IntegrationRun.started_at))
        .limit(window)
        .all()
    )
    if not recent:
        return None
    failed = sum(1 for r in recent if r.status in {"failed", "partial_success"})
    return failed / len(recent)


# ---------------------------------------------------------------------------
# SLA evaluation
# ---------------------------------------------------------------------------

def evaluate_sla_for_connector(
    db: Session,
    connector: IntegrationConnector,
) -> List[Dict[str, Any]]:
    """Evaluate all SLA checks for one connector.  Returns list of breach dicts."""
    if not connector.enabled:
        return []

    thresholds = _get_sla_thresholds(connector.connector_key)
    now = utcnow()
    breaches_detected: List[Dict[str, Any]] = []

    # ------------------------------------------------------------------
    # 1. delayed_sync — last successful run vs SLA max_sync_delay_seconds
    # ------------------------------------------------------------------
    if connector.last_success_at is not None:
        delay_seconds = (now - connector.last_success_at).total_seconds()
    else:
        # Never succeeded: use time since connector was created as the delay
        delay_seconds = (now - connector.created_at).total_seconds()

    if delay_seconds > thresholds["max_sync_delay_seconds"]:
        if not _open_breach_exists(db, connector.connector_key, "delayed_sync"):
            severity = (
                "error"
                if delay_seconds > thresholds["max_sync_delay_seconds"] * 2
                else "warning"
            )
            message = (
                f"Connector {connector.connector_name} has not synced successfully for "
                f"{int(delay_seconds)}s (SLA threshold: {thresholds['max_sync_delay_seconds']}s)."
            )
            breach = IntegrationSLABreach(
                connector_key=connector.connector_key,
                breach_type="delayed_sync",
                severity=severity,
                status="open",
                message=message,
                metric_value=round(delay_seconds, 1),
                threshold_value=float(thresholds["max_sync_delay_seconds"]),
                details_json={
                    "last_success_at": (
                        connector.last_success_at.isoformat()
                        if connector.last_success_at
                        else None
                    ),
                    "delay_seconds": round(delay_seconds, 1),
                    "threshold_seconds": thresholds["max_sync_delay_seconds"],
                },
            )
            db.add(breach)
            db.flush()
            db.refresh(breach)

            dispatched = _dispatch_alert(
                db,
                alert_type="delayed_sync",
                alert_key=f"delayed_sync:{connector.connector_key}",
                connector_key=connector.connector_key,
                severity=severity,
                message=message,
                payload={
                    "connector_key": connector.connector_key,
                    "delay_seconds": round(delay_seconds, 1),
                    "threshold_seconds": thresholds["max_sync_delay_seconds"],
                },
            )
            breach.alert_dispatched = dispatched
            db.commit()

            breaches_detected.append({
                "breach_id": breach.id,
                "breach_type": "delayed_sync",
                "connector_key": connector.connector_key,
                "severity": severity,
                "message": message,
            })
    else:
        _auto_resolve_breach(db, connector.connector_key, "delayed_sync")

    # ------------------------------------------------------------------
    # 2. high_failure_rate — rolling failure rate over last N runs
    # ------------------------------------------------------------------
    failure_rate = _compute_connector_failure_rate(
        db, connector.id, thresholds["failure_rate_window"]
    )

    if failure_rate is not None and failure_rate > thresholds["max_failure_rate"]:
        if not _open_breach_exists(db, connector.connector_key, "high_failure_rate"):
            message = (
                f"Connector {connector.connector_name} failure rate "
                f"{failure_rate:.1%} exceeds SLA threshold "
                f"{thresholds['max_failure_rate']:.1%} "
                f"(last {thresholds['failure_rate_window']} runs)."
            )
            breach = IntegrationSLABreach(
                connector_key=connector.connector_key,
                breach_type="high_failure_rate",
                severity="error",
                status="open",
                message=message,
                metric_value=round(failure_rate, 4),
                threshold_value=thresholds["max_failure_rate"],
                details_json={
                    "failure_rate": round(failure_rate, 4),
                    "threshold_rate": thresholds["max_failure_rate"],
                    "window": thresholds["failure_rate_window"],
                },
            )
            db.add(breach)
            db.flush()
            db.refresh(breach)

            dispatched = _dispatch_alert(
                db,
                alert_type="high_failure_rate",
                alert_key=f"high_failure_rate:{connector.connector_key}",
                connector_key=connector.connector_key,
                severity="error",
                message=message,
                payload={
                    "connector_key": connector.connector_key,
                    "failure_rate": round(failure_rate, 4),
                    "threshold_rate": thresholds["max_failure_rate"],
                    "window": thresholds["failure_rate_window"],
                },
            )
            breach.alert_dispatched = dispatched
            db.commit()

            breaches_detected.append({
                "breach_id": breach.id,
                "breach_type": "high_failure_rate",
                "connector_key": connector.connector_key,
                "severity": "error",
                "message": message,
            })
    elif failure_rate is not None:
        _auto_resolve_breach(db, connector.connector_key, "high_failure_rate")

    # ------------------------------------------------------------------
    # 3. max_queue_time — runs stuck in queued state beyond threshold
    # ------------------------------------------------------------------
    queue_cutoff = now - timedelta(seconds=thresholds["max_queue_time_seconds"])
    long_queued = (
        db.query(IntegrationRun)
        .filter(
            IntegrationRun.connector_id == connector.id,
            IntegrationRun.status == "queued",
            IntegrationRun.started_at < queue_cutoff,
        )
        .order_by(IntegrationRun.started_at.asc())
        .first()
    )

    if long_queued:
        queue_time = (now - long_queued.started_at).total_seconds()
        if not _open_breach_exists(db, connector.connector_key, "max_queue_time"):
            message = (
                f"Connector {connector.connector_name} has a run queued for "
                f"{int(queue_time)}s (SLA threshold: {thresholds['max_queue_time_seconds']}s)."
            )
            breach = IntegrationSLABreach(
                connector_key=connector.connector_key,
                breach_type="max_queue_time",
                severity="warning",
                status="open",
                message=message,
                metric_value=round(queue_time, 1),
                threshold_value=float(thresholds["max_queue_time_seconds"]),
                details_json={
                    "run_id": long_queued.id,
                    "queued_for_seconds": round(queue_time, 1),
                    "threshold_seconds": thresholds["max_queue_time_seconds"],
                },
            )
            db.add(breach)
            db.flush()
            db.refresh(breach)

            dispatched = _dispatch_alert(
                db,
                alert_type="sla_breach",
                alert_key=f"sla_breach_queue:{connector.connector_key}",
                connector_key=connector.connector_key,
                severity="warning",
                message=message,
                payload={
                    "connector_key": connector.connector_key,
                    "queue_time_seconds": round(queue_time, 1),
                    "threshold_seconds": thresholds["max_queue_time_seconds"],
                },
            )
            breach.alert_dispatched = dispatched
            db.commit()

            breaches_detected.append({
                "breach_id": breach.id,
                "breach_type": "max_queue_time",
                "connector_key": connector.connector_key,
                "severity": "warning",
                "message": message,
            })
    else:
        _auto_resolve_breach(db, connector.connector_key, "max_queue_time")

    return breaches_detected


def evaluate_all_sla() -> List[Dict[str, Any]]:
    """Evaluate SLA for all enabled connectors and return all new breaches."""
    db = SessionLocal()
    all_breaches: List[Dict[str, Any]] = []
    try:
        connectors = (
            db.query(IntegrationConnector)
            .filter(IntegrationConnector.enabled.is_(True))
            .all()
        )
        for connector in connectors:
            c_breaches = evaluate_sla_for_connector(db, connector)
            all_breaches.extend(c_breaches)
        return all_breaches
    finally:
        db.close()


def get_sla_status_snapshot(db: Session) -> Dict[str, Any]:
    """Return the full SLA status snapshot used by GET /api/integrations/sla/status."""
    now = utcnow()
    connectors = (
        db.query(IntegrationConnector)
        .order_by(IntegrationConnector.connector_name.asc())
        .all()
    )

    connector_statuses = []
    total_breached = 0
    total_ok = 0
    total_disabled = 0
    total_open_breaches = 0

    for connector in connectors:
        thresholds = _get_sla_thresholds(connector.connector_key)

        if not connector.enabled:
            total_disabled += 1
            connector_statuses.append({
                "connector_key": connector.connector_key,
                "connector_name": connector.connector_name,
                "enabled": False,
                "sla_rules": thresholds,
                "sla_status": "disabled",
                "last_success_at": (
                    connector.last_success_at.isoformat()
                    if connector.last_success_at
                    else None
                ),
                "failure_rate": None,
                "open_breach_count": 0,
                "breaches": [],
            })
            continue

        failure_rate = _compute_connector_failure_rate(
            db, connector.id, thresholds["failure_rate_window"]
        )

        open_breaches = (
            db.query(IntegrationSLABreach)
            .filter(
                IntegrationSLABreach.connector_key == connector.connector_key,
                IntegrationSLABreach.status == "open",
            )
            .order_by(desc(IntegrationSLABreach.detected_at))
            .all()
        )

        sla_status = "breached" if open_breaches else "ok"
        total_open_breaches += len(open_breaches)
        if sla_status == "breached":
            total_breached += 1
        else:
            total_ok += 1

        connector_statuses.append({
            "connector_key": connector.connector_key,
            "connector_name": connector.connector_name,
            "enabled": True,
            "sla_rules": thresholds,
            "sla_status": sla_status,
            "last_success_at": (
                connector.last_success_at.isoformat()
                if connector.last_success_at
                else None
            ),
            "failure_rate": round(failure_rate, 4) if failure_rate is not None else None,
            "open_breach_count": len(open_breaches),
            "breaches": [
                {
                    "id": b.id,
                    "breach_type": b.breach_type,
                    "severity": b.severity,
                    "status": b.status,
                    "message": b.message,
                    "metric_value": b.metric_value,
                    "threshold_value": b.threshold_value,
                    "alert_dispatched": b.alert_dispatched,
                    "detected_at": b.detected_at.isoformat() if b.detected_at else None,
                    "resolved_at": b.resolved_at.isoformat() if b.resolved_at else None,
                }
                for b in open_breaches
            ],
        })

    return {
        "evaluated_at": now.isoformat(),
        "summary": {
            "connectors_ok": total_ok,
            "connectors_breached": total_breached,
            "connectors_disabled": total_disabled,
            "total_open_breaches": total_open_breaches,
        },
        "connectors": connector_statuses,
    }


def _scheduler_loop(stop_event: threading.Event) -> None:
    poll_seconds = max(5, _int_env("INTEGRATION_SCHEDULER_POLL_SECONDS", 15))
    logger.info("integration_scheduler_started poll_seconds=%s", poll_seconds)
    while not stop_event.is_set():
        try:
            stats = run_scheduler_tick()
            logger.debug("integration_scheduler_tick stats=%s", stats)
        except Exception as exc:  # noqa: BLE001
            logger.exception("integration_scheduler_tick_failed error=%s", exc)
        stop_event.wait(poll_seconds)
    logger.info("integration_scheduler_stopped")


def start_integration_scheduler() -> bool:
    global _scheduler_started, _scheduler_stop_event, _scheduler_thread

    if not _bool_env("INTEGRATION_SCHEDULER_ENABLED", True):
        logger.info("integration_scheduler_disabled_by_env")
        return False

    with _scheduler_lock:
        if _scheduler_started:
            return False
        _scheduler_stop_event = threading.Event()
        _scheduler_thread = threading.Thread(
            target=_scheduler_loop,
            args=(_scheduler_stop_event,),
            daemon=True,
        )
        _scheduler_thread.start()
        _scheduler_started = True
        return True


def stop_integration_scheduler() -> bool:
    global _scheduler_started, _scheduler_stop_event, _scheduler_thread

    with _scheduler_lock:
        if not _scheduler_started or _scheduler_stop_event is None:
            return False

        _scheduler_stop_event.set()
        if _scheduler_thread is not None:
            _scheduler_thread.join(timeout=2)

        _scheduler_started = False
        _scheduler_stop_event = None
        _scheduler_thread = None
        return True


def get_connector_or_404(db: Session, connector_key: str) -> IntegrationConnector:
    normalized = normalize_connector_key(connector_key)
    connector = (
        db.query(IntegrationConnector)
        .filter(IntegrationConnector.connector_key == normalized)
        .first()
    )
    if connector:
        return connector
    raise ValueError(f"Unknown connector '{connector_key}'")


def list_runs(
    db: Session,
    *,
    connector_key: Optional[str] = None,
    limit: int = 50,
) -> List[IntegrationRun]:
    query = db.query(IntegrationRun)
    if connector_key:
        normalized = normalize_connector_key(connector_key)
        query = query.filter(IntegrationRun.connector_key == normalized)
    return query.order_by(desc(IntegrationRun.started_at)).limit(max(1, min(limit, 200))).all()


def connector_health_snapshot(
    db: Session,
    connector: IntegrationConnector,
) -> Dict[str, Any]:
    checked_at = utcnow()

    if not connector.enabled:
        connector.last_health_status = "disabled"
        connector.last_health_checked_at = checked_at
        db.commit()
        return {
            "connector_key": connector.connector_key,
            "connector_name": connector.connector_name,
            "status": "disabled",
            "checked_at": checked_at.isoformat(),
            "details": "Connector is disabled",
        }

    if connector.connector_key != "fhir_integration":
        connector.last_health_status = "mock"
        connector.last_health_checked_at = checked_at
        db.commit()
        return {
            "connector_key": connector.connector_key,
            "connector_name": connector.connector_name,
            "status": "mock",
            "checked_at": checked_at.isoformat(),
            "details": "Connector adapter is not live in current release",
        }

    if not connector.connection_url:
        connector.last_health_status = "failed"
        connector.last_health_checked_at = checked_at
        connector.last_error = "Missing FHIR source URL"
        db.commit()
        return {
            "connector_key": connector.connector_key,
            "connector_name": connector.connector_name,
            "status": "failed",
            "checked_at": checked_at.isoformat(),
            "details": "Missing FHIR source URL",
        }

    metadata_url = f"{connector.connection_url.rstrip('/')}/metadata"

    try:
        response = requests.get(
            metadata_url,
            headers=_build_auth_headers(connector),
            timeout=max(1, connector.timeout_seconds),
        )
        response.raise_for_status()

        connector.last_health_status = "healthy"
        connector.last_health_checked_at = checked_at
        connector.last_error = None
        db.commit()

        return {
            "connector_key": connector.connector_key,
            "connector_name": connector.connector_name,
            "status": "healthy",
            "checked_at": checked_at.isoformat(),
            "details": "FHIR metadata endpoint reachable",
            "http_status": response.status_code,
        }
    except Exception as exc:  # noqa: BLE001
        connector.last_health_status = "failed"
        connector.last_health_checked_at = checked_at
        connector.last_error = str(exc)
        _record_error(
            db,
            connector,
            None,
            message=f"Health check failed: {exc}",
            code="FHIR_HEALTH_CHECK_FAILED",
            details=str(exc),
        )
        db.commit()
        return {
            "connector_key": connector.connector_key,
            "connector_name": connector.connector_name,
            "status": "failed",
            "checked_at": checked_at.isoformat(),
            "details": str(exc),
        }
