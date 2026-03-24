"""Alerts router — dashboard alerts + acknowledgments + tenant notification settings."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Generator, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from backend.api.deps import get_current_user, require_roles
from backend.core.database import SessionLocal
from backend.models.alert_acknowledgment import AlertAcknowledgment
from backend.models.dashboard_alert import DashboardAlert
from backend.models.notification_delivery_attempt import NotificationDeliveryAttempt
from backend.models.tenant_notification_setting import TenantNotificationSetting

router = APIRouter(prefix="/api/legal", tags=["legal-alerts"])


# ─────────────────────────────── Schemas ─────────────────────────────────────

class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    case_id: Optional[str]
    alert_key: str
    alert_type: str
    severity: str
    title: str
    message: str
    case_deep_link: Optional[str]
    is_acknowledged: bool
    acknowledged_by: Optional[str]
    acknowledged_at: Optional[datetime]
    created_at: datetime
    metadata_json: Optional[Dict[str, Any]]


class AlertListResponse(BaseModel):
    alerts: List[AlertOut]
    total: int
    unread: int


class AcknowledgeRequest(BaseModel):
    note: Optional[str] = Field(None, max_length=1000)


class RecipientPhone(BaseModel):
    name: str = Field(..., max_length=200)
    phone: str = Field(..., max_length=30)


class RecipientEmail(BaseModel):
    name: str = Field(..., max_length=200)
    email: str = Field(..., max_length=254)


class NotificationSettingsOut(BaseModel):
    id: str
    tenant_id: str
    email_enabled: bool
    dashboard_enabled: bool
    whatsapp_enabled: bool
    whatsapp_sender_number: Optional[str]
    legal_recipient_phones: List[Dict[str, str]]
    legal_recipient_emails: List[Dict[str, str]]
    compliance_recipient_emails: List[Dict[str, str]]
    notification_threshold_minutes: int
    escalation_threshold_minutes: int


class NotificationSettingsUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    dashboard_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None
    whatsapp_sender_number: Optional[str] = Field(None, max_length=20)
    legal_recipient_phones: Optional[List[RecipientPhone]] = None
    legal_recipient_emails: Optional[List[RecipientEmail]] = None
    compliance_recipient_emails: Optional[List[RecipientEmail]] = None
    notification_threshold_minutes: Optional[int] = Field(None, ge=60, le=10080)
    escalation_threshold_minutes: Optional[int] = Field(None, ge=120, le=20160)


# ────────────────────────────── Helpers ──────────────────────────────────────

def _get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _require_tenant(user: Dict[str, Any]) -> str:
    tid = user.get("tenant_id")
    if not tid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant context required")
    return tid


# ─────────────────────────────── Routes ──────────────────────────────────────

@router.get("/alerts", response_model=AlertListResponse)
def list_dashboard_alerts(
    severity: Optional[str] = None,
    alert_type: Optional[str] = None,
    unacknowledged_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(_get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List dashboard alerts with optional severity/type filters."""
    tenant_id = _require_tenant(current_user)

    query = db.query(DashboardAlert).filter(DashboardAlert.tenant_id == tenant_id)
    if severity:
        query = query.filter(DashboardAlert.severity == severity)
    if alert_type:
        query = query.filter(DashboardAlert.alert_type == alert_type)
    if unacknowledged_only:
        query = query.filter(DashboardAlert.is_acknowledged.is_(False))

    total = query.count()
    unread = (
        db.query(DashboardAlert)
        .filter(DashboardAlert.tenant_id == tenant_id, DashboardAlert.is_acknowledged.is_(False))
        .count()
    )
    alerts = query.order_by(DashboardAlert.created_at.desc()).offset(offset).limit(min(limit, 200)).all()

    return AlertListResponse(
        alerts=[AlertOut.model_validate(a) for a in alerts],
        total=total,
        unread=unread,
    )


@router.post("/alerts/{alert_id}/acknowledge", status_code=status.HTTP_200_OK)
def acknowledge_alert(
    alert_id: str,
    body: AcknowledgeRequest,
    db: Session = Depends(_get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Acknowledge a dashboard alert. Idempotent — safe to call multiple times."""
    tenant_id = _require_tenant(current_user)
    user_id = current_user.get("sub") or current_user.get("id")

    alert = (
        db.query(DashboardAlert)
        .filter(DashboardAlert.id == alert_id, DashboardAlert.tenant_id == tenant_id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    now = datetime.utcnow()

    # Idempotent: only update if not already acknowledged
    if not alert.is_acknowledged:
        alert.is_acknowledged = True
        alert.acknowledged_by = user_id
        alert.acknowledged_at = now

        ack = AlertAcknowledgment(
            alert_id=alert.id,
            tenant_id=tenant_id,
            acknowledged_by=user_id,
            acknowledged_at=now,
            note=body.note,
        )
        db.add(ack)
        db.commit()

    return {"acknowledged": True, "alert_id": alert_id}


@router.get("/notifications/settings", response_model=NotificationSettingsOut)
def get_notification_settings(
    db: Session = Depends(_get_db),
    current_user: Dict[str, Any] = Depends(require_roles("admin", "legal_admin")),
):
    """Get tenant notification settings."""
    tenant_id = _require_tenant(current_user)

    settings = (
        db.query(TenantNotificationSetting)
        .filter(TenantNotificationSetting.tenant_id == tenant_id)
        .first()
    )
    if not settings:
        # Return well-typed defaults without persisting
        return NotificationSettingsOut(
            id="",
            tenant_id=tenant_id,
            email_enabled=True,
            dashboard_enabled=True,
            whatsapp_enabled=False,
            whatsapp_sender_number=None,
            legal_recipient_phones=[],
            legal_recipient_emails=[],
            compliance_recipient_emails=[],
            notification_threshold_minutes=1440,
            escalation_threshold_minutes=2880,
        )

    return NotificationSettingsOut(
        id=settings.id,
        tenant_id=settings.tenant_id,
        email_enabled=settings.email_enabled,
        dashboard_enabled=settings.dashboard_enabled,
        whatsapp_enabled=settings.whatsapp_enabled,
        whatsapp_sender_number=settings.whatsapp_sender_number,
        legal_recipient_phones=settings.legal_recipient_phones_json or [],
        legal_recipient_emails=settings.legal_recipient_emails_json or [],
        compliance_recipient_emails=settings.compliance_recipient_emails_json or [],
        notification_threshold_minutes=settings.notification_threshold_minutes,
        escalation_threshold_minutes=settings.escalation_threshold_minutes,
    )


@router.put("/notifications/settings", response_model=NotificationSettingsOut)
def update_notification_settings(
    body: NotificationSettingsUpdate,
    db: Session = Depends(_get_db),
    current_user: Dict[str, Any] = Depends(require_roles("admin", "legal_admin")),
):
    """Upsert tenant notification settings."""
    tenant_id = _require_tenant(current_user)

    settings = (
        db.query(TenantNotificationSetting)
        .filter(TenantNotificationSetting.tenant_id == tenant_id)
        .first()
    )
    if not settings:
        import uuid
        settings = TenantNotificationSetting(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            created_at=datetime.utcnow(),
        )
        db.add(settings)

    if body.email_enabled is not None:
        settings.email_enabled = body.email_enabled
    if body.dashboard_enabled is not None:
        settings.dashboard_enabled = body.dashboard_enabled
    if body.whatsapp_enabled is not None:
        settings.whatsapp_enabled = body.whatsapp_enabled
    if body.whatsapp_sender_number is not None:
        settings.whatsapp_sender_number = body.whatsapp_sender_number
    if body.legal_recipient_phones is not None:
        settings.legal_recipient_phones_json = [p.model_dump() for p in body.legal_recipient_phones]
    if body.legal_recipient_emails is not None:
        settings.legal_recipient_emails_json = [e.model_dump() for e in body.legal_recipient_emails]
    if body.compliance_recipient_emails is not None:
        settings.compliance_recipient_emails_json = [e.model_dump() for e in body.compliance_recipient_emails]
    if body.notification_threshold_minutes is not None:
        settings.notification_threshold_minutes = body.notification_threshold_minutes
    if body.escalation_threshold_minutes is not None:
        settings.escalation_threshold_minutes = body.escalation_threshold_minutes

    settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(settings)

    return NotificationSettingsOut(
        id=settings.id,
        tenant_id=settings.tenant_id,
        email_enabled=settings.email_enabled,
        dashboard_enabled=settings.dashboard_enabled,
        whatsapp_enabled=settings.whatsapp_enabled,
        whatsapp_sender_number=settings.whatsapp_sender_number,
        legal_recipient_phones=settings.legal_recipient_phones_json or [],
        legal_recipient_emails=settings.legal_recipient_emails_json or [],
        compliance_recipient_emails=settings.compliance_recipient_emails_json or [],
        notification_threshold_minutes=settings.notification_threshold_minutes,
        escalation_threshold_minutes=settings.escalation_threshold_minutes,
    )


@router.get("/alerts/{alert_id}/delivery-log")
def get_alert_delivery_log(
    alert_id: str,
    db: Session = Depends(_get_db),
    current_user: Dict[str, Any] = Depends(require_roles("admin", "legal_admin")),
):
    """Get immutable delivery attempt log for an alert."""
    tenant_id = _require_tenant(current_user)

    alert = (
        db.query(DashboardAlert)
        .filter(DashboardAlert.id == alert_id, DashboardAlert.tenant_id == tenant_id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    attempts = (
        db.query(NotificationDeliveryAttempt)
        .filter(NotificationDeliveryAttempt.alert_id == alert_id)
        .order_by(NotificationDeliveryAttempt.attempted_at.desc())
        .all()
    )
    return {
        "alert_id": alert_id,
        "attempts": [
            {
                "id": a.id,
                "channel": a.channel,
                "provider": a.provider,
                "recipient": a.recipient,
                "status": a.status,
                "status_code": a.status_code,
                "failure_reason": a.failure_reason,
                "attempted_at": a.attempted_at.isoformat() if a.attempted_at else None,
            }
            for a in attempts
        ],
    }
