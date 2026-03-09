from __future__ import annotations

import json
import textwrap
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from backend.discharge.home_healthcare.homecare_agreement_pdf import generate_homecare_agreement_pdf
from backend.discharge.home_healthcare.homecare_workflow import persist_homecare_case_record
from backend.core.database import SessionLocal
from backend.forms.workflow_templates import WORKFLOW_TEMPLATES
from backend.models.audit_log import AuditLog
from backend.models.discharge_case import DischargeCase
from backend.models.discharge_workflow import DischargeRefusalWorkflow
from backend.models.patient import Patient
from backend.models.workflow_document import DischargeWorkflowDocument
from backend.signature.acknowledgment_engine import AcknowledgmentEngine, AcknowledgmentMethod
from backend.signature.evidence.evidence_bundle_builder import EvidenceBundleBuilder, stable_hash
from backend.signature.providers.nafath_provider import NafathProvider
from backend.signature.providers.sms_otp_provider import SmsOtpProvider
from backend.signature.providers.tablet_signature_provider import TabletSignatureProvider

SESSION_DIR = Path("backend/generated/signature_sessions")
SESSION_DIR.mkdir(parents=True, exist_ok=True)
FINAL_DOCS_DIR = Path("backend/generated/signed_documents")
FINAL_DOCS_DIR.mkdir(parents=True, exist_ok=True)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _iso_now() -> str:
    return _utc_now().isoformat()


def _method_public_name(method: AcknowledgmentMethod) -> str:
    return method.value.lower()


def _session_path(session_id: str) -> Path:
    return SESSION_DIR / f"{session_id}.json"


def _normalize_document_type(document_type: str) -> str:
    normalized = (document_type or "").strip().lower()
    if normalized in {"discharge_refusal_form", "medical_discharge_refusal_form"}:
        return "discharge_refusal_form"
    if normalized in {"financial_responsibility_notice", "financial_notice"}:
        return "financial_responsibility_notice"
    if normalized in {"home_healthcare_agreement", "home_healthcare", "hhc_pdn_agreement"}:
        return "home_healthcare_agreement"
    raise ValueError("Unsupported document type")


def _template_version_for(template_key: str) -> str:
    if template_key == "discharge_refusal_form":
        return "IMC-PAT-DIS-REF-01"
    if template_key == "financial_responsibility_notice":
        return "IMC-PAT-DIS-NOT-01"
    if template_key == "home_healthcare_agreement":
        return "IMC-HHC-PDN-01"
    return "1.0"


def _is_homecare(document_type: str) -> bool:
    return document_type == "home_healthcare_agreement"


def _ensure_workflow(db, *, discharge_case: DischargeCase, patient: Patient) -> DischargeRefusalWorkflow:
    workflow = (
        db.query(DischargeRefusalWorkflow)
        .filter(DischargeRefusalWorkflow.case_id == discharge_case.id)
        .first()
    )
    if workflow:
        return workflow

    workflow = DischargeRefusalWorkflow(
        case_id=discharge_case.id,
        tenant_id=discharge_case.tenant_id,
        patient_name=patient.full_name,
        medical_record_number=patient.mrn,
        refusal_reason=discharge_case.refusal_reason,
        workflow_type="discharge_refusal",
        status="active",
        current_stage="refusal_form",
        created_at=_utc_now(),
        updated_at=_utc_now(),
    )
    db.add(workflow)
    db.flush()
    return workflow


def _write_audit(
    db,
    *,
    tenant_id: str,
    user_id: str,
    case_id: str,
    action: str,
    details: Dict[str, Any],
) -> str:
    event = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        entity_type="discharge_case",
        entity_id=case_id,
        action=action,
        details=json.dumps(details, sort_keys=True, ensure_ascii=True),
        created_at=_utc_now(),
    )
    db.add(event)
    db.flush()
    return event.id


def _save_session(session: Dict[str, Any]) -> None:
    path = _session_path(session["session_id"])
    path.write_text(json.dumps(session, indent=2, ensure_ascii=True), encoding="utf-8")


def _append_session_event(session: Dict[str, Any], *, action: str, status: str, details: Dict[str, Any]) -> None:
    event = {
        "event_at": _iso_now(),
        "action": action,
        "status": status,
        "details": details,
    }
    session.setdefault("event_log", []).append(event)


def _load_session(session_id: str) -> Dict[str, Any]:
    path = _session_path(session_id)
    if not path.exists():
        raise ValueError("Acknowledgment session not found")
    return json.loads(path.read_text(encoding="utf-8"))


def _build_template_context(
    *,
    discharge_case: DischargeCase,
    patient: Patient,
    workflow: DischargeRefusalWorkflow,
    payload: Dict[str, Any],
) -> Dict[str, str]:
    return {
        "case_id": discharge_case.id,
        "patient_name": str(payload.get("patient_name") or workflow.patient_name or patient.full_name or ""),
        "patient_id_number": str(payload.get("patient_id_number") or workflow.patient_id_number or ""),
        "medical_record_number": str(payload.get("medical_record_number") or workflow.medical_record_number or patient.mrn or ""),
        "room_number": str(payload.get("room_number") or workflow.room_number or ""),
        "attending_physician": str(payload.get("attending_physician") or workflow.attending_physician or ""),
        "refusal_reason": str(payload.get("refusal_reason") or workflow.refusal_reason or discharge_case.refusal_reason or ""),
        "discussion_summary": str(payload.get("discussion_summary") or workflow.discussion_summary or ""),
        "social_administrative_interventions": str(payload.get("social_administrative_interventions") or ""),
        "forms_issued": str(payload.get("forms_issued") or ""),
        "discharge_decision_at": str(payload.get("discharge_decision_at") or workflow.discharge_decision_at or ""),
        "financial_notice_generated_at": _iso_now(),
        "generated_at": _iso_now(),
        "reference_number": f"ACK-{discharge_case.id[:8]}-{_utc_now().strftime('%Y%m%d%H%M')}",
        "urn": str(payload.get("urn") or payload.get("medical_record_number") or workflow.medical_record_number or patient.mrn or ""),
        "current_location": str(payload.get("current_location") or ""),
        "legal_guardian": str(payload.get("legal_guardian") or payload.get("guardian_name") or ""),
        "relationship": str(payload.get("relationship") or ""),
        "guardian_id": str(payload.get("guardian_id") or ""),
        "date": str(payload.get("date") or _utc_now().strftime("%Y-%m-%d")),
        "timestamp": _iso_now(),
        "verification_method": str(payload.get("verification_method") or ""),
    }


def _write_final_html(case_id: str, template_key: str, html_content: str) -> tuple[str, str]:
    target_dir = FINAL_DOCS_DIR / case_id
    target_dir.mkdir(parents=True, exist_ok=True)
    stamp = _utc_now().strftime("%Y%m%d%H%M%S")
    file_name = f"{template_key}_signed_{stamp}.html"
    path = target_dir / file_name
    path.write_text(html_content, encoding="utf-8")
    return file_name, str(path)


def _try_write_pdf(case_id: str, template_key: str, html_content: str) -> Optional[tuple[str, str]]:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
    except Exception:
        return None

    text_only = " ".join(part.strip() for part in html_content.replace("<", " <").split(">") if "<" not in part)
    text_only = " ".join(text_only.split())

    target_dir = FINAL_DOCS_DIR / case_id
    target_dir.mkdir(parents=True, exist_ok=True)
    stamp = _utc_now().strftime("%Y%m%d%H%M%S")
    file_name = f"{template_key}_signed_{stamp}.pdf"
    path = target_dir / file_name

    c = canvas.Canvas(str(path), pagesize=A4)
    width, height = A4
    x = 40
    y = height - 40
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x, y, "WathiqCare Legal Acknowledgment")
    y -= 24
    c.setFont("Helvetica", 9)
    for line in textwrap.wrap(text_only, width=110):
        if y < 40:
            c.showPage()
            c.setFont("Helvetica", 9)
            y = height - 40
        c.drawString(x, y, line)
        y -= 12

    c.save()
    return file_name, str(path)


class SignatureProofService:
    def __init__(self):
        self.sms_provider = SmsOtpProvider()
        self.nafath_provider = NafathProvider()
        self.tablet_provider = TabletSignatureProvider()
        self.engine = AcknowledgmentEngine(
            {
                AcknowledgmentMethod.SMS_OTP: self.sms_provider,
                AcknowledgmentMethod.NAFATH: self.nafath_provider,
                AcknowledgmentMethod.TABLET_SIGNATURE: self.tablet_provider,
            }
        )
        self.evidence_builder = EvidenceBundleBuilder()

    def list_methods(self) -> list[Dict[str, Any]]:
        return [
            {
                "method": _method_public_name(item.method),
                "legacy_method": item.method.value,
                "available": item.available,
                "label_ar": item.label_ar,
                "reason": item.reason,
            }
            for item in self.engine.list_methods()
        ]

    def start_acknowledgment(
        self,
        *,
        tenant_id: str,
        case_id: str,
        document_type: str,
        method: str,
        payload: Dict[str, Any],
        current_user: Dict[str, Any],
    ) -> Dict[str, Any]:
        template_key = _normalize_document_type(document_type)
        template = WORKFLOW_TEMPLATES[template_key]
        selected_method = AcknowledgmentMethod.parse(method)

        db = SessionLocal()
        try:
            row = (
                db.query(DischargeCase, Patient)
                .join(Patient, Patient.id == DischargeCase.patient_id)
                .filter(DischargeCase.tenant_id == tenant_id, DischargeCase.id == case_id)
                .first()
            )
            if not row:
                raise ValueError("Case not found")

            discharge_case, patient = row
            workflow = _ensure_workflow(db, discharge_case=discharge_case, patient=patient)
            context = _build_template_context(
                discharge_case=discharge_case,
                patient=patient,
                workflow=workflow,
                payload=payload,
            )
            html_content = template.renderer(context)
            document_hash = stable_hash(html_content)

            session_id = str(uuid.uuid4())
            session: Dict[str, Any] = {
                "session_id": session_id,
                "case_id": case_id,
                "tenant_id": tenant_id,
                "document_type": template_key,
                "template_version": _template_version_for(template_key),
                "document_hash": document_hash,
                "acknowledgment_method": selected_method.value,
                "patient_name": context.get("patient_name"),
                "patient_id_number": context.get("patient_id_number"),
                "medical_record_number": context.get("medical_record_number"),
                "verification_status": "pending",
                "created_at": _iso_now(),
                "updated_at": _iso_now(),
                "provider_result": {},
                "proof_metadata": {
                    "verification_method": selected_method.value,
                    "result_status": "pending",
                },
                "audit_event_ids": [],
                "event_log": [],
                "rendered_html": html_content,
                "context": context,
            }

            if _is_homecare(template_key):
                session["case_record_metadata"] = {
                    "case_id": case_id,
                    "document_type": "home_healthcare_agreement",
                    "signature_method": selected_method.value,
                    "signed_at": None,
                    "guardian_name": context.get("legal_guardian") or "",
                    "guardian_id": context.get("guardian_id") or "",
                    "pdf_path": None,
                }

            viewed_action = "agreement_viewed" if _is_homecare(template_key) else "form_viewed"
            sent_action = "agreement_sent_for_signature" if _is_homecare(template_key) else "acknowledgment_method_selected"

            _append_session_event(
                session,
                action=viewed_action,
                status="success",
                details={"document_type": template_key},
            )
            _append_session_event(
                session,
                action=sent_action,
                status="success",
                details={"method": selected_method.value},
            )

            audit_ids = [
                _write_audit(
                    db,
                    tenant_id=tenant_id,
                    user_id=current_user["id"],
                    case_id=case_id,
                    action=viewed_action,
                    details={"document_type": template_key, "session_id": session_id},
                ),
                _write_audit(
                    db,
                    tenant_id=tenant_id,
                    user_id=current_user["id"],
                    case_id=case_id,
                    action=sent_action,
                    details={"method": selected_method.value, "session_id": session_id},
                ),
            ]

            if selected_method == AcknowledgmentMethod.SMS_OTP:
                phone_number = str(payload.get("phone_number") or "").strip()
                if not phone_number:
                    raise ValueError("phone_number is required for SMS OTP")
                dispatch = self.sms_provider.send_otp(phone_number, case_id=case_id, document_type=template_key)
                if dispatch.otp_debug_code:
                    session["otp_code_hash"] = self.sms_provider.hash_code(dispatch.otp_debug_code)
                session["phone_number_masked"] = self.sms_provider.mask_phone_number(phone_number)
                session["otp_sent_at"] = dispatch.otp_sent_at
                session["provider_result"] = {
                    "delivery_status": dispatch.delivery_status,
                    "challenge_id": dispatch.challenge_id,
                    "provider": dispatch.provider,
                    "stub_mode": dispatch.stub_mode,
                    "otp_debug_code": dispatch.otp_debug_code,
                }
                session["proof_metadata"].update(
                    {
                        "phone_number_masked": session["phone_number_masked"],
                        "otp_sent_at": dispatch.otp_sent_at,
                        "delivery_status": dispatch.delivery_status,
                        "challenge_id": dispatch.challenge_id,
                    }
                )
                _append_session_event(
                    session,
                    action="sms_otp_sent",
                    status="success",
                    details={
                        "challenge_id": dispatch.challenge_id,
                        "delivery_status": dispatch.delivery_status,
                    },
                )
                audit_ids.append(
                    _write_audit(
                        db,
                        tenant_id=tenant_id,
                        user_id=current_user["id"],
                        case_id=case_id,
                        action="sms_otp_sent",
                        details={
                            "session_id": session_id,
                            "challenge_id": dispatch.challenge_id,
                            "delivery_status": dispatch.delivery_status,
                        },
                    )
                )

            elif selected_method == AcknowledgmentMethod.NAFATH:
                start = self.nafath_provider.start_verification(
                    case_id=case_id,
                    document_type=template_key,
                    national_id=str(payload.get("patient_id_number") or context.get("patient_id_number") or "") or None,
                )
                session["provider_result"] = {
                    "request_id": start.request_id,
                    "status": start.status,
                    "provider": start.provider,
                }
                session["verification_status"] = "unavailable" if start.status == "unavailable" else "pending"
                session["proof_metadata"].update(
                    {
                        "nafath_request_id": start.request_id,
                        "nafath_initiated_at": start.initiated_at,
                        "nafath_status": start.status,
                    }
                )
                _append_session_event(
                    session,
                    action="nafath_verification_started",
                    status="success" if start.status != "unavailable" else "unavailable",
                    details={"request_id": start.request_id, "status": start.status},
                )
                audit_ids.append(
                    _write_audit(
                        db,
                        tenant_id=tenant_id,
                        user_id=current_user["id"],
                        case_id=case_id,
                        action="nafath_verification_started",
                        details={"session_id": session_id, "request_id": start.request_id, "status": start.status},
                    )
                )

            elif selected_method == AcknowledgmentMethod.TABLET_SIGNATURE:
                session["verification_status"] = "awaiting_signature"
                session["provider_result"] = {"device_source": "TABLET"}
                session["proof_metadata"].update({"device_source": "TABLET"})
                _append_session_event(
                    session,
                    action="tablet_signature_started",
                    status="success",
                    details={"device_source": "TABLET"},
                )
                audit_ids.append(
                    _write_audit(
                        db,
                        tenant_id=tenant_id,
                        user_id=current_user["id"],
                        case_id=case_id,
                        action="tablet_signature_started",
                        details={"session_id": session_id},
                    )
                )

            session["audit_event_ids"] = audit_ids
            _save_session(session)
            db.commit()
            return {
                "session_id": session_id,
                "verification_status": session["verification_status"],
                "provider_result": session["provider_result"],
                "available_methods": self.list_methods(),
            }
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def verify_acknowledgment(
        self,
        *,
        tenant_id: str,
        case_id: str,
        session_id: str,
        payload: Dict[str, Any],
        current_user: Dict[str, Any],
    ) -> Dict[str, Any]:
        session = _load_session(session_id)
        if session["tenant_id"] != tenant_id or session["case_id"] != case_id:
            raise ValueError("Acknowledgment session does not match case or tenant")

        selected_method = AcknowledgmentMethod.parse(session["acknowledgment_method"])

        verification_timestamp = _iso_now()
        session.setdefault("proof_metadata", {}).update(
            {
                "timestamp": verification_timestamp,
                "device": str(payload.get("device") or payload.get("device_source") or "unknown"),
                "ip_address": str(payload.get("ip_address") or "unknown"),
            }
        )

        verified = False
        verification_result: Dict[str, Any] = {}

        if selected_method == AcknowledgmentMethod.SMS_OTP:
            submitted = str(payload.get("otp_code") or "").strip()
            if not submitted:
                raise ValueError("otp_code is required")
            expected_hash = str(session.get("otp_code_hash") or "")
            verified = bool(expected_hash) and self.sms_provider.verify_otp(submitted_code=submitted, expected_hash=expected_hash)
            verification_result = {
                "verified": verified,
                "verification_method": "SMS_OTP",
                "otp_verified_at": verification_timestamp if verified else None,
            }
            session["proof_metadata"].update(
                {
                    "verification_method": "SMS_OTP",
                    "otp_verified_at": verification_result.get("otp_verified_at"),
                    "result_status": "verified" if verified else "failed",
                }
            )
            _append_session_event(
                session,
                action="sms_otp_verified" if verified else "sms_otp_verification_failed",
                status="success" if verified else "failed",
                details={"verification_method": "SMS_OTP"},
            )

        elif selected_method == AcknowledgmentMethod.NAFATH:
            request_id = str(session.get("provider_result", {}).get("request_id") or "")
            verification_result = self.nafath_provider.verify(request_id=request_id, payload=payload)
            verified = bool(verification_result.get("verified"))
            session["proof_metadata"].update(
                {
                    "verification_method": "NAFATH",
                    "nafath_request_id": request_id,
                    "nafath_status": verification_result.get("status"),
                    "result_status": "verified" if verified else "pending",
                    "verified_at": verification_result.get("verified_at"),
                }
            )
            _append_session_event(
                session,
                action="nafath_verification_completed",
                status="success" if verified else str(verification_result.get("status") or "pending"),
                details={"request_id": request_id, "status": verification_result.get("status")},
            )

        elif selected_method == AcknowledgmentMethod.TABLET_SIGNATURE:
            signature_payload = str(payload.get("signature_payload") or "").strip()
            verification_result = self.tablet_provider.capture_signature(
                signature_payload=signature_payload,
                witness_name=str(payload.get("witness_name") or "").strip() or None,
                operator_id=current_user.get("id"),
            )
            verified = bool(verification_result.get("verified"))
            session["proof_metadata"].update(
                {
                    "verification_method": "TABLET_SIGNATURE",
                    "signature_hash": verification_result.get("signature_hash"),
                    "signed_at": verification_result.get("signed_at"),
                    "device_source": verification_result.get("device_source"),
                    "witness_name": verification_result.get("witness_name"),
                    "result_status": "verified" if verified else "failed",
                }
            )
            _append_session_event(
                session,
                action="tablet_signature_captured" if verified else "tablet_signature_failed",
                status="success" if verified else "failed",
                details={"device_source": verification_result.get("device_source")},
            )

        session["provider_result"] = {**session.get("provider_result", {}), **verification_result}
        if not session["proof_metadata"].get("signature_hash"):
            session["proof_metadata"]["signature_hash"] = stable_hash(
                json.dumps(
                    {
                        "session_id": session_id,
                        "verification_method": session["proof_metadata"].get("verification_method"),
                        "timestamp": verification_timestamp,
                        "provider_result": verification_result,
                    },
                    sort_keys=True,
                    ensure_ascii=True,
                )
            )
        session["verification_status"] = "verified" if verified else "pending"
        session["updated_at"] = _iso_now()

        if not verified:
            db = SessionLocal()
            try:
                failure_action = {
                    AcknowledgmentMethod.SMS_OTP: "sms_otp_verification_failed",
                    AcknowledgmentMethod.NAFATH: "nafath_verification_completed",
                    AcknowledgmentMethod.TABLET_SIGNATURE: "tablet_signature_failed",
                }[selected_method]
                _write_audit(
                    db,
                    tenant_id=tenant_id,
                    user_id=current_user["id"],
                    case_id=case_id,
                    action=failure_action,
                    details={
                        "session_id": session_id,
                        "verification_status": session["verification_status"],
                        "provider_result": session["provider_result"],
                    },
                )
                db.commit()
            finally:
                db.close()
            _save_session(session)
            return {
                "session_id": session_id,
                "verification_status": session["verification_status"],
                "provider_result": session["provider_result"],
                "proof_metadata": session.get("proof_metadata"),
            }

        db = SessionLocal()
        try:
            row = (
                db.query(DischargeCase, Patient)
                .join(Patient, Patient.id == DischargeCase.patient_id)
                .filter(DischargeCase.tenant_id == tenant_id, DischargeCase.id == case_id)
                .first()
            )
            if not row:
                raise ValueError("Case not found")
            discharge_case, patient = row
            workflow = _ensure_workflow(db, discharge_case=discharge_case, patient=patient)

            html_content = str(session.get("rendered_html") or "")
            document_type = str(session.get("document_type") or "")
            template = WORKFLOW_TEMPLATES[document_type]

            html_file_name, html_file_path = _write_final_html(case_id, document_type, html_content)
            if _is_homecare(document_type):
                context_with_proof = {
                    **(session.get("context") or {}),
                    "verification_method": selected_method.value,
                    "timestamp": _iso_now(),
                }
                pdf_info = generate_homecare_agreement_pdf(
                    case_id=case_id,
                    output_root=str(FINAL_DOCS_DIR),
                    context=context_with_proof,
                )
            else:
                pdf_info = _try_write_pdf(case_id, document_type, html_content)
            pdf_path = pdf_info[1] if pdf_info else None

            document = DischargeWorkflowDocument(
                workflow_id=workflow.id,
                case_id=case_id,
                tenant_id=tenant_id,
                generated_by=current_user["id"],
                template_key=document_type,
                document_code=template.document_code,
                title=template.title,
                file_name=html_file_name,
                file_path=html_file_path,
                html_content=html_content,
                generated_at=_utc_now(),
            )
            db.add(document)

            if document_type == "discharge_refusal_form":
                workflow.refusal_form_generated_at = _utc_now()
                workflow.current_stage = "official_notification"
            elif document_type == "financial_responsibility_notice":
                workflow.financial_notice_generated_at = _utc_now()
                workflow.current_stage = "escalation"

            workflow.updated_at = _utc_now()
            db.flush()

            audit_ids = list(session.get("audit_event_ids") or [])
            if selected_method == AcknowledgmentMethod.SMS_OTP:
                audit_ids.append(
                    _write_audit(
                        db,
                        tenant_id=tenant_id,
                        user_id=current_user["id"],
                        case_id=case_id,
                        action="sms_otp_verified",
                        details={"session_id": session_id, "verified": True},
                    )
                )
            elif selected_method == AcknowledgmentMethod.NAFATH:
                audit_ids.append(
                    _write_audit(
                        db,
                        tenant_id=tenant_id,
                        user_id=current_user["id"],
                        case_id=case_id,
                        action="nafath_verification_completed",
                        details={"session_id": session_id, "verified": True},
                    )
                )
            elif selected_method == AcknowledgmentMethod.TABLET_SIGNATURE:
                audit_ids.append(
                    _write_audit(
                        db,
                        tenant_id=tenant_id,
                        user_id=current_user["id"],
                        case_id=case_id,
                        action="tablet_signature_captured",
                        details={"session_id": session_id, "verified": True},
                    )
                )

            if _is_homecare(document_type):
                audit_ids.append(
                    _write_audit(
                        db,
                        tenant_id=tenant_id,
                        user_id=current_user["id"],
                        case_id=case_id,
                        action="signature_verified",
                        details={
                            "session_id": session_id,
                            "verification_method": selected_method.value,
                            "verified": True,
                        },
                    )
                )

            evidence_payload = {
                "case_id": case_id,
                "document_type": document_type,
                "template_version": session.get("template_version"),
                "exact_text_hash": session.get("document_hash"),
                "acknowledgment_method": selected_method.value,
                "patient_name": session.get("patient_name"),
                "patient_id": session.get("patient_id_number"),
                "phone_number_masked": session.get("phone_number_masked"),
                "verified_at": _iso_now(),
                "provider_result": session.get("provider_result"),
                "staff_context": {
                    "user_id": current_user.get("id"),
                    "user_email": current_user.get("email"),
                    "user_role": current_user.get("role"),
                    "witness_name": payload.get("witness_name"),
                },
                "device_session_metadata": {
                    "device_source": "TABLET" if selected_method == AcknowledgmentMethod.TABLET_SIGNATURE else "WEB",
                    "session_id": session_id,
                },
                "pdf_path": pdf_path,
                "html_path": html_file_path,
                "workflow_document_id": document.id,
                "audit_event_ids": audit_ids,
                "verification_result_status": "verified",
                "proof_metadata": session.get("proof_metadata"),
                "event_log": session.get("event_log"),
            }

            evidence_bundle = self.evidence_builder.build(evidence_payload)
            evidence_path = self.evidence_builder.persist(
                case_id=case_id,
                session_id=session_id,
                evidence=evidence_bundle,
            )

            audit_ids.append(
                _write_audit(
                    db,
                    tenant_id=tenant_id,
                    user_id=current_user["id"],
                    case_id=case_id,
                    action="evidence_bundle_created",
                    details={"session_id": session_id, "evidence_path": evidence_path},
                )
            )
            audit_ids.append(
                _write_audit(
                    db,
                    tenant_id=tenant_id,
                    user_id=current_user["id"],
                    case_id=case_id,
                    action="pdf_generated",
                    details={"session_id": session_id, "pdf_path": pdf_path, "html_path": html_file_path},
                )
            )
            audit_ids.append(
                _write_audit(
                    db,
                    tenant_id=tenant_id,
                    user_id=current_user["id"],
                    case_id=case_id,
                    action="document_attached_to_case",
                    details={"session_id": session_id, "document_id": document.id},
                )
            )

            session["audit_event_ids"] = audit_ids
            session["verification_status"] = "verified"
            session["verified_at"] = _iso_now()
            session["evidence_path"] = evidence_path
            session["workflow_document_id"] = document.id
            session["pdf_path"] = pdf_path
            session["html_path"] = html_file_path
            session.setdefault("proof_metadata", {})["result_status"] = "verified"
            session["proof_metadata"]["verified_at"] = session["verified_at"]

            if _is_homecare(document_type):
                case_record = {
                    "document_type": "home_healthcare_agreement",
                    "signature_method": selected_method.value,
                    "signed_at": session["verified_at"],
                    "guardian_name": session.get("context", {}).get("legal_guardian") or "",
                    "guardian_id": session.get("context", {}).get("guardian_id") or "",
                    "pdf_path": pdf_path,
                }
                case_record_path = persist_homecare_case_record(case_id, case_record)
                session["case_record_path"] = case_record_path
                session["case_record_metadata"] = case_record

            _save_session(session)
            db.commit()

            return {
                "session_id": session_id,
                "verification_status": "verified",
                "workflow_document_id": document.id,
                "evidence_path": evidence_path,
                "pdf_path": pdf_path,
                "html_path": html_file_path,
                "provider_result": session["provider_result"],
                "proof_metadata": session.get("proof_metadata"),
            }
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def get_session(self, *, session_id: str) -> Dict[str, Any]:
        return _load_session(session_id)
