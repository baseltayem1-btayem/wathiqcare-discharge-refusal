from __future__ import annotations

import html
import os
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from backend.api.deps import require_roles
from backend.core.database import SessionLocal
from backend.core.email_service import EmailConfigurationError, EmailDeliveryError, EmailService, EmailServiceConfig
from backend.core.logging_config import get_logger
from backend.models.workflow_document import DischargeWorkflowDocument
from backend.schemas.email import (
    EmailChannelDiagnosticResponse,
    EmailCapabilitiesResponse,
    EmailLogResponse,
    EmailSendResponse,
    SendDemoRequestEmailRequest,
    SendEmailRequest,
    SendWorkflowNotificationRequest,
)

router = APIRouter(prefix="/api/emails", tags=["Email"])
DEMO_REQUEST_RECIPIENT = "admin@wathiqcare.med.sa"
logger = get_logger(__name__)


def _get_demo_internal_copy_recipients() -> list[str]:
    raw = os.getenv("DEMO_REQUEST_INTERNAL_COPY_EMAILS", "")
    recipients: list[str] = []
    for item in raw.split(","):
        candidate = item.strip().lower()
        if not candidate or candidate == DEMO_REQUEST_RECIPIENT:
            continue
        if "@" not in candidate or "." not in candidate.rsplit("@", 1)[-1]:
            continue
        if candidate not in recipients:
            recipients.append(candidate)
    return recipients


def _get_test_email_recipient() -> str:
    raw = os.getenv("TEST_EMAIL_RECIPIENT", DEMO_REQUEST_RECIPIENT).strip().lower()
    if not raw or "@" not in raw or "." not in raw.rsplit("@", 1)[-1]:
        return DEMO_REQUEST_RECIPIENT
    return raw


def _send_demo_notification(
    *,
    service: EmailService,
    recipient_email: str,
    subject: str,
    html_body: str,
    text_body: str,
    notification_kind: str,
) -> None:
    logger.info(
        "DEMO REQUEST NOTIFICATION FUNCTION CALLED",
        extra={
            "notification_kind": notification_kind,
            "recipient_email": recipient_email,
            "subject": subject,
        },
    )
    service.client.send_mail(
        subject=subject,
        html_body=html_body,
        text_body=text_body,
        recipients=[recipient_email],
        cc=[],
        attachments=[],
    )


def _build_requester_confirmation_content(payload: SendDemoRequestEmailRequest, requester_email: str) -> tuple[str, str, str]:
    if payload.preferred_language == "ar":
        subject = "تم استلام طلبكم للعرض التجريبي من واثق كير"
        text_body = "\n".join(
            [
                f"مرحبًا {payload.contact_name}،",
                "",
                "شكرًا لطلبكم عرضًا تجريبيًا من واثق كير.",
                "هذا البريد يؤكد استلام طلبكم بنجاح.",
                "",
                "البيانات المرسلة:",
                f"- اسم المنشأة: {payload.facility_name}",
                f"- اسم مسؤول التواصل: {payload.contact_name}",
                f"- البريد الإلكتروني: {requester_email}",
                f"- رقم الهاتف: {payload.contact_phone}",
                f"- عنوان التواصل: {payload.contact_address}",
                f"- عدد الموظفين: {payload.employee_count}",
                "",
                "الخطوات التالية:",
                "- سيقوم فريقنا بمراجعة الطلب والتواصل معكم خلال يوم عمل واحد.",
                "- إذا أردتم تعديل أي بيانات، يمكنكم الرد على هذا البريد.",
                "",
                "مع التحية،",
                "فريق واثق كير",
            ]
        )

        html_body = (
            "<div style='background:#f6f8fb;padding:20px;'>"
            "<div style='max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dce3ef;border-radius:14px;overflow:hidden;font-family:Tahoma, Arial, sans-serif;color:#0f172a;'>"
            "<div style='background:#0f172a;color:#ffffff;padding:16px 20px;'>"
            "<h2 style='margin:0;font-size:18px;'>WathiqCare | تأكيد استلام الطلب</h2>"
            "</div>"
            "<div style='padding:18px 20px;line-height:1.7;'>"
            f"<p style='margin:0 0 12px 0;'>مرحبًا {html.escape(payload.contact_name)}،</p>"
            "<p style='margin:0 0 12px 0;'>شكرًا لطلبكم عرضًا تجريبيًا من <strong>واثق كير</strong>. تم استلام الطلب بنجاح.</p>"
            "<h3 style='font-size:15px;margin:16px 0 8px 0;'>البيانات المرسلة</h3>"
            "<ul style='margin:0 0 12px 0;padding-right:18px;'>"
            f"<li><strong>اسم المنشأة:</strong> {html.escape(payload.facility_name)}</li>"
            f"<li><strong>اسم مسؤول التواصل:</strong> {html.escape(payload.contact_name)}</li>"
            f"<li><strong>البريد الإلكتروني:</strong> {html.escape(requester_email)}</li>"
            f"<li><strong>رقم الهاتف:</strong> {html.escape(payload.contact_phone)}</li>"
            f"<li><strong>عنوان التواصل:</strong> {html.escape(payload.contact_address)}</li>"
            f"<li><strong>عدد الموظفين:</strong> {payload.employee_count}</li>"
            "</ul>"
            "<h3 style='font-size:15px;margin:16px 0 8px 0;'>الخطوات التالية</h3>"
            "<ul style='margin:0;padding-right:18px;'>"
            "<li>سيقوم فريقنا بمراجعة الطلب والتواصل معكم خلال يوم عمل واحد.</li>"
            "<li>إذا أردتم تعديل أي بيانات، يمكنكم الرد على هذا البريد.</li>"
            "</ul>"
            "<p style='margin:16px 0 0 0;'>مع التحية،<br/>فريق واثق كير</p>"
            "</div>"
            "</div>"
            "</div>"
        )
        return subject, text_body, html_body

    subject = "We received your WathiqCare demo request"
    text_body = "\n".join(
        [
            f"Hello {payload.contact_name},",
            "",
            "Thank you for requesting a WathiqCare demo.",
            "This email confirms that we successfully received your submission.",
            "",
            "Submitted details:",
            f"- Organization: {payload.facility_name}",
            f"- Contact person: {payload.contact_name}",
            f"- Contact email: {requester_email}",
            f"- Contact phone: {payload.contact_phone}",
            f"- Contact address: {payload.contact_address}",
            f"- Employee count: {payload.employee_count}",
            "",
            "What happens next:",
            "- Our team will review your request and contact you within one business day.",
            "- If any information needs to be corrected, please reply to this email.",
            "",
            "Best regards,",
            "WathiqCare Team",
        ]
    )

    html_body = (
        "<div style='background:#f6f8fb;padding:20px;'>"
        "<div style='max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dce3ef;border-radius:14px;overflow:hidden;font-family:Arial, sans-serif;color:#0f172a;'>"
        "<div style='background:#0f172a;color:#ffffff;padding:16px 20px;'>"
        "<h2 style='margin:0;font-size:18px;'>WathiqCare | Demo Request Confirmation</h2>"
        "</div>"
        "<div style='padding:18px 20px;line-height:1.7;'>"
        f"<p style='margin:0 0 12px 0;'>Hello {html.escape(payload.contact_name)},</p>"
        "<p style='margin:0 0 12px 0;'>Thank you for requesting a <strong>WathiqCare</strong> demo. This email confirms that we successfully received your submission.</p>"
        "<h3 style='font-size:15px;margin:16px 0 8px 0;'>Submitted details</h3>"
        "<ul style='margin:0 0 12px 0;padding-left:18px;'>"
        f"<li><strong>Organization:</strong> {html.escape(payload.facility_name)}</li>"
        f"<li><strong>Contact person:</strong> {html.escape(payload.contact_name)}</li>"
        f"<li><strong>Contact email:</strong> {html.escape(requester_email)}</li>"
        f"<li><strong>Contact phone:</strong> {html.escape(payload.contact_phone)}</li>"
        f"<li><strong>Contact address:</strong> {html.escape(payload.contact_address)}</li>"
        f"<li><strong>Employee count:</strong> {payload.employee_count}</li>"
        "</ul>"
        "<h3 style='font-size:15px;margin:16px 0 8px 0;'>What happens next</h3>"
        "<ul style='margin:0;padding-left:18px;'>"
        "<li>Our team will review your request and contact you within one business day.</li>"
        "<li>If any information needs to be corrected, please reply to this email.</li>"
        "</ul>"
        "<p style='margin:16px 0 0 0;'>Best regards,<br/>WathiqCare Team</p>"
        "</div>"
        "</div>"
        "</div>"
    )
    return subject, text_body, html_body

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


def _email_capabilities_response() -> EmailCapabilitiesResponse:
    diagnostics = EmailServiceConfig.diagnostics()
    return EmailCapabilitiesResponse(
        available=diagnostics.available,
        provider=diagnostics.provider,
        reason=diagnostics.reason,
        preferred_channel=diagnostics.preferred_channel,
        configured_channels=diagnostics.configured_channels,
        diagnostics=[
            EmailChannelDiagnosticResponse(
                name=item.name,
                available=item.available,
                configured=item.configured,
                reason=item.reason,
                missing=item.missing,
                invalid=item.invalid,
                sender_email=item.sender_email,
            )
            for item in diagnostics.diagnostics
        ],
    )


@router.get("/capabilities", response_model=EmailCapabilitiesResponse)
def get_email_capabilities(
    current_user=Depends(require_roles(*EMAIL_VIEW_ROLES)),
):
    del current_user
    return _email_capabilities_response()


@router.get("/diagnostics", response_model=EmailCapabilitiesResponse)
def get_email_diagnostics(
    current_user=Depends(require_roles(*EMAIL_VIEW_ROLES)),
):
    del current_user
    return _email_capabilities_response()


@router.post("/send", response_model=EmailSendResponse)
def send_email(
    payload: SendEmailRequest,
    current_user=Depends(require_roles(*EMAIL_ALLOWED_ROLES)),
):
    try:
        logger.info(
            "INCOMING POST send-email",
            extra={
                "tenant_id": current_user.get("tenant_id"),
                "actor_user_id": current_user.get("id"),
                "payload": payload.model_dump(),
            },
        )
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
        logger.exception("SEND EMAIL CONFIGURATION ERROR")
        raise HTTPException(status_code=503, detail=str(exc))
    except EmailDeliveryError as exc:
        logger.exception("SEND EMAIL DELIVERY ERROR")
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception:
        logger.exception("SEND EMAIL INTERNAL ERROR")
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي أثناء إرسال البريد")


@router.post("/send-demo-request", response_model=EmailSendResponse)
def send_demo_request_email(payload: SendDemoRequestEmailRequest):
    logger.info(
        "INCOMING POST send-demo-request",
        extra={
            "payload": payload.model_dump(),
        },
    )
    requester_email = str(payload.contact_email).strip().lower()
    submitted_at = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    internal_copy_recipients = _get_demo_internal_copy_recipients()

    admin_subject = f"New Demo Request - {payload.facility_name}"
    admin_text_body = "\n".join(
        [
            "New WathiqCare demo request",
            "",
            f"Submitted at (UTC): {submitted_at}",
            f"Organization: {payload.facility_name}",
            f"Contact person: {payload.contact_name}",
            f"Contact email: {requester_email}",
            f"Contact phone: {payload.contact_phone}",
            f"Contact address: {payload.contact_address}",
            f"Employee count: {payload.employee_count}",
            f"Preferred language: {payload.preferred_language}",
        ]
    )

    admin_html_body = (
        "<div style='font-family: Arial, sans-serif; line-height: 1.6;'>"
        "<h3>New WathiqCare demo request</h3>"
        f"<p><strong>Submitted at (UTC):</strong> {html.escape(submitted_at)}</p>"
        f"<p><strong>Organization:</strong> {html.escape(payload.facility_name)}</p>"
        f"<p><strong>Contact person:</strong> {html.escape(payload.contact_name)}</p>"
        f"<p><strong>Contact email:</strong> {html.escape(requester_email)}</p>"
        f"<p><strong>Contact phone:</strong> {html.escape(payload.contact_phone)}</p>"
        f"<p><strong>Contact address:</strong> {html.escape(payload.contact_address)}</p>"
        f"<p><strong>Employee count:</strong> {payload.employee_count}</p>"
        f"<p><strong>Preferred language:</strong> {html.escape(payload.preferred_language)}</p>"
        "</div>"
    )
    requester_subject, requester_text_body, requester_html_body = _build_requester_confirmation_content(payload, requester_email)

    try:
        service = EmailService()
        _send_demo_notification(
            service=service,
            recipient_email=DEMO_REQUEST_RECIPIENT,
            subject=admin_subject,
            html_body=admin_html_body,
            text_body=admin_text_body,
            notification_kind="admin_primary",
        )
        for internal_recipient in internal_copy_recipients:
            _send_demo_notification(
                service=service,
                recipient_email=internal_recipient,
                subject=admin_subject,
                html_body=admin_html_body,
                text_body=admin_text_body,
                notification_kind="admin_internal_copy",
            )
        _send_demo_notification(
            service=service,
            recipient_email=requester_email,
            subject=requester_subject,
            html_body=requester_html_body,
            text_body=requester_text_body,
            notification_kind="requester_confirmation",
        )
        return EmailSendResponse(
            log_id=f"demo-request-{uuid4()}",
            status="sent",
            provider="microsoft_graph",
            subject=admin_subject,
            recipients=[DEMO_REQUEST_RECIPIENT, *internal_copy_recipients, requester_email],
            cc=[],
            sent_at=datetime.utcnow().isoformat(),
        )
    except EmailConfigurationError as exc:
        logger.exception("SEND DEMO REQUEST CONFIGURATION ERROR")
        raise HTTPException(status_code=503, detail=str(exc))
    except EmailDeliveryError as exc:
        logger.exception("SEND DEMO REQUEST DELIVERY ERROR")
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception:
        logger.exception("SEND DEMO REQUEST INTERNAL ERROR")
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي أثناء إرسال طلب الديمو")


@router.post("/send-workflow-notification", response_model=EmailSendResponse)
def send_workflow_notification(
    payload: SendWorkflowNotificationRequest,
    current_user=Depends(require_roles(*EMAIL_ALLOWED_ROLES)),
):
    try:
        logger.info(
            "INCOMING POST send-workflow-notification",
            extra={
                "tenant_id": current_user.get("tenant_id"),
                "actor_user_id": current_user.get("id"),
                "payload": payload.model_dump(),
            },
        )
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

        logger.info(
            "WORKFLOW NOTIFICATION FUNCTION CALLED",
            extra={
                "tenant_id": current_user.get("tenant_id"),
                "actor_user_id": current_user.get("id"),
                "case_id": payload.case_id,
                "recipient_count": len(payload.to),
            },
        )
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
        logger.exception("SEND WORKFLOW NOTIFICATION CONFIGURATION ERROR")
        raise HTTPException(status_code=503, detail=str(exc))
    except EmailDeliveryError as exc:
        logger.exception("SEND WORKFLOW NOTIFICATION DELIVERY ERROR")
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception:
        logger.exception("SEND WORKFLOW NOTIFICATION INTERNAL ERROR")
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي أثناء إرسال إشعار سير العمل")


@router.post("/test-email", response_model=EmailSendResponse)
def send_test_email(
    current_user=Depends(require_roles(*EMAIL_ALLOWED_ROLES)),
):
    recipient = _get_test_email_recipient()
    sent_at = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    try:
        logger.info(
            "INCOMING POST test-email",
            extra={
                "tenant_id": current_user.get("tenant_id"),
                "actor_user_id": current_user.get("id"),
                "recipient": recipient,
            },
        )
        logger.info(
            "TEST EMAIL FUNCTION CALLED",
            extra={
                "tenant_id": current_user.get("tenant_id"),
                "actor_user_id": current_user.get("id"),
                "recipient": recipient,
            },
        )
        service = EmailService()
        return service.send_email(
            tenant_id=current_user["tenant_id"],
            created_by=current_user["id"],
            recipients=[recipient],
            cc=[],
            case_id=None,
            patient_id=None,
            subject=f"WathiqCare test email - {sent_at}",
            html_body=(
                "<div style='font-family:Arial,sans-serif;'>"
                "<h3>WathiqCare Graph Email Test</h3>"
                f"<p>This is a test delivery generated at {html.escape(sent_at)}.</p>"
                "</div>"
            ),
            text_body=f"WathiqCare Graph Email Test generated at {sent_at}.",
            template_name=None,
            template_vars=None,
            attachments=[],
            attachment_document_ids=[],
        )
    except EmailConfigurationError as exc:
        logger.exception("TEST EMAIL CONFIGURATION ERROR")
        raise HTTPException(status_code=503, detail=str(exc))
    except EmailDeliveryError as exc:
        logger.exception("TEST EMAIL DELIVERY ERROR")
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception:
        logger.exception("TEST EMAIL INTERNAL ERROR")
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي أثناء إرسال البريد التجريبي")


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
