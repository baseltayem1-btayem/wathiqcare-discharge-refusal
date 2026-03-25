"""Dashboard channel — persists alerts in the dashboard_alerts table."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.core.logging_config import get_logger
from backend.models.dashboard_alert import DashboardAlert
from backend.models.notification_delivery_attempt import NotificationDeliveryAttempt

logger = get_logger(__name__)


def send_dashboard_alert(
    db: Session,
    *,
    tenant_id: str,
    case_id: Optional[str],
    alert_key: str,
    alert_type: str,
    severity: str,
    title: str,
    message: str,
    case_deep_link: Optional[str] = None,
    metadata_json: Optional[Dict[str, Any]] = None,
) -> DashboardAlert:
    # Legacy duplicate alert prevention logic removed

    alert = DashboardAlert(
        tenant_id=tenant_id,
        case_id=case_id,
        alert_key=alert_key,
        alert_type=alert_type,
        severity=severity,
        title=title,
        message=message,
        case_deep_link=case_deep_link,
        metadata_json=metadata_json,
        created_at=datetime.utcnow(),
    )
    db.add(alert)
    db.flush()

    db.add(
        NotificationDeliveryAttempt(
            tenant_id=tenant_id,
            case_id=case_id,
            alert_id=alert.id,
            channel="dashboard",
            provider="internal",
            recipient=f"dashboard:{tenant_id}",
            notification_type=alert_type,
            status="sent",
            status_code=201,
            attempted_at=datetime.utcnow(),
            metadata_json={"alert_key": alert_key, "severity": severity},
        )
    )
    db.flush()

    logger.info(
        "DASHBOARD_ALERT_CREATED",
        extra={"alert_id": alert.id, "alert_key": alert_key, "severity": severity, "tenant_id": tenant_id},
    )
    return alert
