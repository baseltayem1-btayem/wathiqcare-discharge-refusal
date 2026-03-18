from __future__ import annotations

import html
import os
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
        service.client.send_mail(
            subject=admin_subject,
            html_body=admin_html_body,
            text_body=admin_text_body,
            recipients=[DEMO_REQUEST_RECIPIENT],
            cc=[],
            attachments=[],
        )
        for internal_recipient in internal_copy_recipients:
            service.client.send_mail(
                subject=admin_subject,
                html_body=admin_html_body,
                text_body=admin_text_body,
                recipients=[internal_recipient],
                cc=[],
                attachments=[],
            )
        service.client.send_mail(
            subject=requester_subject,
            html_body=requester_html_body,
            text_body=requester_text_body,
            recipients=[requester_email],
            cc=[],
            attachments=[],
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
