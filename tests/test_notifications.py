from app.services.notification_service import (
    get_pending_notifications,
    send_consent_update,
    send_escalation_alert,
)


def test_send_escalation_alert(db, admin_user, legal_user):
    notifications = send_escalation_alert(db, "consent-123", [legal_user.id])
    assert len(notifications) == 1
    assert notifications[0].notification_type == "escalation_alert"
    assert notifications[0].recipient_user_id == legal_user.id


def test_send_consent_update(db, doctor_user, nurse_user):
    notifications = send_consent_update(db, "consent-456", [doctor_user.id, nurse_user.id])
    assert len(notifications) == 2


def test_get_pending_notifications(db, legal_user):
    send_escalation_alert(db, "consent-789", [legal_user.id])
    pending = get_pending_notifications(db, legal_user.id)
    assert len(pending) >= 1
    assert all(n.is_sent is False for n in pending)


def test_notification_not_sent_by_default(db, admin_user):
    notifications = send_escalation_alert(db, "consent-000", [admin_user.id])
    assert notifications[0].is_sent is False
    assert notifications[0].sent_at is None
