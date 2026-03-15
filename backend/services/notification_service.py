from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.core.email_service import EmailService
from backend.models.workflow_notification import WorkflowNotification
from backend.workflow.constants import NotificationChannel, NotificationStatus


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def create_in_app_notification(
        self,
        *,
        case_id: Optional[str],
        task_id: Optional[str],
        recipient_user_id: Optional[str],
        recipient_team_code: Optional[str],
        notification_type: str,
        title: str,
        body: str,
        metadata_json: Optional[Dict[str, Any]] = None,
    ) -> WorkflowNotification:
        notification = WorkflowNotification(
            case_id=case_id,
            task_id=task_id,
            recipient_user_id=recipient_user_id,
            recipient_team_code=recipient_team_code,
            channel=NotificationChannel.IN_APP,
            notification_type=notification_type,
            title=title,
            body=body,
            status=NotificationStatus.SENT,
            sent_at=datetime.utcnow(),
            metadata_json=metadata_json,
        )
        self.db.add(notification)
        self.db.flush()
        return notification

    def send_email_notification(
        self,
        *,
        tenant_id: str,
        created_by: str,
        case_id: Optional[str],
        recipient_email: str,
        title: str,
        body: str,
        metadata_json: Optional[Dict[str, Any]] = None,
    ) -> WorkflowNotification:
        notification = WorkflowNotification(
            case_id=case_id,
            recipient_email=recipient_email,
            channel=NotificationChannel.EMAIL,
            notification_type="workflow_email",
            title=title,
            body=body,
            status=NotificationStatus.PENDING,
            metadata_json=metadata_json,
        )
        self.db.add(notification)
        self.db.flush()

        try:
            service = EmailService()
            service.send_email(
                tenant_id=tenant_id,
                created_by=created_by,
                recipients=[recipient_email],
                cc=[],
                case_id=case_id,
                patient_id=None,
                subject=title,
                html_body=body,
                text_body=body,
                template_name=None,
                template_vars=None,
                attachments=[],
                attachment_document_ids=[],
            )
            notification.status = NotificationStatus.SENT
            notification.sent_at = datetime.utcnow()
        except Exception as exc:
            notification.status = NotificationStatus.FAILED
            notification.error_message = str(exc)

        self.db.flush()
        return notification

    def notify_task_assigned(
        self,
        *,
        case_id: str,
        task_id: str,
        recipient_user_id: Optional[str],
        recipient_team_code: Optional[str],
        title: str,
        body: str,
        recipient_email: Optional[str] = None,
        tenant_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> list[WorkflowNotification]:
        notifications = [
            self.create_in_app_notification(
                case_id=case_id,
                task_id=task_id,
                recipient_user_id=recipient_user_id,
                recipient_team_code=recipient_team_code,
                notification_type="task_assigned",
                title=title,
                body=body,
            )
        ]
        if recipient_email and tenant_id and created_by:
            notifications.append(
                self.send_email_notification(
                    tenant_id=tenant_id,
                    created_by=created_by,
                    case_id=case_id,
                    recipient_email=recipient_email,
                    title=title,
                    body=body,
                )
            )
        return notifications

    def notify_stage_changed(
        self,
        *,
        case_id: str,
        recipient_team_code: Optional[str],
        title: str,
        body: str,
    ) -> WorkflowNotification:
        return self.create_in_app_notification(
            case_id=case_id,
            task_id=None,
            recipient_user_id=None,
            recipient_team_code=recipient_team_code,
            notification_type="stage_changed",
            title=title,
            body=body,
        )

    def notify_case_escalated(self, *, case_id: str, recipient_team_code: str, body: str) -> WorkflowNotification:
        return self.create_in_app_notification(
            case_id=case_id,
            task_id=None,
            recipient_user_id=None,
            recipient_team_code=recipient_team_code,
            notification_type="case_escalated",
            title="Case Escalated",
            body=body,
        )

    def mark_notification_read(self, *, notification_id: str) -> WorkflowNotification:
        notification = self.db.query(WorkflowNotification).filter(WorkflowNotification.id == notification_id).first()
        if not notification:
            raise ValueError("Notification not found")
        notification.status = NotificationStatus.READ
        notification.read_at = datetime.utcnow()
        self.db.flush()
        return notification

    def list_notifications_for_user(self, *, user_id: str, team_code: Optional[str] = None) -> list[WorkflowNotification]:
        query = self.db.query(WorkflowNotification).filter(
            WorkflowNotification.recipient_user_id == user_id,
        )
        if team_code:
            query = query.union(
                self.db.query(WorkflowNotification).filter(
                    WorkflowNotification.recipient_team_code == team_code,
                )
            )
        return query.order_by(WorkflowNotification.created_at.desc()).all()

    def retry_failed_notifications(self) -> list[WorkflowNotification]:
        failed = (
            self.db.query(WorkflowNotification)
            .filter(
                WorkflowNotification.channel == NotificationChannel.EMAIL,
                WorkflowNotification.status == NotificationStatus.FAILED,
                WorkflowNotification.recipient_email.isnot(None),
            )
            .all()
        )
        for item in failed:
            item.status = NotificationStatus.PENDING
            item.error_message = None
        self.db.flush()
        return failed
