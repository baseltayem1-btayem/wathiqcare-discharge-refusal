from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from backend.api.deps import require_roles
from backend.core.database import SessionLocal
from backend.core.email_service import EmailService
from backend.models.workflow_document import DischargeWorkflowDocument
from backend.schemas.email import (
    EmailLogResponse,
    EmailSendResponse,
    SendEmailRequest,
    SendWorkflowNotificationRequest,
)

router = APIRouter(prefix="/api/emails", tags=["Email"])

EMAIL_ALLOWED_ROLES = (
    "tenant_admin",
    "legal_admin",
    "doctor",
    "patient_affairs",
    "compliance",
)

EMAIL_VIEW_ROLES = (
    "tenant_admin",
    "legal_admin",
    "doctor",
    "patient_affairs",
    "social_services",
    "compliance",
    "viewer",
)


@router.post("/send", response_model=EmailSendResponse)
def send_email(
    payload: SendEmailRequest,
    current_user=Depends(require_roles(*EMAIL_ALLOWED_ROLES)),
):
    try:
        service = EmailService()
        return service.send_email(
            tenant_id=current_user["tenant_id"],
            created_by=current_user["id"],
            recipients=payload.to,
            cc=payload.cc,
            case_id=payload.case_id,
            patient_id=payload.patient_id,
            subject=payload.subject,
            html_body=payload.html_body,
            text_body=payload.text_body,
            template_name=payload.template_name,
            template_vars=payload.template_vars,
            attachments=[item.model_dump() for item in payload.attachments],
            attachment_document_ids=[],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي أثناء إرسال البريد")


@router.post("/send-workflow-notification", response_model=EmailSendResponse)
def send_workflow_notification(
    payload: SendWorkflowNotificationRequest,
    current_user=Depends(require_roles(*EMAIL_ALLOWED_ROLES)),
):
    try:
        service = EmailService()
        attachment_document_ids = list(payload.attachment_document_ids)

        if payload.include_latest_case_documents:
            db = SessionLocal()
            try:
                latest_documents = (
                    db.query(DischargeWorkflowDocument)
                    .filter(
                        DischargeWorkflowDocument.tenant_id == current_user["tenant_id"],
                        DischargeWorkflowDocument.case_id == payload.case_id,
                    )
                    .order_by(DischargeWorkflowDocument.generated_at.desc())
                    .limit(3)
                    .all()
                )
                for document in latest_documents:
                    if document.id not in attachment_document_ids:
                        attachment_document_ids.append(document.id)
            finally:
                db.close()

        return service.send_email(
            tenant_id=current_user["tenant_id"],
            created_by=current_user["id"],
            recipients=payload.to,
            cc=payload.cc,
            case_id=payload.case_id,
            patient_id=None,
            subject=None,
            html_body=None,
            text_body=None,
            template_name=payload.template_name,
            template_vars=payload.template_vars,
            attachments=[],
            attachment_document_ids=attachment_document_ids,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي أثناء إرسال إشعار سير العمل")


@router.get("/logs/{case_id}", response_model=list[EmailLogResponse])
def get_case_email_logs(
    case_id: str,
    current_user=Depends(require_roles(*EMAIL_VIEW_ROLES)),
):
    try:
        service = EmailService()
        rows = service.list_logs(tenant_id=current_user["tenant_id"], case_id=case_id)
        return [
            EmailLogResponse(
                id=row.id,
                case_id=row.case_id,
                patient_id=row.patient_id,
                recipient_email=row.recipient_email,
                cc=row.cc,
                subject=row.subject,
                template_name=row.template_name,
                status=row.status,
                provider=row.provider,
                sent_at=row.sent_at.isoformat() if row.sent_at else None,
                created_by=row.created_by,
                error_message=row.error_message,
                attachment_metadata=row.attachment_metadata,
                created_at=row.created_at.isoformat(),
            )
            for row in rows
        ]
    except Exception:
        raise HTTPException(status_code=500, detail="تعذر تحميل سجلات البريد")
