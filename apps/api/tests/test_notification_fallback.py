from __future__ import annotations

from datetime import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import backend.models  # noqa: F401
from backend.api.routers.alerts import AcknowledgeRequest, acknowledge_alert
from backend.core.database import Base
from backend.models.alert_acknowledgment import AlertAcknowledgment
from backend.models.dashboard_alert import DashboardAlert
from backend.models.notification_delivery_attempt import NotificationDeliveryAttempt
from backend.models.tenant import Tenant
from backend.models.tenant_notification_setting import TenantNotificationSetting
from backend.models.user import User
from backend.notifications import orchestrator
from backend.notifications.dashboard_channel import send_dashboard_alert


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = local()
    tenant = Tenant(id="tenant-1", name="Hospital A", code="HOSP-A", is_active=True)
    user = User(
        id="user-1",
        tenant_id=tenant.id,
        email="legal@hospital.test",
        full_name="Legal Admin",
        role="legal_admin",
        hashed_password="hash",
    )
    db.add(tenant)
    db.add(user)
    db.add(
        TenantNotificationSetting(
            id="setting-1",
            tenant_id=tenant.id,
            email_enabled=True,
            dashboard_enabled=True,
            whatsapp_enabled=True,
            whatsapp_sender_number="+966500000000",
            legal_recipient_phones_json=[{"name": "Legal On Call", "phone": "+966511111111"}],
            legal_recipient_emails_json=[{"name": "Legal", "email": "legal@hospital.test"}],
            compliance_recipient_emails_json=[{"name": "Compliance", "email": "compliance@hospital.test"}],
            notification_threshold_minutes=1440,
            escalation_threshold_minutes=2880,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
    )
    db.commit()
    try:
        yield db
    finally:
        db.close()


def test_dispatch_with_fallback_uses_email_then_dashboard_then_whatsapp_for_critical(db_session, monkeypatch):
    order: list[str] = []

    def fake_email(db, *, payload, settings, recipients):
        order.append("email")
        return False

    def fake_dashboard(db, **kwargs):
        order.append("dashboard")
        return DashboardAlert(
            id="alert-1",
            tenant_id=kwargs["tenant_id"],
            case_id=kwargs.get("case_id"),
            alert_key=kwargs["alert_key"],
            alert_type=kwargs["alert_type"],
            severity=kwargs["severity"],
            title=kwargs["title"],
            message=kwargs["message"],
        )

    def fake_whatsapp(db, **kwargs):
        order.append("whatsapp")
        return True

    monkeypatch.setattr(orchestrator, "_dispatch_email", fake_email)
    monkeypatch.setattr(orchestrator, "send_dashboard_alert", fake_dashboard)
    monkeypatch.setattr(orchestrator, "send_whatsapp_alert", fake_whatsapp)

    payload = orchestrator.DispatchPayload(
        tenant_id="tenant-1",
        case_id="case-1",
        trigger_type=orchestrator.TRIGGER_48H_ESCALATION,
        severity=orchestrator.SEVERITY_CRITICAL,
        title="48h Escalation Triggered",
        message="Urgent legal and compliance review required.",
        reference_id="ABC12345",
        secure_link="https://example.com/case/case-1",
        case_deep_link="/workflow/medical-discharge-refusal/case/case-1/final-review",
        recipient_emails=["legal@hospital.test"],
        recipient_phones=["+966511111111"],
    )

    result = orchestrator.dispatch_with_fallback(db_session, payload)

    assert order == ["email", "dashboard", "whatsapp"]
    assert result.email_sent is False
    assert result.dashboard_sent is True
    assert result.whatsapp_sent is True


def test_dashboard_alert_creation_is_deduplicated(db_session):
    first = send_dashboard_alert(
        db_session,
        tenant_id="tenant-1",
        case_id="case-1",
        alert_key="tenant-1:case-1:blocked_finalization",
        alert_type="blocked_finalization",
        severity="critical",
        title="Blocked finalization",
        message="Case cannot be finalized.",
        case_deep_link="/legal-alerts",
    )
    second = send_dashboard_alert(
        db_session,
        tenant_id="tenant-1",
        case_id="case-1",
        alert_key="tenant-1:case-1:blocked_finalization",
        alert_type="blocked_finalization",
        severity="critical",
        title="Blocked finalization",
        message="Case cannot be finalized.",
        case_deep_link="/legal-alerts",
    )

    alerts = db_session.query(DashboardAlert).all()
    attempts = db_session.query(NotificationDeliveryAttempt).order_by(NotificationDeliveryAttempt.attempted_at.asc()).all()

    assert first.id == second.id
    assert len(alerts) == 1
    assert len(attempts) == 2
    assert attempts[0].status == "sent"
    assert attempts[1].status == "skipped"


def test_acknowledgment_flow_records_single_ack(db_session):
    alert = send_dashboard_alert(
        db_session,
        tenant_id="tenant-1",
        case_id="case-1",
        alert_key="tenant-1:case-1:legal_24h_notification",
        alert_type="legal_24h_notification",
        severity="warning",
        title="24h Legal Notification",
        message="Legal review required.",
    )
    db_session.commit()

    current_user = {"tenant_id": "tenant-1", "sub": "user-1", "role": "legal_admin"}

    first = acknowledge_alert(alert.id, AcknowledgeRequest(note="Reviewed by legal"), db_session, current_user)
    second = acknowledge_alert(alert.id, AcknowledgeRequest(note="Reviewed twice"), db_session, current_user)

    db_session.refresh(alert)
    acks = db_session.query(AlertAcknowledgment).filter(AlertAcknowledgment.alert_id == alert.id).all()

    assert first["acknowledged"] is True
    assert second["acknowledged"] is True
    assert alert.is_acknowledged is True
    assert alert.acknowledged_by == "user-1"
    assert len(acks) == 1
    assert acks[0].note == "Reviewed by legal"


def test_whatsapp_dispatch_is_critical_only(db_session, monkeypatch):
    calls: list[str] = []

    def fake_whatsapp(db, **kwargs):
        calls.append(kwargs["notification_type"])
        return True

    monkeypatch.setattr(orchestrator, "send_whatsapp_alert", fake_whatsapp)
    monkeypatch.setattr(orchestrator, "_dispatch_email", lambda db, *, payload, settings, recipients: True)
    monkeypatch.setattr(
        orchestrator,
        "send_dashboard_alert",
        lambda db, **kwargs: DashboardAlert(
            id="alert-1",
            tenant_id=kwargs["tenant_id"],
            case_id=kwargs.get("case_id"),
            alert_key=kwargs["alert_key"],
            alert_type=kwargs["alert_type"],
            severity=kwargs["severity"],
            title=kwargs["title"],
            message=kwargs["message"],
        ),
    )

    warning_payload = orchestrator.DispatchPayload(
        tenant_id="tenant-1",
        case_id="case-1",
        trigger_type=orchestrator.TRIGGER_24H_LEGAL,
        severity=orchestrator.SEVERITY_WARNING,
        title="24h Legal Notification",
        message="Legal review required.",
        reference_id="ABC12345",
        secure_link="https://example.com/case/case-1",
        recipient_emails=["legal@hospital.test"],
        recipient_phones=["+966511111111"],
    )
    critical_payload = orchestrator.DispatchPayload(
        tenant_id="tenant-1",
        case_id="case-1",
        trigger_type=orchestrator.TRIGGER_BLOCKED_FINALIZE,
        severity=orchestrator.SEVERITY_CRITICAL,
        title="Blocked finalization",
        message="Urgent correction required.",
        reference_id="ABC12345",
        secure_link="https://example.com/case/case-1",
        recipient_emails=["legal@hospital.test"],
        recipient_phones=["+966511111111"],
    )

    warning_result = orchestrator.dispatch_with_fallback(db_session, warning_payload)
    critical_result = orchestrator.dispatch_with_fallback(db_session, critical_payload)

    assert warning_result.whatsapp_sent is False
    assert critical_result.whatsapp_sent is True
    assert calls == [orchestrator.TRIGGER_BLOCKED_FINALIZE]
