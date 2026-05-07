from __future__ import annotations

import hashlib
import json
import os
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend.core.database import SessionLocal
from backend.core.discharge_query_service import list_audit_logs_for_case
from backend.core.discharge_workflow_service import (
    generate_document_record,
    get_document_record,
    list_case_documents,
    POLICY_CASE_STATUSES,
    run_workflow_action,
    serialize_document_record,
)
from backend.forms.medical_legal_forms_library import FORMS_LIBRARY, get_form_template_metadata
from backend.forms.workflow_templates import WORKFLOW_TEMPLATES
from backend.models.audit_log import AuditLog
from backend.models.discharge_case import DischargeCase
from backend.models.discharge_workflow import DischargeRefusalWorkflow
from backend.models.workflow_document import DischargeWorkflowDocument
from backend.signature.providers.sms_otp_provider import SmsOtpProvider


SIGNATURE_DIR = Path("backend/generated/document_signature")
SIGNATURE_DIR.mkdir(parents=True, exist_ok=True)

OTP_DIR = Path("backend/generated/document_otp")
OTP_DIR.mkdir(parents=True, exist_ok=True)

OTP_MAX_RETRIES = max(1, int(os.getenv("DOCUMENT_OTP_MAX_RETRIES", "3")))
OTP_TTL_SECONDS = max(30, int(os.getenv("DOCUMENT_OTP_TTL_SECONDS", "300")))
OTP_RESEND_COOLDOWN_SECONDS = max(1, int(os.getenv("DOCUMENT_OTP_RESEND_COOLDOWN_SECONDS", "60")))
EXPOSE_DEBUG_OTP = (os.getenv("EXPOSE_DEBUG_OTP") or "false").strip().lower() == "true"
_APP_ENV = (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or "production").strip().lower()
logger = logging.getLogger(__name__)
if EXPOSE_DEBUG_OTP and _APP_ENV not in {"development", "dev", "test", "testing", "local"}:
    raise RuntimeError(
        "EXPOSE_DEBUG_OTP=true is not allowed outside of development/test environments. "
        "Set APP_ENV=development or remove EXPOSE_DEBUG_OTP to start the server."
    )


@dataclass(frozen=True)
class FormTemplateContract:
    form_type: str
    title_ar: str
    title_en: str
    template_version: str
    owner_department: str
    status: str = "approved"


FORM_TEMPLATES: Dict[str, FormTemplateContract] = {
    "discharge_refusal_form": FormTemplateContract(
        form_type="discharge_refusal_form",
        title_ar="نموذج رفض الخروج الطبي",
        title_en="Medical Discharge Refusal Form",
        template_version="1.0",
        owner_department="Legal Affairs",
    ),
    "financial_responsibility_notice": FormTemplateContract(
        form_type="financial_responsibility_notice",
        title_ar="إشعار وإقرار المسؤولية المالية",
        title_en="Notification and Acknowledgment of Financial Responsibility",
        template_version="1.0",
        owner_department="Patient Affairs",
    ),
    "informed_consent": FormTemplateContract(
        form_type="informed_consent",
        title_ar="نموذج الإقرار والموافقة المستنيرة",
        title_en="Acknowledgment and Informed Consent",
        template_version="1.0",
        owner_department="Clinical Governance",
    ),
    "discharge_decision_record": FormTemplateContract(
        form_type="discharge_decision_record",
        title_ar="نموذج تسجيل قرار الخروج الطبي",
        title_en="Medical Discharge Decision Record",
        template_version="1.0",
        owner_department="Attending Physician",
    ),
    "home_healthcare_agreement": FormTemplateContract(
        form_type="home_healthcare_agreement",
        title_ar="اتفاقية الرعاية الصحية المنزلية",
        title_en="Home Healthcare Agreement",
        template_version="1.0",
        owner_department="Home Healthcare",
    ),
}


def _now() -> datetime:
    return datetime.utcnow()


def _iso(value: Optional[datetime]) -> Optional[str]:
    if not value:
        return None
    return value.isoformat()


def _signature_path(document_id: str) -> Path:
    return SIGNATURE_DIR / f"{document_id}.json"


def _otp_path(document_id: str) -> Path:
    return OTP_DIR / f"{document_id}.json"


def _load_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")


def _parse_iso(value: Any) -> Optional[datetime]:
    if not value or not isinstance(value, str):
        return None

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None

    if parsed.tzinfo is not None:
        return parsed.astimezone(timezone.utc).replace(tzinfo=None)

    return parsed


def _normalize_phone_number(phone_number: str) -> str:
    normalized = "".join(ch for ch in phone_number if ch.isdigit() or ch == "+")
    digits_only = "".join(ch for ch in normalized if ch.isdigit())
    if len(digits_only) < 8 or len(digits_only) > 15:
        raise ValueError("phoneNumber must be a valid mobile number")
    return normalized


def _otp_is_expired(otp_state: Dict[str, Any], *, now: datetime) -> bool:
    expires_at = _parse_iso(otp_state.get("expiresAt"))
    return bool(expires_at and expires_at <= now)


def _normalize_form_type(form_type: str) -> str:
    key = (form_type or "").strip().lower()
    if key not in FORM_TEMPLATES:
        raise ValueError("Unsupported form type")
    return key


def _template_contract(form_type: str) -> FormTemplateContract:
    template = FORM_TEMPLATES[form_type]
    if form_type in FORMS_LIBRARY:
        canonical = get_form_template_metadata(form_type)
        return FormTemplateContract(
            form_type=form_type,
            title_ar=template.title_ar,
            title_en=str(canonical["title"]),
            template_version=str(canonical["version"]),
            owner_department=template.owner_department,
            status=template.status,
        )
    return template


def _render_locked_content(template_key: str) -> str:
    template = WORKFLOW_TEMPLATES.get(template_key)
    if not template:
        raise ValueError("Template is not registered")

    context = {field: "" for field in template.required_fields}
    context.update({"generated_at": _iso(_now()) or ""})

    try:
        return template.renderer(context)
    except Exception as exc:
        # Endpoint hardening: a single template rendering issue must not take
        # down catalog listing in production.
        logger.exception(
            "forms_templates_locked_content_render_failed template=%s",
            template_key,
            exc_info=exc,
        )
        return ""


def _write_audit(
    db,
    *,
    tenant_id: str,
    user_id: str,
    case_id: str,
    action: str,
    details: str,
) -> None:
    event = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        entity_type="discharge_case",
        entity_id=case_id,
        action=action,
        details=details,
        created_at=_now(),
    )
    db.add(event)


def _serialize_generated_document(document: DischargeWorkflowDocument) -> Dict[str, Any]:
    signature_meta = _load_json(_signature_path(document.id))
    payload = serialize_document_record(document)
    payload.update(
        {
            "formTemplateId": document.template_key,
            "previewHtml": document.html_content,
            "pdfFilePath": document.file_path,
            "previewRoute": f"/api/documents/{document.id}/preview",
            "viewRoute": f"/api/documents/{document.id}/view",
            "downloadRoute": f"/api/documents/{document.id}/download",
            "signatureMetadata": signature_meta,
            "signedAt": _iso(document.signed_at),
            "signedBy": document.signed_by,
        }
    )
    return payload


def _sync_case_lifecycle_after_document_event(
    db,
    *,
    document: DischargeWorkflowDocument,
    lifecycle_status: str,
    workflow_case_status: str,
) -> None:
    workflow = (
        db.query(DischargeRefusalWorkflow)
        .filter(DischargeRefusalWorkflow.id == document.workflow_id)
        .first()
    )
    if workflow:
        workflow.case_status = workflow_case_status
        workflow.updated_at = _now()
        if document.template_key == "discharge_refusal_form" and lifecycle_status == "SIGNED_OR_VERIFIED":
            workflow.refusal_form_signed = True

    discharge_case = (
        db.query(DischargeCase)
        .filter(DischargeCase.id == document.case_id)
        .first()
    )
    if discharge_case and discharge_case.status not in {"LEGAL_ESCALATED", "ARCHIVED"}:
        discharge_case.status = lifecycle_status


class FormsEngineService:
    def __init__(self):
        self.sms_provider = SmsOtpProvider()

    def list_templates(self) -> Dict[str, Any]:
        templates: List[Dict[str, Any]] = []
        for form_type in FORM_TEMPLATES:
            template = _template_contract(form_type)
            templates.append(
                {
                    "formType": form_type,
                    "titleAr": template.title_ar,
                    "titleEn": template.title_en,
                    "templateVersion": template.template_version,
                    "lockedContent": _render_locked_content(form_type),
                    "status": template.status,
                    "ownerDepartment": template.owner_department,
                }
            )

        return {"templates": templates}

    def get_template(self, *, form_type: str) -> Dict[str, Any]:
        key = _normalize_form_type(form_type)
        template = _template_contract(key)
        return {
            "formType": key,
            "titleAr": template.title_ar,
            "titleEn": template.title_en,
            "templateVersion": template.template_version,
            "lockedContent": _render_locked_content(key),
            "status": template.status,
            "ownerDepartment": template.owner_department,
        }

    def generate_form(
        self,
        *,
        tenant_id: str,
        case_id: str,
        form_type: str,
        payload: Dict[str, Any],
        current_user: Dict[str, Any],
    ) -> Dict[str, Any]:
        key = _normalize_form_type(form_type)
        if key in {"discharge_refusal_form", "financial_responsibility_notice"}:
            action = {
                "discharge_refusal_form": "generate_refusal_form",
                "financial_responsibility_notice": "generate_financial_notice",
            }[key]
            result = run_workflow_action(
                tenant_id=tenant_id,
                case_id=case_id,
                action=action,
                payload=payload,
                current_user=current_user,
            )
        else:
            result = generate_document_record(
                tenant_id=tenant_id,
                case_id=case_id,
                template_key=key,
                payload=payload,
                current_user=current_user,
            )

        document_payload = result.get("generated_document") or {}
        document_id = str(document_payload.get("id") or "")
        if not document_id:
            raise ValueError("Document generation did not return a document id")

        document = get_document_record(tenant_id=tenant_id, document_id=document_id)
        if key not in {"discharge_refusal_form", "financial_responsibility_notice"}:
            db = SessionLocal()
            try:
                _write_audit(
                    db,
                    tenant_id=tenant_id,
                    user_id=current_user["id"],
                    case_id=case_id,
                    action="document_generated",
                    details=f"Generated {key} document {document_id}",
                )
                db.commit()
            except Exception:
                db.rollback()
                raise
            finally:
                db.close()

        return {"document": _serialize_generated_document(document)}

    def get_document_preview(self, *, tenant_id: str, document_id: str) -> Dict[str, Any]:
        document = get_document_record(tenant_id=tenant_id, document_id=document_id)
        return {
            "documentId": document.id,
            "previewHtml": document.html_content,
            "previewRoute": f"/api/documents/{document.id}/preview",
            "viewRoute": f"/api/documents/{document.id}/view",
            "downloadRoute": f"/api/documents/{document.id}/download",
        }

    def sign_document(
        self,
        *,
        tenant_id: str,
        document_id: str,
        payload: Dict[str, Any],
        current_user: Dict[str, Any],
    ) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            document = (
                db.query(DischargeWorkflowDocument)
                .filter(
                    DischargeWorkflowDocument.id == document_id,
                    DischargeWorkflowDocument.tenant_id == tenant_id,
                )
                .first()
            )
            if not document:
                raise ValueError("Document not found")

            signed_at = _now()
            document.signed_at = signed_at
            document.signed_by = current_user["id"]

            signature_payload = _load_json(_signature_path(document_id))
            signature_payload.update(
                {
                    "documentId": document_id,
                    "signatureMethod": str(payload.get("signatureMethod") or "tablet_signature"),
                    "patientSignature": {
                        "signerName": str(payload.get("signerName") or payload.get("patientName") or ""),
                        "signerRole": str(payload.get("signerRole") or payload.get("signerRelation") or "patient"),
                        "signature": str(payload.get("signature") or payload.get("signatureData") or "captured"),
                        "signatureHash": hashlib.sha256(
                            str(payload.get("signature") or payload.get("signatureData") or "captured").encode("utf-8")
                        ).hexdigest(),
                        "signedAt": _iso(signed_at),
                    },
                    "capturedBy": {
                        "userId": current_user["id"],
                        "userRole": current_user.get("role"),
                        "capturedAt": _iso(signed_at),
                    },
                    "otpVerified": bool(payload.get("otpVerified", False)),
                    "updatedAt": _iso(_now()),
                }
            )
            _write_json(_signature_path(document_id), signature_payload)
            _sync_case_lifecycle_after_document_event(
                db,
                document=document,
                lifecycle_status="SIGNED_OR_VERIFIED",
                workflow_case_status=POLICY_CASE_STATUSES["signed_or_verified"],
            )

            _write_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=document.case_id,
                action="document_signed",
                details=f"Patient/legal signature captured for document {document_id} ({document.template_key})",
            )
            db.commit()
            db.refresh(document)
            return _serialize_generated_document(document)
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def witness_sign_document(
        self,
        *,
        tenant_id: str,
        document_id: str,
        payload: Dict[str, Any],
        current_user: Dict[str, Any],
    ) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            document = (
                db.query(DischargeWorkflowDocument)
                .filter(
                    DischargeWorkflowDocument.id == document_id,
                    DischargeWorkflowDocument.tenant_id == tenant_id,
                )
                .first()
            )
            if not document:
                raise ValueError("Document not found")

            signature_payload = _load_json(_signature_path(document_id))
            witnesses = signature_payload.get("witnessSignatures") or []
            witnesses.append(
                {
                    "witnessName": str(payload.get("witnessName") or ""),
                    "witnessRole": str(payload.get("witnessRole") or "staff"),
                    "signature": str(payload.get("signature") or payload.get("signatureData") or "captured"),
                    "signatureHash": hashlib.sha256(
                        str(payload.get("signature") or payload.get("signatureData") or "captured").encode("utf-8")
                    ).hexdigest(),
                    "signedAt": _iso(_now()),
                    "capturedBy": {
                        "userId": current_user["id"],
                        "userRole": current_user.get("role"),
                    },
                }
            )
            signature_payload["witnessSignatures"] = witnesses
            signature_payload["updatedAt"] = _iso(_now())
            _write_json(_signature_path(document_id), signature_payload)

            if len(witnesses) >= 2 and not document.signed_at:
                document.signed_at = _now()
                document.signed_by = current_user["id"]
                _sync_case_lifecycle_after_document_event(
                    db,
                    document=document,
                    lifecycle_status="SIGNED_OR_VERIFIED",
                    workflow_case_status=POLICY_CASE_STATUSES["signed_or_verified"],
                )

            _write_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=document.case_id,
                action="document_witness_signed",
                details=f"Witness signature captured for document {document_id} ({document.template_key})",
            )
            db.commit()
            db.refresh(document)
            return _serialize_generated_document(document)
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def send_document_otp(
        self,
        *,
        tenant_id: str,
        document_id: str,
        payload: Dict[str, Any],
        current_user: Dict[str, Any],
    ) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            document = (
                db.query(DischargeWorkflowDocument)
                .filter(
                    DischargeWorkflowDocument.id == document_id,
                    DischargeWorkflowDocument.tenant_id == tenant_id,
                )
                .first()
            )
            if not document:
                raise ValueError("Document not found")

            raw_phone_number = str(payload.get("phoneNumber") or payload.get("phone_number") or "").strip()
            if not raw_phone_number:
                raise ValueError("phoneNumber is required")
            phone_number = _normalize_phone_number(raw_phone_number)

            otp_path = _otp_path(document_id)
            existing_state = _load_json(otp_path)
            now = _now()
            resend_available_at = _parse_iso(existing_state.get("resendAvailableAt"))
            if resend_available_at and resend_available_at > now:
                _write_audit(
                    db,
                    tenant_id=tenant_id,
                    user_id=current_user["id"],
                    case_id=document.case_id,
                    action="document_otp_resend_blocked",
                    details=f"OTP resend blocked for document {document_id} ({document.template_key})",
                )
                db.commit()
                raise ValueError("OTP resend is temporarily blocked. Please wait before requesting a new code.")

            dispatch = self.sms_provider.send_otp(
                phone_number,
                case_id=document.case_id,
                document_type=document.template_key,
            )

            expires_at = (_parse_iso(dispatch.otp_sent_at) or now) + timedelta(seconds=OTP_TTL_SECONDS)
            resend_available_at = (_parse_iso(dispatch.otp_sent_at) or now) + timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS)

            otp_payload = {
                "documentId": document_id,
                "challengeId": dispatch.challenge_id,
                "deliveryStatus": dispatch.delivery_status,
                "provider": dispatch.provider,
                "stubMode": dispatch.stub_mode,
                "maskedPhone": self.sms_provider.mask_phone_number(phone_number),
                "sentAt": dispatch.otp_sent_at,
                "expiresAt": _iso(expires_at),
                "resendAvailableAt": _iso(resend_available_at),
                "sentBy": {
                    "userId": current_user["id"],
                    "userRole": current_user.get("role"),
                },
                "otpCodeHash": self.sms_provider.hash_code(dispatch.otp_debug_code or ""),
                "verified": False,
                "verifiedAt": None,
                "attemptCount": 0,
                "maxRetries": OTP_MAX_RETRIES,
                "locked": False,
                "lockedAt": None,
                "invalidatedAt": None,
                "invalidationReason": None,
            }
            _write_json(otp_path, otp_payload)

            _write_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=document.case_id,
                action="document_otp_issued",
                details=f"OTP issued for document {document_id} ({document.template_key}) challenge {dispatch.challenge_id}",
            )
            _write_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=document.case_id,
                action="document_otp_sent",
                details=f"OTP sent for document {document_id} ({document.template_key}) challenge {dispatch.challenge_id}",
            )
            db.commit()
            result = {
                "documentId": document_id,
                "challengeId": dispatch.challenge_id,
                "deliveryStatus": dispatch.delivery_status,
                "maskedPhone": otp_payload["maskedPhone"],
                "fallbackMode": bool(dispatch.stub_mode),
            }
            if EXPOSE_DEBUG_OTP and dispatch.stub_mode:
                result["otpDebugCode"] = dispatch.otp_debug_code
            return result
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def verify_document_otp(
        self,
        *,
        tenant_id: str,
        document_id: str,
        payload: Dict[str, Any],
        current_user: Dict[str, Any],
    ) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            document = (
                db.query(DischargeWorkflowDocument)
                .filter(
                    DischargeWorkflowDocument.id == document_id,
                    DischargeWorkflowDocument.tenant_id == tenant_id,
                )
                .first()
            )
            if not document:
                raise ValueError("Document not found")

            otp_path = _otp_path(document_id)
            otp_state = _load_json(otp_path)
            submitted = str(payload.get("otpCode") or payload.get("otp_code") or "").strip()
            if not submitted:
                raise ValueError("otpCode is required")
            if not submitted.isdigit() or len(submitted) != 6:
                raise ValueError("otpCode must be a 6-digit code")

            if not otp_state or not otp_state.get("otpCodeHash"):
                raise ValueError("OTP challenge not found. Please request a new OTP.")

            now = _now()
            if _otp_is_expired(otp_state, now=now):
                otp_state["locked"] = True
                otp_state["lockedAt"] = otp_state.get("lockedAt") or _iso(now)
                otp_state["invalidatedAt"] = otp_state.get("invalidatedAt") or _iso(now)
                otp_state["invalidationReason"] = "expired"
                _write_json(otp_path, otp_state)
                _write_audit(
                    db,
                    tenant_id=tenant_id,
                    user_id=current_user["id"],
                    case_id=document.case_id,
                    action="document_otp_expired",
                    details=f"Expired OTP rejected for document {document_id} ({document.template_key})",
                )
                db.commit()
                raise ValueError("OTP expired. Please request a new OTP.")

            if bool(otp_state.get("verified")) or bool(otp_state.get("invalidatedAt")):
                _write_audit(
                    db,
                    tenant_id=tenant_id,
                    user_id=current_user["id"],
                    case_id=document.case_id,
                    action="document_otp_replay_blocked",
                    details=f"OTP replay blocked for document {document_id} ({document.template_key})",
                )
                db.commit()
                raise ValueError("OTP already used. Please request a new OTP.")

            max_retries = int(otp_state.get("maxRetries") or OTP_MAX_RETRIES)
            attempt_count = int(otp_state.get("attemptCount") or 0)
            if bool(otp_state.get("locked")) or attempt_count >= max_retries:
                otp_state["locked"] = True
                otp_state["lockedAt"] = otp_state.get("lockedAt") or _iso(_now())
                _write_json(otp_path, otp_state)
                raise ValueError("OTP attempts exceeded. Please request a new OTP.")

            expected_hash = str(otp_state.get("otpCodeHash") or "")
            verified = bool(expected_hash) and self.sms_provider.verify_otp(
                submitted_code=submitted,
                expected_hash=expected_hash,
            )

            if not verified:
                attempt_count += 1
                otp_state["attemptCount"] = attempt_count
                if attempt_count >= max_retries:
                    otp_state["locked"] = True
                    otp_state["lockedAt"] = _iso(_now())
            else:
                otp_state["attemptCount"] = attempt_count
                otp_state["invalidatedAt"] = _iso(now)
                otp_state["invalidationReason"] = "verified"

            otp_state["verified"] = verified
            otp_state["verifiedAt"] = _iso(now) if verified else None
            _write_json(otp_path, otp_state)

            signature_payload = _load_json(_signature_path(document_id))
            signature_payload["otpVerified"] = verified
            signature_payload["otpVerification"] = {
                "challengeId": otp_state.get("challengeId"),
                "verifiedAt": otp_state.get("verifiedAt"),
                "verifiedBy": {
                    "userId": current_user["id"],
                    "userRole": current_user.get("role"),
                },
            }
            signature_payload["updatedAt"] = _iso(_now())
            _write_json(_signature_path(document_id), signature_payload)

            if verified:
                _sync_case_lifecycle_after_document_event(
                    db,
                    document=document,
                    lifecycle_status="SIGNED_OR_VERIFIED",
                    workflow_case_status=POLICY_CASE_STATUSES["signed_or_verified"],
                )

            _write_audit(
                db,
                tenant_id=tenant_id,
                user_id=current_user["id"],
                case_id=document.case_id,
                action="document_otp_verified" if verified else "document_otp_verification_failed",
                details=f"OTP verification for document {document_id} ({document.template_key}): {verified}",
            )
            db.commit()
            return {
                "documentId": document_id,
                "verified": verified,
                "verifiedAt": otp_state.get("verifiedAt"),
            }
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def list_case_documents(self, *, tenant_id: str, case_id: str) -> Dict[str, Any]:
        raw_documents = list_case_documents(tenant_id=tenant_id, case_id=case_id)
        document_ids = [str(item.get("id")) for item in raw_documents if item.get("id")]

        documents: List[Dict[str, Any]] = []
        for document_id in document_ids:
            document = get_document_record(tenant_id=tenant_id, document_id=document_id)
            documents.append(_serialize_generated_document(document))

        return {"documents": documents}

    def list_case_audit_log(self, *, tenant_id: str, case_id: str) -> Dict[str, Any]:
        logs = list_audit_logs_for_case(tenant_id=tenant_id, case_id=case_id)
        if logs is None:
            raise ValueError("Case not found")
        return {"auditEvents": logs}
