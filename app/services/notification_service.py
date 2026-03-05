import logging
from typing import List

from sqlalchemy.orm import Session

from app.models.notification import Notification

logger = logging.getLogger(__name__)


def send_escalation_alert(
    db: Session, consent_id: str, legal_officer_ids: List[str]
) -> List[Notification]:
    notifications = []
    for uid in legal_officer_ids:
        notif = Notification(
            recipient_user_id=uid,
            notification_type="escalation_alert",
            subject=f"Consent Escalation Alert: {consent_id}",
            body=f"Consent {consent_id} has been escalated and requires legal review.",
        )
        db.add(notif)
        notifications.append(notif)
    db.commit()
    for n in notifications:
        db.refresh(n)
        logger.info(
            f"[STUB] Escalation alert sent to user {n.recipient_user_id}: {n.subject}"
        )
    return notifications


def send_consent_update(
    db: Session, consent_id: str, user_ids: List[str]
) -> List[Notification]:
    notifications = []
    for uid in user_ids:
        notif = Notification(
            recipient_user_id=uid,
            notification_type="consent_update",
            subject=f"Consent Update: {consent_id}",
            body=f"Consent {consent_id} has been updated.",
        )
        db.add(notif)
        notifications.append(notif)
    db.commit()
    for n in notifications:
        db.refresh(n)
        logger.info(
            f"[STUB] Consent update sent to user {n.recipient_user_id}: {n.subject}"
        )
    return notifications


def get_pending_notifications(db: Session, user_id: str) -> List[Notification]:
    return (
        db.query(Notification)
        .filter(
            Notification.recipient_user_id == user_id,
            Notification.is_sent.is_(False),
        )
        .all()
    )
