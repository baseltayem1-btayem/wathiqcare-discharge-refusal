from __future__ import annotations

import html
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from backend.api.deps import require_roles
from backend.core.database import SessionLocal
from backend.core.email_service import EmailConfigurationError, EmailDeliveryError, EmailService, EmailServiceConfig
from backend.models.workflow_document import DischargeWorkflowDocument
from backend.schemas.email import (
    EmailCapabilitiesResponse,
    EmailLogResponse,
    EmailSendResponse,
    SendDemoRequestEmailRequest,
    SendEmailRequest,
    SendWorkflowNotificationRequest,
)

router = APIRouter(prefix="/api/emails", tags=["Email"])
DEMO_REQUEST_RECIPIENT = "admin@wathiqcare.med.sa"

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


@router.get("/capabilities", response_model=EmailCapabilitiesResponse)
def get_email_capabilities(
    current_user=Depends(require_roles(*EMAIL_VIEW_ROLES)),
):
    del current_user
    try:
        EmailServiceConfig.from_env()
        return EmailCapabilitiesResponse(
            available=True,
            provider="microsoft_graph",
            reason=None,
        )
    except EmailConfigurationError:
        return EmailCapabilitiesResponse(
            available=False,
            provider="microsoft_graph",
            reason="إشعارات البريد الإلكتروني غير مهيأة حالياً.",
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
    except EmailConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي أثناء إرسال البريد")


@router.post("/send-demo-request", response_model=EmailSendResponse)
def send_demo_request_email(payload: SendDemoRequestEmailRequest):
    subject = f"Demo Request - {payload.facility_name}"
    text_body = "\n".join(
        [
            "New WathiqCare demo request",
            "",
            f"Organization: {payload.facility_name}",
            f"Contact person: {payload.contact_name}",
            f"Contact email: {payload.contact_email}",
            f"Contact phone: {payload.contact_phone}",
            f"Contact address: {payload.contact_address}",
            f"Employee count: {payload.employee_count}",
        ]
    )

    html_body = (
        "<div style='font-family: Arial, sans-serif; line-height: 1.6;'>"
        "<h3>New WathiqCare demo request</h3>"
        f"<p><strong>Organization:</strong> {html.escape(payload.facility_name)}</p>"
        f"<p><strong>Contact person:</strong> {html.escape(payload.contact_name)}</p>"
        f"<p><strong>Contact email:</strong> {html.escape(str(payload.contact_email))}</p>"
        f"<p><strong>Contact phone:</strong> {html.escape(payload.contact_phone)}</p>"
        f"<p><strong>Contact address:</strong> {html.escape(payload.contact_address)}</p>"
        f"<p><strong>Employee count:</strong> {payload.employee_count}</p>"
        "</div>"
    )

    try:
        service = EmailService()
        service.client.send_mail(
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            recipients=[DEMO_REQUEST_RECIPIENT],
            cc=[],
            attachments=[],
        )
        return EmailSendResponse(
            log_id=f"demo-request-{uuid4()}",
            status="sent",
            provider="microsoft_graph",
            subject=subject,
            recipients=[DEMO_REQUEST_RECIPIENT],
            cc=[],
            sent_at=datetime.utcnow().isoformat(),
        )
    except EmailConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي أثناء إرسال طلب الديمو")


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
    except EmailConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
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
