"""
secure_links.py
===============
REST endpoints for tokenised secure-discharge link generation and delivery.

Endpoints
---------
POST   /api/discharge/cases/{case_id}/secure-link
       Generate a link and send it by email (SMS stub ready for when sender is activated).

GET    /api/discharge/cases/{case_id}/secure-links
       List all links for a case (authenticated staff only).

DELETE /api/discharge/cases/{case_id}/secure-links/{link_id}
       Revoke a link (authenticated staff only).

GET    /api/discharge/secure/{token}
       Public, no-auth endpoint – validate token and return case summary.
    Intended to be called by the frontend renderer at {APP_BASE_URL}/secure/{token}.

POST   /api/discharge/secure/{token}/decision
    Public, no-auth endpoint – submit accept/refuse decision from the patient-facing page.
"""

from __future__ import annotations

import logging
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr

from backend.api.deps import require_roles
from backend.services.secure_link_service import (
    generate_link,
    list_links_for_case,
    revoke_link,
    submit_decision,
    update_delivery_status,
    validate_token,
)
from backend.core.email_service import EmailConfigurationError, EmailService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Secure Discharge Links"])

_STAFF_ROLES = (
    "tenant_admin",
    "legal_admin",
    "doctor",
    "nursing",
    "patient_affairs",
    "social_services",
    "quality",
    "compliance",
)


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class GenerateLinkRequest(BaseModel):
    recipient_email: EmailStr
    expiry_hours: Optional[int] = None  # overrides SECURE_LINK_EXPIRY_HOURS env var if set


class GenerateLinkResponse(BaseModel):
    link_id: str
    url: str
    expires_at: str
    recipient_email: str
    delivery_status: str
    delivery_channel: str


class PublicSecureCaseResponse(BaseModel):
    link_id: str
    hospital_name: Optional[str] = None
    case_id: str
    case_reference: str
    patient_name: Optional[str] = None
    discharge_summary: Optional[str] = None
    legal_notice: str
    expires_at: str
    accessed_at: Optional[str] = None
    decision_type: Optional[str] = None
    decision_name: Optional[str] = None
    decision_submitted_at: Optional[str] = None
    # Conditional sections derived from case execution items
    has_home_care_agreement: bool = False
    home_care_agreement_text: Optional[str] = None
    has_equipment_acknowledgment: bool = False
    equipment_acknowledgment_text: Optional[str] = None


class SubmitDecisionRequest(BaseModel):
    decision: Literal["accept", "refuse"]
    typed_name: str
    refusal_acknowledged: bool = False
    signature_data: Optional[str] = None  # base64 PNG from canvas; None = typed-name fallback


class SubmitDecisionResponse(BaseModel):
    hospital_name: Optional[str] = None
    case_id: str
    case_reference: str
    decision_type: str
    typed_name: str
    submitted_at: str
    confirmation_message: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _try_send_email(
    *,
    tenant_id: str,
    created_by: str,
    case_id: str,
    link_id: str,
    recipient_email: str,
    url: str,
    expires_at: str,
) -> str:
    """
    Attempt to email the secure link.  Returns the delivery_status string.

    If email is not configured (e.g. local dev), the status is set to
    'not_configured' and the link is still persisted so staff can copy the URL
    manually.  This behaviour is intentional while SMS sender approval is
    pending.
    """
    subject = "WathiqCare – رابط مراجعة قرار التصريح"
    html_body = f"""
<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7">
  <p>السادة،</p>
  <p>
    يمكنكم الاطلاع على مستندات حالة التصريح من خلال الرابط الآمن أدناه.
    ينتهي الرابط في: <strong>{expires_at}</strong>.
  </p>
  <p>
    <a href="{url}" style="background:#0057A4;color:#fff;padding:10px 22px;
    border-radius:4px;text-decoration:none;display:inline-block;">
      عرض المستند
    </a>
  </p>
  <p style="font-size:12px;color:#888">
    إذا لم تتوقع هذا البريد، يمكنك تجاهله بأمان.
  </p>
</div>
"""
    text_body = f"رابط مراجعة قرار التصريح:\n{url}\n(ينتهي في: {expires_at})"

    try:
        svc = EmailService()
        svc.send_email(
            tenant_id=tenant_id,
            created_by=created_by,
            recipients=[recipient_email],
            cc=[],
            case_id=case_id,
            patient_id=None,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name=None,
            template_vars=None,
            attachments=[],
            attachment_document_ids=[],
        )
        update_delivery_status(link_id, status="sent")
        logger.info(
            "secure_link_email_sent link_id=%s recipient=%s", link_id, recipient_email
        )
        return "sent"
    except EmailConfigurationError as exc:
        update_delivery_status(link_id, status="not_configured")
        logger.warning(
            "secure_link_email_not_configured link_id=%s reason=%s", link_id, exc
        )
        return "not_configured"
    except Exception as exc:
        update_delivery_status(link_id, status="failed")
        logger.error(
            "secure_link_email_failed link_id=%s error=%s", link_id, exc
        )
        return "failed"


def _client_ip(request: Request) -> Optional[str]:
    explicit_forwarded_for = request.headers.get("x-wathiqcare-forwarded-for", "").strip()
    if explicit_forwarded_for:
        return explicit_forwarded_for.split(",")[0].strip() or None

    explicit_real_ip = request.headers.get("x-wathiqcare-real-ip", "").strip()
    if explicit_real_ip:
        return explicit_real_ip or None

    forwarded_for = request.headers.get("x-forwarded-for", "").strip()
    if forwarded_for:
        return forwarded_for.split(",")[0].strip() or None
    return request.client.host if request.client else None


def _client_user_agent(request: Request) -> Optional[str]:
    explicit_user_agent = request.headers.get("x-wathiqcare-user-agent", "").strip()
    if explicit_user_agent:
        return explicit_user_agent or None

    value = request.headers.get("user-agent", "").strip()
    return value or None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/api/discharge/cases/{case_id}/secure-link",
    response_model=GenerateLinkResponse,
    summary="إنشاء رابط تصريح آمن وإرساله بالبريد الإلكتروني",
)
def create_secure_link(
    case_id: str,
    payload: GenerateLinkRequest,
    current_user=Depends(require_roles(*_STAFF_ROLES)),
):
    """
    Generate a tokenised secure-discharge link for ``recipient_email`` and
    immediately attempt email delivery.

    * If email is not configured the link is still created and the URL is
      returned so staff can distribute it via another channel.
    * SMS delivery will be activated automatically once the WathiqCare sender
      is approved by Taqnyat.
    """
    try:
        result = generate_link(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            created_by=current_user["id"],
            recipient_email=str(payload.recipient_email),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    delivery_status = _try_send_email(
        tenant_id=current_user["tenant_id"],
        created_by=current_user["id"],
        case_id=case_id,
        link_id=result["link_id"],
        recipient_email=result["recipient_email"],
        url=result["url"],
        expires_at=result["expires_at"],
    )

    return GenerateLinkResponse(
        link_id=result["link_id"],
        url=result["url"],
        expires_at=result["expires_at"],
        recipient_email=result["recipient_email"],
        delivery_status=delivery_status,
        delivery_channel="email",
    )


@router.get(
    "/api/discharge/cases/{case_id}/secure-links",
    summary="قائمة الروابط الآمنة لحالة تصريح",
)
def get_secure_links(
    case_id: str,
    current_user=Depends(require_roles(*_STAFF_ROLES)),
):
    return list_links_for_case(
        tenant_id=current_user["tenant_id"],
        case_id=case_id,
    )


@router.delete(
    "/api/discharge/cases/{case_id}/secure-links/{link_id}",
    summary="إلغاء رابط تصريح آمن",
)
def delete_secure_link(
    case_id: str,
    link_id: str,
    current_user=Depends(require_roles(*_STAFF_ROLES)),
):
    try:
        revoke_link(
            link_id=link_id,
            tenant_id=current_user["tenant_id"],
            revoked_by=current_user["id"],
        )
        return {"revoked": True, "link_id": link_id}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get(
    "/api/discharge/secure/{token}",
    response_model=PublicSecureCaseResponse,
    summary="التحقق من رمز الرابط الآمن",
    include_in_schema=True,
)
def resolve_secure_token(token: str, request: Request):
    """
    Public, no-auth endpoint.  Validates a raw token and returns the case
    summary.  Called by the frontend when a recipient opens the secure link.

    Returns 404 for invalid/revoked tokens and 410 for expired tokens so the
    frontend can show appropriate Arabic error pages.
    """
    try:
        return validate_token(
            token,
            ip_address=_client_ip(request),
            user_agent=_client_user_agent(request),
        )
    except ValueError as exc:
        msg = str(exc)
        if "انتهت صلاحية" in msg:
            raise HTTPException(status_code=410, detail=msg)
        raise HTTPException(status_code=404, detail=msg)


@router.get(
    "/api/secure-links/{token}",
    response_model=PublicSecureCaseResponse,
    summary="[توافق] التحقق من رمز الرابط الآمن",
    include_in_schema=True,
)
def resolve_secure_token_compat(token: str, request: Request):
    """
    Compatibility route that forwards to the current secure-link token resolver.
    Existing /api/discharge/secure/{token} remains the canonical route.
    """
    return resolve_secure_token(token, request)


@router.post(
    "/api/discharge/secure/{token}/decision",
    response_model=SubmitDecisionResponse,
    summary="تسجيل قرار المريض أو الممثل النظامي عبر الرابط الآمن",
)
def submit_secure_decision(
    token: str,
    payload: SubmitDecisionRequest,
    request: Request,
):
    try:
        return submit_decision(
            token,
            decision_type=payload.decision,
            typed_name=payload.typed_name,
            refusal_acknowledged=payload.refusal_acknowledged,
            signature_data=payload.signature_data,
            ip_address=_client_ip(request),
            user_agent=_client_user_agent(request),
        )
    except ValueError as exc:
        msg = str(exc)
        if "انتهت صلاحية" in msg:
            raise HTTPException(status_code=410, detail=msg)
        if "تم إلغاء" in msg or "غير صالح" in msg or "غير موجودة" in msg:
            raise HTTPException(status_code=404, detail=msg)
        raise HTTPException(status_code=400, detail=msg)


@router.post(
    "/api/secure-links/{token}/decision",
    response_model=SubmitDecisionResponse,
    summary="[توافق] تسجيل القرار عبر الرابط الآمن",
)
def submit_secure_decision_compat(
    token: str,
    payload: SubmitDecisionRequest,
    request: Request,
):
    """
    Compatibility route that forwards to the current secure-link decision submitter.
    Existing /api/discharge/secure/{token}/decision remains the canonical route.
    """
    return submit_secure_decision(token, payload, request)
