from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
import hashlib
import json
import uuid
import zipfile
from pathlib import Path
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.models.discharge_case import DischargeCase
from backend.models.discharge_legal_workflow import (
    DischargeDecisionDocument,
    DischargeDecisionEvent,
    EscalationEvent,
    EvidencePackage,
    FinancialLiabilityAcknowledgmentInstance,
    HomeHealthcareAgreementInstance,
    LegalUndertakingInstance,
    MedicalEquipmentLeaseInstance,
    PatientNoticePresentation,
    PatientResponse,
    PromissoryNoteInstance,
    SignatureArtifact,
    SignerIdentity,
)
from backend.models.tenant import Tenant
from backend.core.pdf_renderer import render_html_to_pdf
from backend.services.audit_service import AuditService


LEGAL_STATES = {
    "DRAFT",
    "DECISION_ISSUED",
    "NOTICE_GENERATED",
    "NOTICE_PRESENTED",
    "PATIENT_ACCEPTED",
    "PATIENT_REFUSED",
    "REFUSED_TO_SIGN",
    "UNABLE_TO_SIGN",
    "ESCALATED",
    "PACKAGE_FINALIZED",
    "ARCHIVED",
}

ALLOWED_TRANSITIONS = {
    "DRAFT": {"DECISION_ISSUED"},
    "DECISION_ISSUED": {"NOTICE_GENERATED"},
    "NOTICE_GENERATED": {"NOTICE_PRESENTED"},
    "NOTICE_PRESENTED": {"PATIENT_ACCEPTED", "PATIENT_REFUSED", "REFUSED_TO_SIGN", "UNABLE_TO_SIGN"},
    "PATIENT_ACCEPTED": {"PACKAGE_FINALIZED"},
    "PATIENT_REFUSED": {"ESCALATED", "PACKAGE_FINALIZED"},
    "REFUSED_TO_SIGN": {"ESCALATED", "PACKAGE_FINALIZED"},
    "UNABLE_TO_SIGN": {"ESCALATED", "PACKAGE_FINALIZED"},
    "ESCALATED": {"PACKAGE_FINALIZED"},
    "PACKAGE_FINALIZED": {"ARCHIVED"},
    "ARCHIVED": set(),
}


@dataclass
class ActorContext:
    user_id: Optional[str]
    tenant_id: str
    user_name: str


class LegalOrchestrationService:
    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditService(db)

    def _get_case(self, tenant_id: str, case_id: str) -> DischargeCase:
        discharge_case = (
            self.db.query(DischargeCase)
            .filter(DischargeCase.tenant_id == tenant_id, DischargeCase.id == case_id)
            .first()
        )
        if not discharge_case:
            raise ValueError("Case not found in tenant scope")
        return discharge_case

    def _active_event(self, tenant_id: str, case_id: str) -> Optional[DischargeDecisionEvent]:
        return (
            self.db.query(DischargeDecisionEvent)
            .filter(
                DischargeDecisionEvent.tenant_id == tenant_id,
                DischargeDecisionEvent.case_id == case_id,
                DischargeDecisionEvent.status == "active",
            )
            .order_by(DischargeDecisionEvent.created_at.desc())
            .first()
        )

    def create_or_update_decision_event(
        self,
        *,
        tenant_id: str,
        case_id: str,
        payload: Dict[str, Any],
        actor: ActorContext,
    ) -> DischargeDecisionEvent:
        discharge_case = self._get_case(tenant_id, case_id)
        event = self._active_event(tenant_id, case_id)

        if event is None:
            event = DischargeDecisionEvent(
                tenant_id=tenant_id,
                case_id=case_id,
                patient_id=discharge_case.patient_id,
                mrn=payload.get("mrn") or discharge_case.mrn,
                encounter_number=payload.get("encounter_number"),
                admission_number=payload.get("admission_number"),
                discharge_order_number=payload.get("discharge_order_number"),
                physician_id=payload.get("physician_id"),
                physician_name=payload.get("physician_name") or discharge_case.attending_physician_name,
                department_unit=payload.get("department_unit") or discharge_case.department,
                diagnosis_summary=payload.get("diagnosis_summary") or discharge_case.discharge_plan_summary,
                clinical_summary_source_ref=payload.get("clinical_summary_source_ref"),
                decision_timestamp=_parse_dt(payload.get("decision_timestamp")) or datetime.utcnow(),
                source_system=payload.get("source_system", "manual"),
                sync_mode=payload.get("sync_mode", "manual"),
                created_by=actor.user_id,
                state_history=[
                    {
                        "from": None,
                        "to": "DRAFT",
                        "at": datetime.utcnow().isoformat(),
                        "by": actor.user_id,
                    }
                ],
                metadata_json=payload.get("metadata", {}),
            )
            self.db.add(event)
            self.db.flush()

        for attr in (
            "encounter_number",
            "admission_number",
            "discharge_order_number",
            "physician_name",
            "department_unit",
            "diagnosis_summary",
            "clinical_summary_source_ref",
            "source_system",
            "sync_mode",
        ):
            if payload.get(attr) is not None:
                setattr(event, attr, payload.get(attr))

        if payload.get("decision_timestamp"):
            event.decision_timestamp = _parse_dt(payload.get("decision_timestamp")) or event.decision_timestamp

        self.audit.log(
            case_id=case_id,
            task_id=None,
            actor_user_id=actor.user_id,
            event_type="legal_decision_event_upserted",
            event_title="Discharge legal decision event upserted",
            event_details="Created or updated discharge decision event",
            metadata_json={"event_id": event.id, "legal_state": event.legal_state},
        )
        self.db.commit()
        self.db.refresh(event)
        return event

    def transition_state(
        self,
        *,
        tenant_id: str,
        case_id: str,
        target_state: str,
        actor: ActorContext,
        reason: Optional[str] = None,
    ) -> DischargeDecisionEvent:
        if target_state not in LEGAL_STATES:
            raise ValueError("Invalid legal state")

        event = self._active_event(tenant_id, case_id)
        if not event:
            raise ValueError("No active legal decision event")

        current_state = event.legal_state
        if target_state not in ALLOWED_TRANSITIONS.get(current_state, set()):
            raise ValueError(f"Invalid transition from {current_state} to {target_state}")

        event.legal_state = target_state
        if target_state == "NOTICE_GENERATED":
            event.notification_state = "GENERATED"
        elif target_state == "NOTICE_PRESENTED":
            event.notification_state = "PRESENTED"
        elif target_state in {"PATIENT_ACCEPTED", "PATIENT_REFUSED", "REFUSED_TO_SIGN", "UNABLE_TO_SIGN"}:
            event.patient_response_state = target_state
        elif target_state == "ESCALATED":
            event.escalation_state = "ACTIVE"
        elif target_state == "PACKAGE_FINALIZED":
            event.final_package_state = "FINALIZED"
        elif target_state == "ARCHIVED":
            event.status = "archived"

        history = list(event.state_history or [])
        history.append(
            {
                "from": current_state,
                "to": target_state,
                "at": datetime.utcnow().isoformat(),
                "by": actor.user_id,
                "reason": reason,
            }
        )
        event.state_history = history

        self.audit.log(
            case_id=case_id,
            task_id=None,
            actor_user_id=actor.user_id,
            event_type="legal_state_transition",
            event_title=f"Legal state moved to {target_state}",
            event_details=reason,
            metadata_json={"event_id": event.id, "from": current_state, "to": target_state},
        )
        self.db.commit()
        self.db.refresh(event)
        return event

    def generate_master_document(
        self,
        *,
        tenant_id: str,
        case_id: str,
        payload: Dict[str, Any],
        actor: ActorContext,
    ) -> DischargeDecisionDocument:
        discharge_case = self._get_case(tenant_id, case_id)
        event = self._active_event(tenant_id, case_id)
        if not event:
            raise ValueError("No active legal decision event")

        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if tenant is None:
            raise ValueError("Tenant not found")

        legal_statement = {
            "ar": "صدر قرار الخروج الطبي من الفريق المعالج وتم إشعار المريض/من يمثله، واستمرار الإقامة بعد القرار قد يترتب عليه مسار قانوني ومالي وفق سياسة المنشأة.",
            "en": "The treating team has issued a discharge decision and informed the patient/representative. Continued stay after this decision may trigger legal and financial workflow per policy.",
        }

        doc_payload = {
            "hospital": {
                "logo_url": tenant.logo_url,
                "name_ar": tenant.name,
                "name_en": payload.get("tenant_name_en"),
                "moh_license": tenant.moh_license,
                "cr_number": tenant.cr_number,
                "address": tenant.address,
                "city": tenant.city,
                "po_box": tenant.po_box,
                "postal_code": tenant.postal_code,
                "phone": tenant.contact_phone,
                "email": tenant.contact_email,
            },
            "patient": {
                "name": discharge_case.patient_name,
                "mrn": discharge_case.mrn,
                "id_number": payload.get("id_number"),
                "dob": payload.get("dob"),
                "sex": payload.get("sex"),
                "encounter_no": event.encounter_number,
                "admission_date": payload.get("admission_date"),
                "decision_at": event.decision_timestamp.isoformat() if event.decision_timestamp else None,
                "ward_room_bed": payload.get("ward_room_bed") or discharge_case.room_number,
                "attending_consultant": event.physician_name,
                "specialty": discharge_case.department,
            },
            "medical": payload.get("medical", {}),
            "legal_statement": legal_statement,
            "notification": payload.get("notification", {}),
            "response": payload.get("response", {}),
            "signatures": payload.get("signatures", {}),
            "footer": {
                "electronic_statement": payload.get(
                    "electronic_statement",
                    "وثيقة مولدة إلكترونيا وتخضع لنظام التعاملات الإلكترونية السعودي.",
                ),
                "confidentiality_statement": payload.get(
                    "confidentiality_statement",
                    "هذه الوثيقة سرية ومخصصة للاستخدام الطبي والقانوني المعتمد.",
                ),
                "verification_code": payload.get("verification_code") or _short_code(),
            },
        }

        rendered_html = _render_master_document_html(doc_payload)
        doc_hash = hashlib.sha256(rendered_html.encode("utf-8")).hexdigest()

        pdf_file_name, pdf_url = _render_and_store_pdf(
            html_content=rendered_html,
            title="Master Discharge Decision Document",
            prefix=f"master_discharge_decision_{case_id}",
        )

        document = DischargeDecisionDocument(
            tenant_id=tenant_id,
            case_id=case_id,
            patient_id=discharge_case.patient_id,
            event_id=event.id,
            language=payload.get("language", "ar"),
            hospital_header_json=doc_payload["hospital"],
            patient_section_json=doc_payload["patient"],
            medical_section_json=doc_payload["medical"],
            legal_statement_json=doc_payload["legal_statement"],
            notification_section_json=doc_payload["notification"],
            response_section_json=doc_payload["response"],
            signature_section_json=doc_payload["signatures"],
            legal_footer_json=doc_payload["footer"],
            rendered_html=rendered_html,
            pdf_url=pdf_url,
            verification_code=doc_payload["footer"]["verification_code"],
            document_hash=doc_hash,
            status="generated",
            created_by=actor.user_id,
        )
        self.db.add(document)
        self.db.flush()

        self.transition_state(
            tenant_id=tenant_id,
            case_id=case_id,
            target_state="NOTICE_GENERATED",
            actor=actor,
            reason="Master discharge decision document generated",
        )

        self.audit.log(
            case_id=case_id,
            task_id=None,
            actor_user_id=actor.user_id,
            event_type="master_discharge_document_generated",
            event_title="Master discharge decision document generated",
            metadata_json={"document_id": document.id, "hash": doc_hash, "pdf_file": pdf_file_name},
        )
        self.db.commit()
        self.db.refresh(document)
        return document

    def record_notice_presentation(
        self,
        *,
        tenant_id: str,
        case_id: str,
        payload: Dict[str, Any],
        actor: ActorContext,
    ) -> PatientNoticePresentation:
        discharge_case = self._get_case(tenant_id, case_id)
        event = self._active_event(tenant_id, case_id)
        if not event:
            raise ValueError("No active legal decision event")

        opened_at = _parse_dt(payload.get("opened_at")) or datetime.utcnow()
        first_viewed_at = _parse_dt(payload.get("first_viewed_at")) or opened_at
        action_taken_at = _parse_dt(payload.get("action_taken_at"))
        if action_taken_at is None:
            action_taken_at = datetime.utcnow()

        presentation = PatientNoticePresentation(
            tenant_id=tenant_id,
            case_id=case_id,
            patient_id=discharge_case.patient_id,
            event_id=event.id,
            mode=payload.get("mode", "tablet"),
            language=payload.get("language", "ar"),
            notice_method=payload.get("notice_method", "in_person"),
            presenter_name=payload.get("presenter_name"),
            presenter_role=payload.get("presenter_role"),
            identity_verified=bool(payload.get("identity_verified", False)),
            interpreter_used=bool(payload.get("interpreter_used", False)),
            interpreter_name=payload.get("interpreter_name"),
            opened_at=opened_at,
            first_viewed_at=first_viewed_at,
            viewed_duration_seconds=float(payload.get("viewed_duration_seconds") or 0),
            action_taken_at=action_taken_at,
            device_info_json=payload.get("device_info", {}),
            session_reference=payload.get("session_reference") or str(uuid.uuid4()),
            document_type=payload.get("document_type"),
            document_instance_id=payload.get("document_instance_id"),
            presented_to_type=payload.get("presented_to_type", "patient"),
            presented_to_name=payload.get("presented_to_name"),
            presented_to_id_type=payload.get("presented_to_id_type"),
            presented_to_id_number=payload.get("presented_to_id_number"),
            acknowledged_view=bool(payload.get("acknowledged_view", False)),
            witness_name=payload.get("witness_name"),
            created_by=actor.user_id,
        )
        self.db.add(presentation)
        self.db.flush()

        self.transition_state(
            tenant_id=tenant_id,
            case_id=case_id,
            target_state="NOTICE_PRESENTED",
            actor=actor,
            reason="Formal notice was presented and logged",
        )

        self.audit.log(
            case_id=case_id,
            task_id=None,
            actor_user_id=actor.user_id,
            event_type="notice_presented",
            event_title="Patient notice presentation logged",
            metadata_json={"presentation_id": presentation.id, "mode": presentation.mode},
        )
        self.db.commit()
        self.db.refresh(presentation)
        return presentation

    def record_patient_response(
        self,
        *,
        tenant_id: str,
        case_id: str,
        payload: Dict[str, Any],
        actor: ActorContext,
    ) -> PatientResponse:
        discharge_case = self._get_case(tenant_id, case_id)
        event = self._active_event(tenant_id, case_id)
        if not event:
            raise ValueError("No active legal decision event")

        response_type = str(payload.get("response_type", "")).strip().lower()
        state_map = {
            "accepted_discharge": "PATIENT_ACCEPTED",
            "refused_discharge": "PATIENT_REFUSED",
            "refused_to_sign": "REFUSED_TO_SIGN",
            "unable_to_sign": "UNABLE_TO_SIGN",
            "guardian_representative_sign": "UNABLE_TO_SIGN",
        }
        target_state = state_map.get(response_type)
        if not target_state:
            raise ValueError("Invalid patient response type")

        if target_state == "PATIENT_REFUSED" and not payload.get("refusal_reason"):
            raise ValueError("Refusal reason is required when patient refuses discharge")

        if target_state == "UNABLE_TO_SIGN" and not payload.get("inability_reason"):
            raise ValueError("Inability reason is required for unable to sign")

        response = PatientResponse(
            tenant_id=tenant_id,
            case_id=case_id,
            patient_id=discharge_case.patient_id,
            event_id=event.id,
            response_type=response_type,
            refusal_reason=payload.get("refusal_reason"),
            refusal_narrative=payload.get("refusal_narrative"),
            inability_reason=payload.get("inability_reason"),
            requires_witness=bool(payload.get("requires_witness", target_state in {"PATIENT_REFUSED", "REFUSED_TO_SIGN"})),
            legally_sensitive=bool(payload.get("legally_sensitive", target_state in {"PATIENT_REFUSED", "REFUSED_TO_SIGN", "UNABLE_TO_SIGN"})),
            notes=payload.get("notes"),
            created_by=actor.user_id,
        )
        self.db.add(response)
        self.db.flush()

        signer = SignerIdentity(
            tenant_id=tenant_id,
            case_id=case_id,
            patient_id=discharge_case.patient_id,
            response_id=response.id,
            full_name=payload.get("signer_name") or discharge_case.patient_name or "Unknown",
            arabic_full_name=payload.get("signer_name_ar"),
            signer_type=payload.get("signer_type", "patient"),
            relationship_to_patient=payload.get("relationship_to_patient"),
            id_type=payload.get("id_type"),
            id_number=payload.get("id_number"),
            mobile_number=payload.get("mobile_number"),
            language_used=payload.get("language_used", "ar"),
            nationality=payload.get("nationality"),
            address=payload.get("address"),
            legal_capacity_indicator=payload.get("legal_capacity_indicator", "competent"),
            consent_confirmation_text_version=payload.get("consent_text_version"),
            witness_required=response.requires_witness,
            staff_present_json=payload.get("staff_present", {}),
            created_by=actor.user_id,
        )
        self.db.add(signer)
        self.db.flush()

        signature_payload = payload.get("signature_payload")
        if signature_payload:
            signature_hash = hashlib.sha256(signature_payload.encode("utf-8")).hexdigest()
            signature = SignatureArtifact(
                tenant_id=tenant_id,
                case_id=case_id,
                patient_id=discharge_case.patient_id,
                signer_identity_id=signer.id,
                document_ref=payload.get("document_ref"),
                signature_payload=signature_payload,
                signature_hash=signature_hash,
                document_version=payload.get("document_version", "1.0.0"),
                source_mode=payload.get("source_mode", "tablet"),
                witness_id=payload.get("witness_id"),
                created_by=actor.user_id,
            )
            self.db.add(signature)
            event.signature_state = "CAPTURED"
        else:
            event.signature_state = "PENDING"

        self.transition_state(
            tenant_id=tenant_id,
            case_id=case_id,
            target_state=target_state,
            actor=actor,
            reason=f"Patient response recorded: {response_type}",
        )

        if target_state in {"PATIENT_REFUSED", "REFUSED_TO_SIGN", "UNABLE_TO_SIGN"}:
            event.escalation_state = "PENDING_RULES"

        self.audit.log(
            case_id=case_id,
            task_id=None,
            actor_user_id=actor.user_id,
            event_type="patient_response_recorded",
            event_title="Patient response recorded",
            metadata_json={"response_id": response.id, "response_type": response_type},
        )
        self.db.commit()
        self.db.refresh(response)
        return response

    def create_financial_acknowledgment(
        self,
        *,
        tenant_id: str,
        case_id: str,
        payload: Dict[str, Any],
        actor: ActorContext,
    ) -> FinancialLiabilityAcknowledgmentInstance:
        discharge_case = self._get_case(tenant_id, case_id)
        event = self._active_event(tenant_id, case_id)
        if not event:
            raise ValueError("No active legal decision event")
        if event.legal_state not in {"PATIENT_REFUSED", "REFUSED_TO_SIGN", "UNABLE_TO_SIGN", "ESCALATED"}:
            raise ValueError("Financial acknowledgment is only allowed after refusal-related states")

        ack_payload = {
            "patient_name": discharge_case.patient_name,
            "mrn": discharge_case.mrn,
            "encounter_number": event.encounter_number,
            "discharge_decision_datetime": event.decision_timestamp.isoformat() if event.decision_timestamp else None,
            "responsible_physician": event.physician_name,
            "current_room": discharge_case.room_number,
            "guarantor": payload.get("guarantor"),
            "relation_to_patient": payload.get("relation_to_patient"),
            "insurer_name": payload.get("insurer_name"),
            "coverage_status": payload.get("coverage_status"),
            "daily_cost_estimate": payload.get("daily_cost_estimate"),
            "total_estimated_exposure": payload.get("total_estimated_exposure"),
            "options": payload.get("options", {}),
            "legal_text": payload.get(
                "legal_text",
                "تم إبلاغ المريض/الضامن بصدور قرار الخروج الطبي وأن استمرار الإقامة قد لا يكون مغطى تأمينيا، ويقر بتحمله المسؤولية المالية.",
            ),
            "fixed_clauses": [
                "medical_discharge_decision_issued",
                "patient_or_guarantor_informed",
                "discharge_refusal_recorded",
                "continued_stay_may_not_be_covered",
                "financial_liability_accepted",
                "hospital_cost_recovery_right_reserved",
                "charges_continue_per_rate_card",
                "hospital_rights_not_waived",
            ],
        }

        rendered = _render_ack_html(ack_payload)
        pdf_file_name, pdf_url = _render_and_store_pdf(
            html_content=rendered,
            title="Financial Liability Acknowledgment",
            prefix=f"financial_ack_{case_id}",
        )

        ack = FinancialLiabilityAcknowledgmentInstance(
            tenant_id=tenant_id,
            case_id=case_id,
            patient_id=discharge_case.patient_id,
            event_id=event.id,
            acknowledgment_payload_json=ack_payload,
            rendered_html=rendered,
            pdf_url=pdf_url,
            status="generated",
            created_by=actor.user_id,
        )
        self.db.add(ack)

        self.audit.log(
            case_id=case_id,
            task_id=None,
            actor_user_id=actor.user_id,
            event_type="financial_acknowledgment_generated",
            event_title="Financial liability acknowledgment generated",
            metadata_json={"ack_id": ack.id, "pdf_file": pdf_file_name},
        )
        self.db.commit()
        self.db.refresh(ack)
        return ack

    def create_promissory_note(
        self,
        *,
        tenant_id: str,
        case_id: str,
        payload: Dict[str, Any],
        actor: ActorContext,
    ) -> PromissoryNoteInstance:
        discharge_case = self._get_case(tenant_id, case_id)
        amount = float(payload.get("amount_numeric") or 0)
        if amount <= 0:
            raise ValueError("amount_numeric must be greater than zero")

        amount_text = amount_to_arabic_words(amount)
        note_payload = {
            "title": "سند لأمر",
            "promise": "أتعهد أنا الموقع أدناه بدفع مبلغ غير معلق على شرط.",
            "debtor_name": payload.get("debtor_name"),
            "debtor_id": payload.get("debtor_id"),
            "debtor_mobile": payload.get("debtor_mobile"),
            "debtor_address": payload.get("debtor_address"),
            "relation_to_patient": payload.get("relation_to_patient"),
            "creditor_name": payload.get("creditor_name"),
            "due_date": payload.get("due_date"),
            "issue_place": payload.get("issue_place"),
            "issue_date": payload.get("issue_date"),
            "amount_numeric": amount,
            "amount_text_ar": amount_text,
        }
        rendered = _render_promissory_html(note_payload)
        digest = hashlib.sha256(rendered.encode("utf-8")).hexdigest()
        pdf_file_name, pdf_url = _render_and_store_pdf(
            html_content=rendered,
            title="Promissory Note",
            prefix=f"promissory_note_{case_id}",
        )

        note = PromissoryNoteInstance(
            tenant_id=tenant_id,
            case_id=case_id,
            patient_id=discharge_case.patient_id,
            amount_numeric=amount,
            amount_text_ar=amount_text,
            promissory_payload_json=note_payload,
            rendered_html=rendered,
            pdf_url=pdf_url,
            verification_code=_short_code(),
            document_hash=digest,
            status="generated",
            created_by=actor.user_id,
        )
        self.db.add(note)

        self.audit.log(
            case_id=case_id,
            task_id=None,
            actor_user_id=actor.user_id,
            event_type="promissory_note_generated",
            event_title="Promissory note generated",
            metadata_json={"promissory_note_id": note.id, "amount": amount, "pdf_file": pdf_file_name},
        )
        self.db.commit()
        self.db.refresh(note)
        return note

    def create_home_healthcare_agreement(
        self,
        *,
        tenant_id: str,
        case_id: str,
        payload: Dict[str, Any],
        actor: ActorContext,
    ) -> HomeHealthcareAgreementInstance:
        discharge_case = self._get_case(tenant_id, case_id)
        fixed_clauses = [
            "scope_of_services",
            "service_limitations",
            "emergency_responsibility_allocation",
            "patient_family_obligations",
            "payment_and_billing",
            "cancellation_and_suspension",
            "consent_to_home_care",
            "confidentiality_pdpl",
            "no_guarantee_of_cure",
            "liability_framework",
            "governing_law_jurisdiction",
        ]
        structured_payload = {
            **payload,
            "fixed_clauses": fixed_clauses,
            "bilingual": bool(payload.get("bilingual", True)),
        }
        rendered = _render_homecare_html(structured_payload)
        pdf_file_name, pdf_url = _render_and_store_pdf(
            html_content=rendered,
            title="Home Healthcare Agreement",
            prefix=f"home_healthcare_agreement_{case_id}",
        )

        agreement = HomeHealthcareAgreementInstance(
            tenant_id=tenant_id,
            case_id=case_id,
            patient_id=discharge_case.patient_id,
            agreement_payload_json=structured_payload,
            rendered_html=rendered,
            pdf_url=pdf_url,
            status="generated",
            created_by=actor.user_id,
        )
        self.db.add(agreement)
        self.audit.log(
            case_id=case_id,
            task_id=None,
            actor_user_id=actor.user_id,
            event_type="home_healthcare_agreement_generated",
            event_title="Home healthcare agreement generated",
            metadata_json={"agreement_id": agreement.id, "pdf_file": pdf_file_name},
        )
        self.db.commit()
        self.db.refresh(agreement)
        return agreement

    def create_equipment_lease(
        self,
        *,
        tenant_id: str,
        case_id: str,
        payload: Dict[str, Any],
        actor: ActorContext,
    ) -> MedicalEquipmentLeaseInstance:
        discharge_case = self._get_case(tenant_id, case_id)
        fixed_clauses = [
            "ownership_remains_with_provider",
            "proper_use_obligation",
            "misuse_damage_liability",
            "late_return_penalties",
            "inspection_rights",
            "maintenance_boundary",
            "no_sublease_no_transfer",
            "loss_theft_liability",
            "payment_default_consequences",
            "termination_recovery_rights",
            "electronically_generated_signed_clause",
        ]
        structured_payload = {
            **payload,
            "fixed_clauses": fixed_clauses,
            "bilingual": bool(payload.get("bilingual", True)),
        }
        rendered = _render_equipment_lease_html(structured_payload)
        pdf_file_name, pdf_url = _render_and_store_pdf(
            html_content=rendered,
            title="Medical Equipment Lease Agreement",
            prefix=f"equipment_lease_{case_id}",
        )

        lease = MedicalEquipmentLeaseInstance(
            tenant_id=tenant_id,
            case_id=case_id,
            patient_id=discharge_case.patient_id,
            lease_payload_json=structured_payload,
            rendered_html=rendered,
            pdf_url=pdf_url,
            status="generated",
            created_by=actor.user_id,
        )
        self.db.add(lease)
        self.audit.log(
            case_id=case_id,
            task_id=None,
            actor_user_id=actor.user_id,
            event_type="equipment_lease_generated",
            event_title="Medical equipment lease generated",
            metadata_json={"lease_id": lease.id, "pdf_file": pdf_file_name},
        )
        self.db.commit()
        self.db.refresh(lease)
        return lease

    def create_legal_undertaking(
        self,
        *,
        tenant_id: str,
        case_id: str,
        payload: Dict[str, Any],
        actor: ActorContext,
    ) -> LegalUndertakingInstance:
        discharge_case = self._get_case(tenant_id, case_id)
        structured_payload = {
            **payload,
            "bilingual": bool(payload.get("bilingual", True)),
            "obligation_type": payload.get("obligation_type", "general_undertaking"),
        }
        rendered = _render_undertaking_html(structured_payload)
        pdf_file_name, pdf_url = _render_and_store_pdf(
            html_content=rendered,
            title="Legal Undertaking",
            prefix=f"legal_undertaking_{case_id}",
        )

        undertaking = LegalUndertakingInstance(
            tenant_id=tenant_id,
            case_id=case_id,
            patient_id=discharge_case.patient_id,
            undertaking_payload_json=structured_payload,
            rendered_html=rendered,
            pdf_url=pdf_url,
            status="generated",
            created_by=actor.user_id,
        )
        self.db.add(undertaking)
        self.audit.log(
            case_id=case_id,
            task_id=None,
            actor_user_id=actor.user_id,
            event_type="legal_undertaking_generated",
            event_title="Legal undertaking generated",
            metadata_json={"undertaking_id": undertaking.id, "pdf_file": pdf_file_name},
        )
        self.db.commit()
        self.db.refresh(undertaking)
        return undertaking

    def create_escalation_event(
        self,
        *,
        tenant_id: str,
        case_id: str,
        payload: Dict[str, Any],
        actor: ActorContext,
    ) -> EscalationEvent:
        discharge_case = self._get_case(tenant_id, case_id)
        event = self._active_event(tenant_id, case_id)
        if not event:
            raise ValueError("No active legal decision event")

        hours = int(payload.get("hours_from_now") or 2)
        escalation = EscalationEvent(
            tenant_id=tenant_id,
            case_id=case_id,
            patient_id=discharge_case.patient_id,
            event_id=event.id,
            escalation_level=payload.get("escalation_level", "care_team_reminder"),
            due_at=datetime.utcnow() + timedelta(hours=hours),
            target_role=payload.get("target_role"),
            notes=payload.get("notes"),
            created_by=actor.user_id,
        )
        self.db.add(escalation)

        if event.legal_state in {"PATIENT_REFUSED", "REFUSED_TO_SIGN", "UNABLE_TO_SIGN"}:
            self.transition_state(
                tenant_id=tenant_id,
                case_id=case_id,
                target_state="ESCALATED",
                actor=actor,
                reason="Escalation event created",
            )

        self.audit.log(
            case_id=case_id,
            task_id=None,
            actor_user_id=actor.user_id,
            event_type="escalation_event_created",
            event_title="Escalation event created",
            metadata_json={"escalation_event_id": escalation.id, "level": escalation.escalation_level},
        )
        self.db.commit()
        self.db.refresh(escalation)
        return escalation

    def build_evidence_package(
        self,
        *,
        tenant_id: str,
        case_id: str,
        actor: ActorContext,
    ) -> EvidencePackage:
        discharge_case = self._get_case(tenant_id, case_id)
        event = self._active_event(tenant_id, case_id)
        if not event:
            raise ValueError("No active legal decision event")

        latest_document = (
            self.db.query(DischargeDecisionDocument)
            .filter(DischargeDecisionDocument.tenant_id == tenant_id, DischargeDecisionDocument.case_id == case_id)
            .order_by(DischargeDecisionDocument.created_at.desc())
            .first()
        )
        latest_response = (
            self.db.query(PatientResponse)
            .filter(PatientResponse.tenant_id == tenant_id, PatientResponse.case_id == case_id)
            .order_by(PatientResponse.created_at.desc())
            .first()
        )

        package_reference = f"EVD-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        package_index = {
            "master_discharge_decision_document_id": latest_document.id if latest_document else None,
            "notice_presentations_count": self.db.query(PatientNoticePresentation).filter(
                PatientNoticePresentation.tenant_id == tenant_id,
                PatientNoticePresentation.case_id == case_id,
            ).count(),
            "patient_response_id": latest_response.id if latest_response else None,
            "signature_logs_count": self.db.query(SignatureArtifact).filter(
                SignatureArtifact.tenant_id == tenant_id,
                SignatureArtifact.case_id == case_id,
            ).count(),
            "financial_ack_count": self.db.query(FinancialLiabilityAcknowledgmentInstance).filter(
                FinancialLiabilityAcknowledgmentInstance.tenant_id == tenant_id,
                FinancialLiabilityAcknowledgmentInstance.case_id == case_id,
            ).count(),
            "promissory_note_count": self.db.query(PromissoryNoteInstance).filter(
                PromissoryNoteInstance.tenant_id == tenant_id,
                PromissoryNoteInstance.case_id == case_id,
            ).count(),
            "home_healthcare_agreement_count": self.db.query(HomeHealthcareAgreementInstance).filter(
                HomeHealthcareAgreementInstance.tenant_id == tenant_id,
                HomeHealthcareAgreementInstance.case_id == case_id,
            ).count(),
            "equipment_lease_count": self.db.query(MedicalEquipmentLeaseInstance).filter(
                MedicalEquipmentLeaseInstance.tenant_id == tenant_id,
                MedicalEquipmentLeaseInstance.case_id == case_id,
            ).count(),
            "undertaking_count": self.db.query(LegalUndertakingInstance).filter(
                LegalUndertakingInstance.tenant_id == tenant_id,
                LegalUndertakingInstance.case_id == case_id,
            ).count(),
            "escalation_count": self.db.query(EscalationEvent).filter(
                EscalationEvent.tenant_id == tenant_id,
                EscalationEvent.case_id == case_id,
            ).count(),
        }

        verification_meta = {
            "package_hash": hashlib.sha256(str(package_index).encode("utf-8")).hexdigest(),
            "generated_at": datetime.utcnow().isoformat(),
            "legal_state": event.legal_state,
        }

        generated_dir = Path("backend/generated")
        bundles_dir = generated_dir / "bundles"
        bundles_dir.mkdir(parents=True, exist_ok=True)
        bundle_file_name = f"{package_reference}.zip"
        bundle_path = bundles_dir / bundle_file_name

        with zipfile.ZipFile(bundle_path, "w", compression=zipfile.ZIP_DEFLATED) as zipf:
            # ── Cover sheet must be the FIRST entry in the bundle ──────────────
            cover_html = _render_evidence_cover_html(
                case_id=case_id,
                package_reference=package_reference,
                legal_state=event.legal_state,
                package_index=package_index,
                verification_meta=verification_meta,
                discharge_case=discharge_case,
            )
            zipf.writestr("00_COVER_SHEET.html", cover_html)
            zipf.writestr("package_index.json", json.dumps(package_index, ensure_ascii=False, indent=2))
            zipf.writestr("verification.json", json.dumps(verification_meta, ensure_ascii=False, indent=2))

            docs = self.db.query(DischargeDecisionDocument).filter(
                DischargeDecisionDocument.tenant_id == tenant_id,
                DischargeDecisionDocument.case_id == case_id,
            ).all()
            for doc in docs:
                if doc.rendered_html:
                    zipf.writestr(f"master_documents/{doc.id}.html", doc.rendered_html)
                if doc.pdf_url:
                    pdf_path = Path(doc.pdf_url)
                    if pdf_path.exists():
                        zipf.write(pdf_path, arcname=f"master_documents/{pdf_path.name}")

            acks = self.db.query(FinancialLiabilityAcknowledgmentInstance).filter(
                FinancialLiabilityAcknowledgmentInstance.tenant_id == tenant_id,
                FinancialLiabilityAcknowledgmentInstance.case_id == case_id,
            ).all()
            for ack in acks:
                if ack.rendered_html:
                    zipf.writestr(f"financial_acknowledgments/{ack.id}.html", ack.rendered_html)
                if ack.pdf_url:
                    pdf_path = Path(ack.pdf_url)
                    if pdf_path.exists():
                        zipf.write(pdf_path, arcname=f"financial_acknowledgments/{pdf_path.name}")

            promissory_notes = self.db.query(PromissoryNoteInstance).filter(
                PromissoryNoteInstance.tenant_id == tenant_id,
                PromissoryNoteInstance.case_id == case_id,
            ).all()
            for note in promissory_notes:
                if note.rendered_html:
                    zipf.writestr(f"promissory_notes/{note.id}.html", note.rendered_html)
                if note.pdf_url:
                    pdf_path = Path(note.pdf_url)
                    if pdf_path.exists():
                        zipf.write(pdf_path, arcname=f"promissory_notes/{pdf_path.name}")

            undertakings = self.db.query(LegalUndertakingInstance).filter(
                LegalUndertakingInstance.tenant_id == tenant_id,
                LegalUndertakingInstance.case_id == case_id,
            ).all()
            for undertaking in undertakings:
                if undertaking.rendered_html:
                    zipf.writestr(f"undertakings/{undertaking.id}.html", undertaking.rendered_html)
                if undertaking.pdf_url:
                    pdf_path = Path(undertaking.pdf_url)
                    if pdf_path.exists():
                        zipf.write(pdf_path, arcname=f"undertakings/{pdf_path.name}")

        evidence = EvidencePackage(
            tenant_id=tenant_id,
            case_id=case_id,
            patient_id=discharge_case.patient_id,
            package_reference=package_reference,
            generated_by=actor.user_id,
            bundle_url=str(bundle_path),
            package_index_json=package_index,
            verification_metadata_json=verification_meta,
            status="generated",
        )
        self.db.add(evidence)

        if event.legal_state != "PACKAGE_FINALIZED":
            self.transition_state(
                tenant_id=tenant_id,
                case_id=case_id,
                target_state="PACKAGE_FINALIZED",
                actor=actor,
                reason="Evidence package generated",
            )

        self.audit.log(
            case_id=case_id,
            task_id=None,
            actor_user_id=actor.user_id,
            event_type="evidence_package_generated",
            event_title="Evidence package generated",
            metadata_json={"evidence_package_id": evidence.id, "reference": package_reference, "bundle_file": bundle_file_name},
        )
        self.db.commit()
        self.db.refresh(evidence)
        return evidence

    def get_case_legal_summary(self, *, tenant_id: str, case_id: str) -> Dict[str, Any]:
        event = self._active_event(tenant_id, case_id)
        if not event:
            return {"event": None, "counts": {}}

        counts = {
            "documents": self.db.query(DischargeDecisionDocument).filter(
                DischargeDecisionDocument.tenant_id == tenant_id,
                DischargeDecisionDocument.case_id == case_id,
            ).count(),
            "notice_presentations": self.db.query(PatientNoticePresentation).filter(
                PatientNoticePresentation.tenant_id == tenant_id,
                PatientNoticePresentation.case_id == case_id,
            ).count(),
            "responses": self.db.query(PatientResponse).filter(
                PatientResponse.tenant_id == tenant_id,
                PatientResponse.case_id == case_id,
            ).count(),
            "financial_acknowledgments": self.db.query(FinancialLiabilityAcknowledgmentInstance).filter(
                FinancialLiabilityAcknowledgmentInstance.tenant_id == tenant_id,
                FinancialLiabilityAcknowledgmentInstance.case_id == case_id,
            ).count(),
            "promissory_notes": self.db.query(PromissoryNoteInstance).filter(
                PromissoryNoteInstance.tenant_id == tenant_id,
                PromissoryNoteInstance.case_id == case_id,
            ).count(),
            "evidence_packages": self.db.query(EvidencePackage).filter(
                EvidencePackage.tenant_id == tenant_id,
                EvidencePackage.case_id == case_id,
            ).count(),
            "escalations": self.db.query(EscalationEvent).filter(
                EscalationEvent.tenant_id == tenant_id,
                EscalationEvent.case_id == case_id,
            ).count(),
        }
        return {
            "event": {
                "id": event.id,
                "legal_state": event.legal_state,
                "notification_state": event.notification_state,
                "patient_response_state": event.patient_response_state,
                "signature_state": event.signature_state,
                "escalation_state": event.escalation_state,
                "final_package_state": event.final_package_state,
                "state_history": event.state_history,
            },
            "counts": counts,
        }

    def get_tenant_legal_control_metrics(self, *, tenant_id: str) -> Dict[str, Any]:
        total_decisions = self.db.query(DischargeDecisionEvent).filter(
            DischargeDecisionEvent.tenant_id == tenant_id,
        ).count()

        accepted = self.db.query(PatientResponse).filter(
            PatientResponse.tenant_id == tenant_id,
            PatientResponse.response_type == "accepted_discharge",
        ).count()
        refused = self.db.query(PatientResponse).filter(
            PatientResponse.tenant_id == tenant_id,
            PatientResponse.response_type == "refused_discharge",
        ).count()
        refused_to_sign = self.db.query(PatientResponse).filter(
            PatientResponse.tenant_id == tenant_id,
            PatientResponse.response_type == "refused_to_sign",
        ).count()
        unable_to_sign = self.db.query(PatientResponse).filter(
            PatientResponse.tenant_id == tenant_id,
            PatientResponse.response_type.in_(["unable_to_sign", "guardian_representative_sign"]),
        ).count()

        home_care_count = self.db.query(HomeHealthcareAgreementInstance).filter(
            HomeHealthcareAgreementInstance.tenant_id == tenant_id,
        ).count()
        equipment_lease_count = self.db.query(MedicalEquipmentLeaseInstance).filter(
            MedicalEquipmentLeaseInstance.tenant_id == tenant_id,
        ).count()
        financial_ack_count = self.db.query(FinancialLiabilityAcknowledgmentInstance).filter(
            FinancialLiabilityAcknowledgmentInstance.tenant_id == tenant_id,
        ).count()
        promissory_count = self.db.query(PromissoryNoteInstance).filter(
            PromissoryNoteInstance.tenant_id == tenant_id,
        ).count()

        unresolved_high_risk = self.db.query(DischargeDecisionEvent).filter(
            DischargeDecisionEvent.tenant_id == tenant_id,
            DischargeDecisionEvent.legal_state.in_(["PATIENT_REFUSED", "REFUSED_TO_SIGN", "UNABLE_TO_SIGN", "ESCALATED"]),
            DischargeDecisionEvent.final_package_state != "FINALIZED",
        ).count()

        ack_rows = self.db.query(FinancialLiabilityAcknowledgmentInstance).filter(
            FinancialLiabilityAcknowledgmentInstance.tenant_id == tenant_id,
        ).all()
        total_exposure = 0.0
        for row in ack_rows:
            payload = row.acknowledgment_payload_json or {}
            value = payload.get("total_estimated_exposure")
            try:
                total_exposure += float(value or 0)
            except (TypeError, ValueError):
                continue

        response_rows = self.db.query(PatientResponse, DischargeDecisionEvent).join(
            DischargeDecisionEvent,
            PatientResponse.event_id == DischargeDecisionEvent.id,
        ).filter(
            PatientResponse.tenant_id == tenant_id,
        ).all()
        response_deltas = []
        for response, event in response_rows:
            if response.created_at and event.decision_timestamp:
                response_deltas.append((response.created_at - event.decision_timestamp).total_seconds())

        escalation_rows = self.db.query(EscalationEvent, DischargeDecisionEvent).join(
            DischargeDecisionEvent,
            EscalationEvent.event_id == DischargeDecisionEvent.id,
        ).filter(
            EscalationEvent.tenant_id == tenant_id,
        ).all()
        escalation_deltas = []
        for escalation, event in escalation_rows:
            if escalation.escalated_at and event.updated_at:
                escalation_deltas.append((escalation.escalated_at - event.updated_at).total_seconds())

        avg_decision_to_response_seconds = (
            sum(response_deltas) / len(response_deltas) if response_deltas else 0.0
        )
        avg_refusal_to_escalation_seconds = (
            sum(escalation_deltas) / len(escalation_deltas) if escalation_deltas else 0.0
        )

        return {
            "total_discharge_decisions": total_decisions,
            "total_accepted": accepted,
            "total_refused": refused,
            "refused_to_sign_count": refused_to_sign,
            "unable_to_sign_count": unable_to_sign,
            "home_care_agreements_generated": home_care_count,
            "equipment_lease_agreements_generated": equipment_lease_count,
            "financial_acknowledgments_generated": financial_ack_count,
            "promissory_notes_generated": promissory_count,
            "high_risk_unresolved_cases": unresolved_high_risk,
            "avg_time_decision_to_response_seconds": float(avg_decision_to_response_seconds or 0.0),
            "avg_time_refusal_to_escalation_seconds": float(avg_refusal_to_escalation_seconds or 0.0),
            "total_estimated_financial_exposure": float(total_exposure),
        }


AR_UNITS = [
    "صفر",
    "واحد",
    "اثنان",
    "ثلاثة",
    "أربعة",
    "خمسة",
    "ستة",
    "سبعة",
    "ثمانية",
    "تسعة",
]

AR_TENS = {
    10: "عشرة",
    20: "عشرون",
    30: "ثلاثون",
    40: "أربعون",
    50: "خمسون",
    60: "ستون",
    70: "سبعون",
    80: "ثمانون",
    90: "تسعون",
}


def amount_to_arabic_words(amount: float) -> str:
    whole = int(amount)
    halalas = int(round((amount - whole) * 100))
    whole_text = _small_number_to_arabic(whole)
    if halalas <= 0:
        return f"{whole_text} ريال سعودي فقط لا غير"
    return f"{whole_text} ريال سعودي و {_small_number_to_arabic(halalas)} هللة فقط لا غير"


def _small_number_to_arabic(value: int) -> str:
    if value < 10:
        return AR_UNITS[value]
    if value in AR_TENS:
        return AR_TENS[value]
    if value < 20:
        return AR_UNITS[value - 10] + " عشر"
    if value < 100:
        ones = value % 10
        tens = value - ones
        if ones == 0:
            return AR_TENS[tens]
        return f"{AR_UNITS[ones]} و {AR_TENS[tens]}"
    if value < 1000:
        hundreds = value // 100
        remainder = value % 100
        hundreds_text = (
            "مائة"
            if hundreds == 1
            else "مئتان"
            if hundreds == 2
            else f"{AR_UNITS[hundreds]} مائة"
        )
        if remainder == 0:
            return hundreds_text
        return f"{hundreds_text} و {_small_number_to_arabic(remainder)}"
    thousands = value // 1000
    remainder = value % 1000
    thousands_text = "ألف" if thousands == 1 else f"{_small_number_to_arabic(thousands)} ألف"
    if remainder == 0:
        return thousands_text
    return f"{thousands_text} و {_small_number_to_arabic(remainder)}"


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _short_code() -> str:
    return uuid.uuid4().hex[:10].upper()


def _render_and_store_pdf(*, html_content: str, title: str, prefix: str) -> tuple[str, str]:
    generated_dir = Path("backend/generated/legal_documents")
    generated_dir.mkdir(parents=True, exist_ok=True)
    file_name = f"{prefix}_{uuid.uuid4().hex[:10]}.pdf"
    output_path = generated_dir / file_name
    render_html_to_pdf(
        html_content=html_content,
        output_path=output_path,
        title=title,
    )
    return file_name, str(output_path)


_BASE_CSS = """
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Tahoma', 'Arial', sans-serif; color: #0f172a; line-height: 1.7;
         font-size: 13px; direction: rtl; background: #fff; }
  .page { max-width: 860px; margin: 0 auto; padding: 24px 32px; }
  .header-banner { background: #1e3a5f; color: #fff; padding: 18px 24px;
                   border-radius: 6px 6px 0 0; text-align: center; }
  .header-banner h1 { font-size: 18px; margin-bottom: 4px; }
  .header-banner h2 { font-size: 14px; font-weight: normal; opacity: .85; }
  .section { margin: 18px 0; border: 1px solid #d1d5db; border-radius: 6px;
             overflow: hidden; page-break-inside: avoid; }
  .section-title { background: #f1f5f9; padding: 8px 16px; font-size: 13px;
                   font-weight: bold; color: #1e3a5f; border-bottom: 1px solid #d1d5db; }
  .section-body { padding: 12px 16px; }
  .field-row { display: flex; gap: 24px; margin-bottom: 6px; flex-wrap: wrap; }
  .field { flex: 1; min-width: 180px; }
  .field label { font-size: 11px; color: #64748b; display: block; margin-bottom: 2px; }
  .field span { font-size: 13px; font-weight: 500; }
  ol.clauses { padding-right: 20px; }
  ol.clauses li { margin-bottom: 8px; line-height: 1.6; text-align: justify; }
  .signature-block { border: 1px dashed #94a3b8; border-radius: 6px; padding: 14px 18px;
                     margin-top: 12px; background: #f8fafc; }
  .signature-block img { max-height: 70px; display: block; margin: 8px auto; }
  .signature-line { border-bottom: 1px solid #0f172a; width: 220px;
                    display: inline-block; margin-bottom: 4px; }
  .legal-statement { background: #fefce8; border-left: 4px solid #ca8a04;
                     padding: 12px 16px; margin: 12px 0; font-size: 13px;
                     text-align: justify; }
  .footer { margin-top: 24px; border-top: 1px solid #d1d5db; padding-top: 12px;
            font-size: 11px; color: #64748b; text-align: center; }
  .verification-badge { display: inline-block; background: #1e3a5f; color: #fff;
                        padding: 3px 10px; border-radius: 20px; font-family: monospace;
                        font-size: 12px; letter-spacing: 1px; }
  table.info-table { width: 100%; border-collapse: collapse; }
  table.info-table td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  table.info-table td:first-child { color: #475569; width: 38%; }
  @media print { .page { padding: 0; } .header-banner { border-radius: 0; } }
</style>
"""


def _sig_img(sig_payload: Optional[str]) -> str:
    """Return an <img> tag if sig_payload is a data URI, otherwise a blank signature line."""
    if sig_payload and sig_payload.startswith("data:image"):
        return f'<img src="{sig_payload}" alt="توقيع" style="max-height:70px;display:block;margin:8px auto;" />'
    return '<span style="display:inline-block;border-bottom:1px solid #0f172a;width:220px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>'


def _render_master_document_html(payload: Dict[str, Any]) -> str:
    hospital = payload.get("hospital", {})
    patient = payload.get("patient", {})
    medical = payload.get("medical", {})
    notification = payload.get("notification", {})
    response = payload.get("response", {})
    signatures = payload.get("signatures", {})
    legal_statement = payload.get("legal_statement", {})
    footer = payload.get("footer", {})

    def med(key: str) -> str:
        value = medical.get(key)
        if isinstance(value, list):
            return "، ".join(str(v) for v in value if v)
        return str(value or "—")

    def nb(v: Any) -> str:
        return str(v) if v not in (None, "", False) else "—"

    patient_sig_img = _sig_img(signatures.get("patient_signature_data"))
    guardian_sig_img = _sig_img(signatures.get("guardian_signature_data"))
    staff_sig_img = _sig_img(signatures.get("staff_signature_data"))

    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"/><title>وثيقة قرار الخروج الطبي القانونية</title>{_BASE_CSS}</head>
<body><div class="page">

<div class="header-banner">
  <h1>وثيقة قرار الخروج الطبي القانونية</h1>
  <h2>Medical Discharge Decision Legal Document — WathiqCare Platform</h2>
</div>

<!-- ─── قسم هوية المنشأة ─── -->
<div class="section">
  <div class="section-title">هوية المنشأة الصحية / Healthcare Facility Legal Identity</div>
  <div class="section-body">
    <table class="info-table">
      <tr><td>اسم المنشأة (عربي/إنجليزي)</td><td><strong>{nb(hospital.get('name_ar'))} / {nb(hospital.get('name_en'))}</strong></td></tr>
      <tr><td>رقم ترخيص وزارة الصحة</td><td>{nb(hospital.get('moh_license'))}</td></tr>
      <tr><td>السجل التجاري (CR)</td><td>{nb(hospital.get('cr_number'))}</td></tr>
      <tr><td>العنوان</td><td>{nb(hospital.get('address'))}, {nb(hospital.get('city'))}</td></tr>
    </table>
  </div>
</div>

<!-- ─── بيانات المريض ─── -->
<div class="section">
  <div class="section-title">بيانات المريض / Patient Details</div>
  <div class="section-body">
    <table class="info-table">
      <tr><td>اسم المريض</td><td><strong>{nb(patient.get('name'))}</strong></td></tr>
      <tr><td>رقم الملف الطبي (MRN)</td><td>{nb(patient.get('mrn'))}</td></tr>
      <tr><td>رقم الهوية الوطنية / الإقامة</td><td>{nb(patient.get('id_number'))}</td></tr>
      <tr><td>رقم الزيارة</td><td>{nb(patient.get('encounter_no'))}</td></tr>
      <tr><td>تاريخ الدخول</td><td>{nb(patient.get('admission_date'))}</td></tr>
      <tr><td>تاريخ ووقت قرار الخروج</td><td>{nb(patient.get('decision_at'))}</td></tr>
      <tr><td>الوحدة / الغرفة / السرير</td><td>{nb(patient.get('ward_room_bed'))}</td></tr>
      <tr><td>الطبيب الاستشاري المعالج</td><td>{nb(patient.get('attending_consultant'))}</td></tr>
      <tr><td>التخصص</td><td>{nb(patient.get('specialty'))}</td></tr>
    </table>
  </div>
</div>

<!-- ─── المعلومات الطبية ─── -->
<div class="section">
  <div class="section-title">المعلومات الطبية / Medical Information</div>
  <div class="section-body">
    <table class="info-table">
      <tr><td>تشخيص الدخول</td><td>{med('admission_diagnosis')}</td></tr>
      <tr><td>التشخيص النهائي</td><td>{med('final_diagnosis')}</td></tr>
      <tr><td>التشخيصات الثانوية</td><td>{med('secondary_diagnoses')}</td></tr>
      <tr><td>الإجراءات المُنفَّذة</td><td>{med('procedures_performed')}</td></tr>
      <tr><td>ملخص الجراحة</td><td>{med('operative_summary')}</td></tr>
      <tr><td>الفحوصات</td><td>{med('investigations_summary')}</td></tr>
      <tr><td>الأدوية عند الخروج</td><td>{med('medication_list')}</td></tr>
      <tr><td>الحساسية</td><td>{med('allergies')}</td></tr>
      <tr><td>خطة الخروج</td><td>{med('discharge_plan')}</td></tr>
      <tr><td>متابعة ما بعد الخروج</td><td>{med('follow_up_instructions')}</td></tr>
      <tr><td>احتياجات الرعاية المنزلية</td><td>{med('home_care_needs')}</td></tr>
      <tr><td>احتياجات الأجهزة الطبية</td><td>{med('equipment_needs')}</td></tr>
      <tr><td>الحالة عند الخروج</td><td>{med('condition_at_discharge')}</td></tr>
    </table>
  </div>
</div>

<!-- ─── قرار الخروج القانوني ─── -->
<div class="section">
  <div class="section-title">قرار الخروج الطبي والبيان القانوني / Medical Discharge Decision & Legal Statement</div>
  <div class="section-body">
    <div class="legal-statement" dir="rtl">
      <strong>البيان القانوني (عربي):</strong><br/>
      {legal_statement.get('ar') or 'صدر قرار الخروج الطبي بناءً على التقدير السريري للطاقم الطبي المعالج. يُقرّ المريض أو وليّه بإحاطته علماً بهذا القرار وبجميع توصياته الطبية والقانونية.'}
    </div>
    <div class="legal-statement" dir="ltr" style="border-right:none;border-left:4px solid #ca8a04;margin-top:8px;text-align:left;">
      <strong>Legal Statement (English):</strong><br/>
      {legal_statement.get('en') or 'A formal medical discharge order has been issued based on the clinical assessment of the treating medical team. The patient or their legal guardian acknowledges being fully informed of this decision and all associated medical and legal recommendations.'}
    </div>
  </div>
</div>

<!-- ─── تبليغ المريض ─── -->
<div class="section">
  <div class="section-title">إشعار المريض / Patient Notification Record</div>
  <div class="section-body">
    <table class="info-table">
      <tr><td>حالة الإشعار</td><td>{nb(notification.get('notification_status'))}</td></tr>
      <tr><td>طريقة الإشعار</td><td>{nb(notification.get('notification_method'))}</td></tr>
      <tr><td>لغة التبليغ</td><td>{nb(notification.get('notice_language'))}</td></tr>
      <tr><td>تاريخ ووقت التبليغ</td><td>{nb(notification.get('notice_timestamp'))}</td></tr>
      <tr><td>اسم المُبلِّغ</td><td>{nb(notification.get('presenter_name'))} — {nb(notification.get('presenter_role'))}</td></tr>
      <tr><td>التحقق من الهوية</td><td>{'✓ تم التحقق' if notification.get('identity_verified') else 'لم يُتحقق'}</td></tr>
      <tr><td>استخدام مترجم</td><td>{'✓ نعم' if notification.get('interpreter_used') else 'لا'}</td></tr>
    </table>
  </div>
</div>

<!-- ─── استجابة المريض ─── -->
<div class="section">
  <div class="section-title">استجابة المريض / Patient Response</div>
  <div class="section-body">
    <table class="info-table">
      <tr><td>نوع الاستجابة</td><td><strong>{nb(response.get('response_type'))}</strong></td></tr>
      <tr><td>سبب الرفض</td><td>{nb(response.get('refusal_reason'))}</td></tr>
      <tr><td>سبب عدم التوقيع</td><td>{nb(response.get('inability_reason'))}</td></tr>
      <tr><td>ملاحظات</td><td>{nb(response.get('notes'))}</td></tr>
    </table>
  </div>
</div>

<!-- ─── التوقيعات ─── -->
<div class="section">
  <div class="section-title">التوقيعات / Signatures</div>
  <div class="section-body" style="display:flex;flex-wrap:wrap;gap:16px;">
    <div class="signature-block" style="flex:1;min-width:200px;">
      <div style="font-size:11px;color:#64748b;margin-bottom:6px;">توقيع المريض / Patient Signature</div>
      {patient_sig_img}
      <div style="font-size:12px;margin-top:6px;">{nb(signatures.get('patient_signature'))}</div>
    </div>
    <div class="signature-block" style="flex:1;min-width:200px;">
      <div style="font-size:11px;color:#64748b;margin-bottom:6px;">توقيع وليّ الأمر / Guardian Signature</div>
      {guardian_sig_img}
      <div style="font-size:12px;margin-top:6px;">{nb(signatures.get('guardian_signature'))}</div>
    </div>
    <div class="signature-block" style="flex:1;min-width:200px;">
      <div style="font-size:11px;color:#64748b;margin-bottom:6px;">توقيع الموظف المُبلِّغ / Staff Signature</div>
      {staff_sig_img}
      <div style="font-size:12px;margin-top:6px;">{nb(signatures.get('staff_signature'))}</div>
    </div>
  </div>
</div>

<!-- ─── التذييل القانوني ─── -->
<div class="footer">
  <p>{footer.get('electronic_statement') or 'هذه الوثيقة مُولَّدة إلكترونياً وتحمل قوة قانونية مُعادلة للوثيقة الورقية وفق نظام التعاملات الإلكترونية السعودي.'}</p>
  <p style="margin-top:4px;">{footer.get('confidentiality_statement') or 'سرية — للاستخدام الرسمي فقط | Confidential — Official Use Only'}</p>
  <p style="margin-top:8px;">رمز التحقق: <span class="verification-badge">{footer.get('verification_code') or '—'}</span></p>
</div>

</div></body></html>"""


def _render_ack_html(payload: Dict[str, Any]) -> str:
    options = payload.get("options") or {}
    sig_data = payload.get("debtor_signature_data")
    sig_html = _sig_img(sig_data)

    clauses_ar = [
        "أُبلغ المريض / الضامن رسمياً بصدور قرار الخروج الطبي من قِبَل الطاقم الطبي المعالج استناداً إلى التقدير السريري، ولا يجوز للمنشأة الاحتفاظ بالمريض بعد إصدار هذا القرار دون مسوّغ طبي.",
        "يُقرّ الموقّع أدناه بعلمه التام بالوضع الطبي للمريض وبقرار الخروج الصادر، ويتحمّل كامل المسؤولية عن رفضه الإذعان لهذا القرار.",
        "يُسجَّل الرفض رسمياً في ملف المريض الإلكتروني وفق متطلبات الحوكمة السريرية والمعيار الوطني لاعتماد المستشفيات (CBAHI) ومتطلبات الجهات الرقابية الصحية.",
        "لا يستمر تغطية التأمين الصحي بعد إصدار قرار الخروج الطبي، وأي فواتير تتراكم جراء الاستمرار في الإقامة بعد قرار الخروج تقع على عاتق المريض أو الضامن منفرداً.",
        "تحتفظ المنشأة الصحية بحقها الكامل في المطالبة القانونية أو القضائية باسترداد التكاليف الطبية المستحقة نتيجة الرفض، وفق أحكام نظام الرعاية الصحية السعودي واللوائح ذات الصلة.",
        "تستمر تكاليف الإقامة اليومية وفق قائمة الأسعار المعتمدة من وزارة الصحة، ولا تُخفَّض أو تُلغى.",
        "يُقرّ الموقّع بأن المنشأة الصحية قد أدّت واجبها القانوني والأخلاقي كاملاً في إبلاغه وتوضيح تداعيات الرفض، ويُعفي المنشأة وطاقمها من أي مسؤولية مترتبة على رفضه.",
        "هذا الإقرار مُلزِم قانونياً وقابل للاحتجاج به أمام الجهات القضائية والصحية السعودية.",
    ]
    clauses_en = [
        "The patient / guarantor has been formally notified of the medical discharge decision issued by the treating medical team based on clinical assessment. The facility is not obligated to continue the patient's stay beyond this decision.",
        "The undersigned acknowledges full awareness of the patient's medical condition and the discharge decision, and assumes complete responsibility for refusing to comply with this order.",
        "The refusal is formally recorded in the patient's electronic medical file in accordance with clinical governance requirements and CBAHI national standards.",
        "Health insurance coverage ceases after the issuance of the medical discharge order. All subsequent costs arising from continued stay are the sole financial responsibility of the patient or guarantor.",
        "The healthcare facility reserves the full right to pursue legal or judicial action to recover outstanding medical costs resulting from this refusal.",
        "Daily accommodation costs continue at the Ministry of Health-approved rate and shall not be waived or reduced.",
        "The undersigned acknowledges that the facility has discharged its full legal and ethical duty of notification, thereby releasing the facility and its staff from any liability arising from this refusal.",
        "This acknowledgment is legally binding and enforceable before Saudi judicial and healthcare authorities.",
    ]

    options_flags = []
    if options.get("insurer_refused_coverage"):
        options_flags.append("التأمين رفض التغطية / Insurer refused coverage")
    if options.get("insurer_pending"):
        options_flags.append("طلب تأمين قيد المعالجة / Insurance claim pending")
    if options.get("self_pay_applies"):
        options_flags.append("يُطبَّق الدفع الذاتي / Self-pay applies")
    if options.get("guarantor_assumes_liability"):
        options_flags.append("الضامن يتحمل المسؤولية / Guarantor assumes liability")
    if options.get("partial_coverage_only"):
        options_flags.append("تغطية جزئية فقط / Partial coverage only")

    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"/><title>إقرار المسؤولية المالية</title>{_BASE_CSS}</head>
<body><div class="page">

<div class="header-banner">
  <h1>إقرار المسؤولية المالية بسبب رفض الخروج</h1>
  <h2>Financial Liability Acknowledgment — Discharge Refusal</h2>
</div>

<div class="section">
  <div class="section-title">بيانات الحالة / Case Details</div>
  <div class="section-body">
    <table class="info-table">
      <tr><td>اسم المريض</td><td><strong>{payload.get('patient_name') or '—'}</strong></td></tr>
      <tr><td>رقم الملف الطبي</td><td>{payload.get('mrn') or '—'}</td></tr>
      <tr><td>رقم الزيارة</td><td>{payload.get('encounter_number') or '—'}</td></tr>
      <tr><td>تاريخ ووقت قرار الخروج</td><td>{payload.get('discharge_decision_datetime') or '—'}</td></tr>
      <tr><td>الطبيب المسؤول</td><td>{payload.get('responsible_physician') or '—'}</td></tr>
      <tr><td>الغرفة الحالية</td><td>{payload.get('current_room') or '—'}</td></tr>
      <tr><td>الضامن / ولي الأمر</td><td>{payload.get('guarantor') or '—'} — {payload.get('relation_to_patient') or '—'}</td></tr>
      <tr><td>شركة التأمين</td><td>{payload.get('insurer_name') or '—'} | وضع التغطية: {payload.get('coverage_status') or '—'}</td></tr>
      <tr><td>التكلفة اليومية التقديرية</td><td>{payload.get('daily_cost_estimate') or '—'} ريال سعودي</td></tr>
      <tr><td>إجمالي التعرض المالي المقدّر</td><td><strong>{payload.get('total_estimated_exposure') or '—'} ريال سعودي</strong></td></tr>
    </table>
    {'<p style="margin-top:8px;font-size:12px;color:#dc2626;"><strong>وضع التأمين:</strong> ' + ' | '.join(options_flags) + '</p>' if options_flags else ''}
  </div>
</div>

<div class="section">
  <div class="section-title">البنود القانونية / Legal Clauses</div>
  <div class="section-body">
    <ol class="clauses">
      {''.join(f'<li dir="rtl"><strong>البند {i+1}:</strong> {clause}</li>' for i, clause in enumerate(clauses_ar))}
    </ol>
    <hr style="margin:12px 0;border-color:#e2e8f0;"/>
    <ol class="clauses" dir="ltr" style="padding-left:20px;padding-right:0;">
      {''.join(f'<li>Clause {i+1}: {clause}</li>' for i, clause in enumerate(clauses_en))}
    </ol>
  </div>
</div>

<div class="section">
  <div class="section-title">التوقيع / Signature</div>
  <div class="section-body">
    <div class="signature-block">
      <p style="font-size:12px;">أقرّ أنا الموقّع أدناه بقراءة جميع البنود أعلاه وفهمها والموافقة عليها طوعاً.</p>
      <p dir="ltr" style="font-size:12px;">I, the undersigned, confirm that I have read, understood, and voluntarily agreed to all clauses above.</p>
      <div style="margin-top:14px;">
        {sig_html}
        <div class="field-row" style="margin-top:8px;">
          <div class="field"><label>اسم الموقّع</label><span>{payload.get('guarantor') or '—'}</span></div>
          <div class="field"><label>الصفة</label><span>{payload.get('relation_to_patient') or '—'}</span></div>
          <div class="field"><label>التاريخ</label><span>{payload.get('discharge_decision_datetime') or '—'}</span></div>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="footer">
  <p>وثيقة مُولَّدة إلكترونياً — للاستخدام الطبي القانوني الرسمي فقط | Electronically generated — For official medico-legal use only</p>
</div>

</div></body></html>"""


def _render_promissory_html(payload: Dict[str, Any]) -> str:
    sig_html = _sig_img(payload.get("debtor_signature_data"))
    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"/><title>سند لأمر</title>{_BASE_CSS}</head>
<body><div class="page">

<div class="header-banner">
  <h1>سند لأمر</h1>
  <h2>Promissory Note — غير مشروط / Unconditional</h2>
</div>

<div class="section">
  <div class="section-title">نص السند / Note Body</div>
  <div class="section-body">
    <div class="legal-statement" dir="rtl">
      أتعهد أنا الموقّع أدناه تعهداً غير مشروط وغير معلّق على أي شرط بأن أدفع لصالح الدائن المذكور أو لأمره
      المبلغ الوارد في هذا السند في مكان وتاريخ الاستحقاق تحت طائلة المسؤولية القانونية الكاملة وفق نظام
      الأوراق التجارية السعودي ونظام المحكمة التجارية.
    </div>
    <div class="legal-statement" dir="ltr" style="border-right:none;border-left:4px solid #ca8a04;text-align:left;">
      I, the undersigned, hereby unconditionally and irrevocably undertake to pay to the order of the creditor named
      herein the amount specified, at the place and on the date of maturity, subject to full legal liability in
      accordance with Saudi Commercial Paper Law.
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">بيانات المدين / Debtor Details</div>
  <div class="section-body">
    <table class="info-table">
      <tr><td>اسم المدين</td><td><strong>{payload.get('debtor_name') or '—'}</strong></td></tr>
      <tr><td>رقم الهوية / الإقامة</td><td>{payload.get('debtor_id') or '—'}</td></tr>
      <tr><td>رقم الجوال</td><td>{payload.get('debtor_mobile') or '—'}</td></tr>
      <tr><td>عنوان المدين</td><td>{payload.get('debtor_address') or '—'}</td></tr>
      <tr><td>الصفة بالنسبة للمريض</td><td>{payload.get('relation_to_patient') or '—'}</td></tr>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-title">بيانات الدائن / Creditor Details</div>
  <div class="section-body">
    <table class="info-table">
      <tr><td>اسم الدائن</td><td><strong>{payload.get('creditor_name') or '—'}</strong></td></tr>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-title">المبلغ وتاريخ الاستحقاق / Amount & Maturity</div>
  <div class="section-body">
    <table class="info-table">
      <tr><td>المبلغ رقماً</td><td><strong>{payload.get('amount_numeric') or '—'} ريال سعودي</strong></td></tr>
      <tr><td>المبلغ كتابةً (عربي)</td><td><strong>{payload.get('amount_text_ar') or '—'}</strong></td></tr>
      <tr><td>تاريخ الاستحقاق</td><td>{payload.get('due_date') or '—'}</td></tr>
      <tr><td>مكان إصدار السند</td><td>{payload.get('issue_place') or '—'}</td></tr>
      <tr><td>تاريخ إصدار السند</td><td>{payload.get('issue_date') or '—'}</td></tr>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-title">البنود القانونية / Legal Terms</div>
  <div class="section-body">
    <ol class="clauses">
      <li>هذا السند مُلزِم قانونياً ويمكن الاحتجاج به أمام المحاكم السعودية المختصة.</li>
      <li>في حال عدم السداد في تاريخ الاستحقاق، يحق للدائن التنفيذ القضائي الفوري دون الحاجة إلى إنذار مسبق.</li>
      <li>يتحمل المدين جميع رسوم التقاضي وأتعاب المحاماة في حال التقاضي.</li>
      <li>يخضع هذا السند في تفسيره وتنفيذه لأحكام الشريعة الإسلامية والنظام السعودي.</li>
      <li dir="ltr">This note is governed by Saudi law. Failure to pay on maturity entitles the creditor to immediate judicial enforcement without prior notice.</li>
    </ol>
  </div>
</div>

<div class="section">
  <div class="section-title">توقيع المدين / Debtor Signature</div>
  <div class="section-body">
    <div class="signature-block">
      {sig_html}
      <div class="field-row" style="margin-top:10px;">
        <div class="field"><label>اسم المدين</label><span>{payload.get('debtor_name') or '—'}</span></div>
        <div class="field"><label>رقم الهوية</label><span>{payload.get('debtor_id') or '—'}</span></div>
        <div class="field"><label>تاريخ التوقيع</label><span>{payload.get('issue_date') or '—'}</span></div>
      </div>
    </div>
  </div>
</div>

<div class="footer">
  <p>سند مُولَّد إلكترونياً — قابل للتنفيذ أمام الجهات القضائية السعودية</p>
</div>

</div></body></html>"""


def _render_homecare_html(payload: Dict[str, Any]) -> str:
    options = payload.get("options") or {}
    sig_html = _sig_img(payload.get("patient_signature_data"))
    provider_sig_html = _sig_img(payload.get("provider_signature_data"))

    services_list = []
    service_map = [
        ("nursing_included", "خدمات التمريض المنزلي / Home Nursing Services"),
        ("physiotherapy_included", "العلاج الطبيعي / Physiotherapy"),
        ("wound_care_included", "رعاية الجروح / Wound Care"),
        ("medication_administration_included", "إدارة الأدوية / Medication Administration"),
        ("doctor_visits_included", "زيارات طبيب / Doctor Visits"),
        ("medical_equipment_included", "تجهيزات طبية / Medical Equipment"),
        ("transportation_included", "خدمة نقل / Transportation"),
    ]
    for key, label in service_map:
        if options.get(key):
            services_list.append(f"<li>{label}</li>")

    clauses_ar = [
        "تشمل خدمة الرعاية الصحية المنزلية الخدمات المحددة أعلاه فقط، وأي خدمات إضافية تستلزم اتفاقية مستقلة.",
        "يلتزم مزود الخدمة بتقديم الرعاية وفق معايير الجودة الطبية المعتمدة من وزارة الصحة السعودية.",
        "في حالات الطوارئ التي تستدعي تدخلاً طبياً عاجلاً، يتحمل الطرف الأول (المريض/وليّ الأمر) مسؤولية الاتصال بخدمات الطوارئ (911).",
        "يلتزم الطرف الأول بتسهيل وصول الفريق الطبي إلى مكان الخدمة خلال المواعيد المتفق عليها، وعدم إعاقة العمل.",
        "تُسدَّد الرسوم وفق جدول الأسعار المُرفق ولا تُردّ عند الإلغاء بعد مرور 24 ساعة من بدء الخدمة.",
        "يحق لمزود الخدمة إيقاف الخدمة فوراً في حال الاعتداء على الطاقم الطبي أو عدم الامتثال للتعليمات الطبية.",
        "تخضع بيانات المريض الطبية لأحكام نظام حماية البيانات الشخصية السعودي (PDPL) ولا تُشارَك إلا في الحالات التي ينص عليها النظام.",
        "لا تُعدّ هذه الاتفاقية ضماناً للشفاء التام، وتقدّم الخدمة بجهود وليس بنتائج.",
        "يتحمل الطرف الأول المسؤولية القانونية عن أي ضرر يلحق بفريق الرعاية نتيجة الإهمال أو سوء الاستخدام.",
        "يسري هذا العقد وفق قوانين المملكة العربية السعودية، وأي نزاع يُحسم أمام الجهة القضائية ذات الاختصاص في مدينة مقر المنشأة.",
        "يُعدّ هذا العقد المُولَّد إلكترونياً وثيقة قانونية مُلزِمة وفق نظام التعاملات الإلكترونية السعودي.",
    ]

    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"/><title>اتفاقية الرعاية الصحية المنزلية</title>{_BASE_CSS}</head>
<body><div class="page">

<div class="header-banner">
  <h1>اتفاقية الرعاية الصحية المنزلية</h1>
  <h2>Home Healthcare Service Agreement</h2>
</div>

<div class="section">
  <div class="section-title">أطراف الاتفاقية / Parties</div>
  <div class="section-body">
    <table class="info-table">
      <tr><td>اسم المريض</td><td><strong>{payload.get('patient_name') or '—'}</strong></td></tr>
      <tr><td>رقم الملف الطبي</td><td>{payload.get('mrn') or '—'}</td></tr>
      <tr><td>رقم هوية المريض</td><td>{payload.get('patient_id') or '—'}</td></tr>
      <tr><td>عنوان تقديم الخدمة</td><td>{payload.get('address') or '—'}</td></tr>
      <tr><td>الطبيب المحيل</td><td>{payload.get('physician_name') or '—'}</td></tr>
      <tr><td>جهة الإحالة (المنشأة)</td><td>{payload.get('referring_facility') or '—'}</td></tr>
      <tr><td>مزود الخدمة</td><td><strong>{payload.get('provider_name') or '—'}</strong></td></tr>
      <tr><td>ترخيص مزود الخدمة</td><td>{payload.get('provider_license') or '—'}</td></tr>
      <tr><td>الطرف المسؤول</td><td>{payload.get('responsible_party') or '—'}</td></tr>
      <tr><td>جهة الطوارئ</td><td>{payload.get('emergency_contact') or '—'}</td></tr>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-title">تفاصيل الخدمة / Service Details</div>
  <div class="section-body">
    <table class="info-table">
      <tr><td>تاريخ البدء</td><td>{payload.get('start_date') or '—'}</td></tr>
      <tr><td>مدة الخدمة</td><td>{payload.get('duration') or '—'}</td></tr>
      <tr><td>تكرار الزيارات</td><td>{payload.get('frequency') or '—'}</td></tr>
      <tr><td>نوع الباقة</td><td>{payload.get('package_type') or '—'}</td></tr>
      <tr><td>شروط التسعير</td><td>{payload.get('pricing_terms') or '—'}</td></tr>
    </table>
    {'<div style="margin-top:10px;"><strong>الخدمات المشمولة:</strong><ul style=\'padding-right:20px;margin-top:6px;\'>' + ''.join(services_list) + '</ul></div>' if services_list else ''}
  </div>
</div>

<div class="section">
  <div class="section-title">البنود القانونية / Legal Terms (11 Clauses)</div>
  <div class="section-body">
    <ol class="clauses">
      {''.join(f'<li>{clause}</li>' for clause in clauses_ar)}
    </ol>
  </div>
</div>

<div class="section">
  <div class="section-title">التوقيعات / Signatures</div>
  <div class="section-body" style="display:flex;flex-wrap:wrap;gap:16px;">
    <div class="signature-block" style="flex:1;min-width:200px;">
      <p style="font-size:11px;color:#64748b;">توقيع المريض / ولي الأمر</p>
      {sig_html}
      <div class="field-row" style="margin-top:8px;">
        <div class="field"><label>الاسم</label><span>{payload.get('patient_name') or '—'}</span></div>
        <div class="field"><label>التاريخ</label><span>{payload.get('start_date') or '—'}</span></div>
      </div>
    </div>
    <div class="signature-block" style="flex:1;min-width:200px;">
      <p style="font-size:11px;color:#64748b;">توقيع مزود الخدمة</p>
      {provider_sig_html}
      <div class="field-row" style="margin-top:8px;">
        <div class="field"><label>الاسم</label><span>{payload.get('provider_name') or '—'}</span></div>
        <div class="field"><label>التاريخ</label><span>{payload.get('start_date') or '—'}</span></div>
      </div>
    </div>
  </div>
</div>

<div class="footer">
  <p>اتفاقية مُولَّدة إلكترونياً — للاستخدام الطبي القانوني الرسمي</p>
</div>

</div></body></html>"""


def _render_equipment_lease_html(payload: Dict[str, Any]) -> str:
    options = payload.get("options") or {}
    sig_html = _sig_img(payload.get("lessee_signature_data"))

    clauses_ar = [
        "تظل ملكية الجهاز الطبي موضوع هذه الاتفاقية للمؤجر (المنشأة الصحية) في جميع الأوقات، ولا يحق للمستأجر التصرف فيها أو نقل حيازتها لأي طرف آخر.",
        "يلتزم المستأجر باستخدام الجهاز وفق التعليمات الطبية الصادرة من الطاقم الطبي المختص، ولأغراض علاجية فقط.",
        "يتحمل المستأجر المسؤولية الكاملة عن أي تلف أو خسارة تلحق بالجهاز نتيجة الإهمال أو سوء الاستخدام.",
        "يترتب على التأخير في إعادة الجهاز عند انتهاء مدة الإيجار رسوم يومية وفق قائمة الأسعار المعتمدة.",
        "يحق للمؤجر فحص الجهاز وصيانته في أي وقت بعد إبلاغ المستأجر مسبقاً لا يقل عن 12 ساعة.",
        "لا تشمل هذه الاتفاقية تكاليف المستهلكات والملحقات إلا إذا نُص عليها صراحةً في بند الخدمات.",
        "يُحظر على المستأجر التنازل عن هذه الاتفاقية أو السماح لأي طرف آخر باستخدام الجهاز.",
        "في حال السرقة أو الفقدان، يلتزم المستأجر بالإبلاغ الفوري للمؤجر والجهات الأمنية المختصة.",
        "في حال التخلف عن السداد، يحق للمؤجر استرداد الجهاز فوراً دون إنذار مسبق مع الاحتفاظ بحق المطالبة القانونية.",
        "يحق للمؤجر إنهاء هذه الاتفاقية فوراً في حال المخالفة الجوهرية لأي بند من بنودها.",
        "هذه الاتفاقية مُلزِمة للطرفين وتُعدّ محرراً إلكترونياً رسمياً وفق نظام التعاملات الإلكترونية السعودي.",
    ]

    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"/><title>اتفاقية تأجير الأجهزة الطبية</title>{_BASE_CSS}</head>
<body><div class="page">

<div class="header-banner">
  <h1>اتفاقية تأجير الأجهزة الطبية</h1>
  <h2>Medical Equipment Lease Agreement</h2>
</div>

<div class="section">
  <div class="section-title">تفاصيل الجهاز المُؤجَّر / Equipment Details</div>
  <div class="section-body">
    <table class="info-table">
      <tr><td>نوع الجهاز / الفئة</td><td><strong>{payload.get('equipment_type') or '—'} / {payload.get('equipment_category') or '—'}</strong></td></tr>
      <tr><td>الموديل</td><td>{payload.get('model') or '—'}</td></tr>
      <tr><td>الرقم التسلسلي</td><td>{payload.get('serial_number') or '—'}</td></tr>
      <tr><td>الملحقات</td><td>{payload.get('accessory_list') or '—'}</td></tr>
      <tr><td>الحالة عند التسليم</td><td>{payload.get('condition_on_delivery') or '—'}</td></tr>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-title">مدة الإيجار والتسعير / Duration & Pricing</div>
  <div class="section-body">
    <table class="info-table">
      <tr><td>تاريخ التسليم</td><td>{payload.get('delivery_date') or '—'}</td></tr>
      <tr><td>تاريخ رد الجهاز</td><td>{payload.get('pickup_return_date') or '—'}</td></tr>
      <tr><td>فترة الإيجار</td><td>{payload.get('rental_start_date') or '—'} ← {payload.get('rental_end_date') or '—'}</td></tr>
      <tr><td>مبلغ التأمين</td><td>{payload.get('deposit_amount') or '—'} ريال</td></tr>
      <tr><td>أجرة الإيجار</td><td>{payload.get('rental_amount') or '—'} | وضع التسعير: {payload.get('pricing_mode') or '—'}</td></tr>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-title">بيانات المستأجر / Lessee Details</div>
  <div class="section-body">
    <table class="info-table">
      <tr><td>هوية المستأجر</td><td>{payload.get('lessee_identity') or '—'}</td></tr>
      <tr><td>الصفة بالنسبة للمريض</td><td>{payload.get('relation_to_patient') or '—'}</td></tr>
      <tr><td>عنوان الخدمة</td><td>{payload.get('service_address') or '—'}</td></tr>
      <tr><td>جهة الاتصال للصيانة</td><td>{payload.get('maintenance_contact') or '—'}</td></tr>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-title">البنود القانونية / Legal Terms (11 Clauses)</div>
  <div class="section-body">
    <ol class="clauses">
      {''.join(f'<li>{clause}</li>' for clause in clauses_ar)}
    </ol>
  </div>
</div>

<div class="section">
  <div class="section-title">توقيع المستأجر / Lessee Signature</div>
  <div class="section-body">
    <div class="signature-block">
      <p style="font-size:12px;">أقرّ أنا الموقّع أدناه بالاطلاع على جميع بنود هذه الاتفاقية وقبولها.</p>
      {sig_html}
      <div class="field-row" style="margin-top:8px;">
        <div class="field"><label>الاسم</label><span>{payload.get('lessee_identity') or '—'}</span></div>
        <div class="field"><label>التاريخ</label><span>{payload.get('delivery_date') or '—'}</span></div>
      </div>
    </div>
  </div>
</div>

<div class="footer">
  <p>اتفاقية مُولَّدة إلكترونياً — للاستخدام الطبي القانوني الرسمي</p>
</div>

</div></body></html>"""


def _render_undertaking_html(payload: Dict[str, Any]) -> str:
    sig_html = _sig_img(payload.get("signature_data"))
    obligation_type = payload.get("obligation_type", "general_undertaking")

    obligation_labels = {
        "general_undertaking": "تعهد عام / General Undertaking",
        "financial_obligation": "التزام مالي / Financial Obligation",
        "compliance_undertaking": "تعهد امتثال / Compliance Undertaking",
        "guardian_responsibility": "مسؤولية وليّ الأمر / Guardian Responsibility",
        "post_discharge_care": "التزام رعاية ما بعد الخروج / Post-Discharge Care Commitment",
    }
    obligation_label = obligation_labels.get(obligation_type, obligation_type)

    clauses_ar = [
        "أتعهد تعهداً قانونياً مُلزِماً بالوفاء بجميع الالتزامات المذكورة في هذه الوثيقة تجاه المنشأة الصحية والطرف الآخر.",
        "يُقرّ الموقّع بأهليته القانونية الكاملة للتعاقد وعدم وجود أي عارض يُخلّ بهذه الأهلية.",
        "أُقرّ بأنني أُوقّع على هذه الوثيقة طوعاً وبعد فهم كامل لمضمونها دون أي إكراه أو ضغط.",
        "في حال الإخلال بأي من الالتزامات الواردة، تحتفظ المنشأة الصحية بحقها في المطالبة القانونية الكاملة.",
        "تُطبَّق أحكام الشريعة الإسلامية ونظام الرعاية الصحية السعودي على هذا التعهد في جميع النزاعات المتعلقة به.",
        "هذا التعهد مُلزِم قانونياً وفق نظام التعاملات الإلكترونية السعودي ويُعدّ وثيقة رسمية للاحتجاج والتنفيذ.",
    ]

    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"/><title>تعهد قانوني</title>{_BASE_CSS}</head>
<body><div class="page">

<div class="header-banner">
  <h1>تعهد قانوني</h1>
  <h2>Legal Undertaking — {obligation_label}</h2>
</div>

<div class="section">
  <div class="section-title">بيانات التعهد / Undertaking Details</div>
  <div class="section-body">
    <table class="info-table">
      <tr><td>طرف التعهد</td><td><strong>{payload.get('undertaking_party') or '—'}</strong></td></tr>
      <tr><td>بيانات الهوية</td><td>{payload.get('identity_details') or '—'}</td></tr>
      <tr><td>نوع الالتزام</td><td>{obligation_label}</td></tr>
      <tr><td>القضية المرتبطة</td><td>{payload.get('linked_case') or '—'}</td></tr>
      <tr><td>المريض المرتبط</td><td>{payload.get('linked_patient') or '—'}</td></tr>
      <tr><td>المستندات المرجعية</td><td>{payload.get('linked_document_refs') or '—'}</td></tr>
      <tr><td>تاريخ ووقت التعهد</td><td>{payload.get('undertaking_datetime') or '—'}</td></tr>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-title">نص التعهد / Undertaking Statement</div>
  <div class="section-body">
    <div class="legal-statement" dir="rtl">
      {payload.get('undertaking_statement') or 'أتعهد تعهداً صريحاً لا رجعة فيه بأن أفي بجميع الالتزامات والمسؤوليات المترتبة على موقفي وصفتي فيما يخص الحالة المشار إليها، وأُدرك أن هذا التعهد مُلزِم قانونياً.'}
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">البنود القانونية / Legal Terms</div>
  <div class="section-body">
    <ol class="clauses">
      {''.join(f'<li>{clause}</li>' for clause in clauses_ar)}
    </ol>
  </div>
</div>

<div class="section">
  <div class="section-title">التوقيع الرسمي / Official Signature</div>
  <div class="section-body">
    <div class="signature-block">
      <p style="font-size:12px;">أقرّ أنا الموقّع أدناه بصحة ما ورد في هذا التعهد وبالتزامالتام ببنوده القانونية.</p>
      {sig_html}
      <div class="field-row" style="margin-top:8px;">
        <div class="field"><label>اسم الموقّع</label><span>{payload.get('undertaking_party') or '—'}</span></div>
        <div class="field"><label>التاريخ</label><span>{payload.get('undertaking_datetime') or '—'}</span></div>
      </div>
    </div>
  </div>
</div>

<div class="footer">
  <p>تعهد مُولَّد إلكترونياً — للاستخدام الطبي القانوني الرسمي</p>
</div>

</div></body></html>"""


def _render_evidence_cover_html(
    *,
    case_id: str,
    package_reference: str,
    legal_state: str,
    package_index: Dict[str, Any],
    verification_meta: Dict[str, Any],
    discharge_case: Any,
) -> str:
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    doc_rows = []
    doc_map = [
        ("master_discharge_decision_document_id", "وثيقة قرار الخروج الطبي الرئيسية", "Master Discharge Decision Document"),
        ("patient_response_id", "سجل استجابة المريض", "Patient Response Record"),
    ]
    for key, label_ar, label_en in doc_map:
        val = package_index.get(key)
        doc_rows.append(f"<tr><td>{label_ar} / {label_en}</td><td style='direction:ltr;font-family:monospace;font-size:11px;'>{val or '—'}</td></tr>")

    count_rows = []
    count_map = [
        ("notice_presentations_count", "عدد سجلات تبليغ الإشعار", "Notice Presentations"),
        ("signature_logs_count", "عدد توقيعات التوثيق", "Signature Artifacts"),
        ("financial_ack_count", "إقرارات المسؤولية المالية", "Financial Acknowledgments"),
        ("promissory_note_count", "سندات لأمر", "Promissory Notes"),
        ("home_healthcare_agreement_count", "اتفاقيات الرعاية الصحية المنزلية", "Home Healthcare Agreements"),
        ("equipment_lease_count", "اتفاقيات تأجير الأجهزة الطبية", "Equipment Lease Agreements"),
        ("undertaking_count", "تعهدات قانونية", "Legal Undertakings"),
        ("escalation_count", "أحداث التصعيد", "Escalation Events"),
    ]
    for key, label_ar, label_en in count_map:
        count = package_index.get(key, 0)
        count_rows.append(f"<tr><td>{label_ar} / {label_en}</td><td style='text-align:center;font-weight:bold;'>{count}</td></tr>")

    state_label = {
        "DRAFT": "مسودة", "DECISION_ISSUED": "صدر القرار", "NOTICE_GENERATED": "تم إنشاء الإشعار",
        "NOTICE_PRESENTED": "تم التبليغ", "PATIENT_ACCEPTED": "قبول المريض",
        "PATIENT_REFUSED": "رفض المريض", "REFUSED_TO_SIGN": "رفض التوقيع",
        "UNABLE_TO_SIGN": "غير قادر على التوقيع", "ESCALATED": "مُصعَّد",
        "PACKAGE_FINALIZED": "حُزِمت الأدلة", "ARCHIVED": "مُؤرشَف",
    }.get(legal_state, legal_state)

    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"/><title>غلاف حزمة الأدلة القانونية</title>{_BASE_CSS}</head>
<body><div class="page">

<div class="header-banner" style="background:#0f172a;">
  <h1 style="font-size:20px;">حزمة الأدلة القانونية</h1>
  <h2>Legal Evidence Package — WathiqCare</h2>
  <p style="margin-top:6px;font-size:12px;opacity:.75;">مرجع الحزمة / Package Reference: <strong style="font-family:monospace;letter-spacing:1px;">{package_reference}</strong></p>
</div>

<div class="section" style="margin-top:12px;">
  <div class="section-title">معلومات الحزمة / Package Information</div>
  <div class="section-body">
    <table class="info-table">
      <tr><td>مرجع الحزمة</td><td><strong style="font-family:monospace;">{package_reference}</strong></td></tr>
      <tr><td>رقم القضية</td><td>{case_id}</td></tr>
      <tr><td>اسم المريض</td><td><strong>{discharge_case.patient_name or '—'}</strong></td></tr>
      <tr><td>رقم الملف الطبي</td><td>{discharge_case.mrn or '—'}</td></tr>
      <tr><td>تاريخ توليد الحزمة</td><td>{now_str}</td></tr>
      <tr><td>الحالة القانونية النهائية</td><td><strong>{state_label} ({legal_state})</strong></td></tr>
      <tr><td>تجزئة الحزمة (SHA-256)</td><td style="direction:ltr;font-family:monospace;font-size:10px;word-break:break-all;">{verification_meta.get('package_hash') or '—'}</td></tr>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-title">الوثائق المرتبطة / Linked Documents</div>
  <div class="section-body">
    <table class="info-table">
      {''.join(doc_rows)}
    </table>
  </div>
</div>

<div class="section">
  <div class="section-title">فهرس الأدلة / Document Index</div>
  <div class="section-body">
    <table class="info-table">
      <tr style="font-weight:bold;"><td>نوع الوثيقة / Document Type</td><td style="text-align:center;">العدد / Count</td></tr>
      {''.join(count_rows)}
    </table>
  </div>
</div>

<div class="section">
  <div class="section-title">بيان الأصالة والنزاهة / Integrity Statement</div>
  <div class="section-body">
    <div class="legal-statement" dir="rtl">
      تُعدّ هذه الحزمة سجلاً قانونياً رسمياً لجميع الوثائق المتعلقة بقضية رفض الخروج الطبي المشار إليها.
      تم توليد هذه الحزمة بواسطة منصة وثيق كير (WathiqCare)، وجميع مستنداتها تحمل تجزئات SHA-256 يمكن التحقق منها، مما يضمن سلامة البيانات وعدم التلاعب.
    </div>
    <div class="legal-statement" dir="ltr" style="border-right:none;border-left:4px solid #ca8a04;text-align:left;margin-top:8px;">
      This package constitutes an official legal record of all documents pertaining to the referenced medical discharge refusal case.
      All documents carry SHA-256 hashes verifiable at any time. Generated by WathiqCare platform.
    </div>
  </div>
</div>

<div class="footer">
  <p>حزمة مُولَّدة إلكترونياً — للاستخدام القانوني والتنظيمي الرسمي فقط</p>
  <p style="margin-top:4px;">هذه الوثيقة سرية وخاضعة لأحكام نظام حماية البيانات الشخصية السعودي (PDPL)</p>
</div>

</div></body></html>"""


def _render_generic_structured_html(title: str, payload: Dict[str, Any]) -> str:
    rows = "".join([f"<li><strong>{k}</strong>: {v}</li>" for k, v in payload.items()])
    return f"<html><body><h2>{title}</h2><ul>{rows}</ul></body></html>"
