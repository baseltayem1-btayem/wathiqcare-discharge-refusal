from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.core.database import SessionLocal
from backend.core.pdf_renderer import render_html_to_pdf
from backend.forms.medical_legal_forms_library import render_form_by_key
from backend.models.discharge_legal_workflow import (
	DischargeDocument,
	DischargeEncounter,
	DischargeSession,
	DischargeSessionAuditLog,
	DischargeSignature,
)
from backend.models.patient import Patient


@dataclass(frozen=True)
class TemplateDef:
	code: str
	title_en: str
	title_ar: str
	version: int
	default_clause_codes: List[str]


CLAUSE_LIBRARY: Dict[str, Dict[str, str]] = {
	"PATIENT_CAPACITY_COMPETENT": {
		"titleEn": "Patient Capacity Declaration",
		"titleAr": "إقرار الأهلية القانونية للمريض",
		"bodyEn": "The patient is assessed as competent and able to make informed decisions.",
		"bodyAr": "تم تقييم المريض على أنه كامل الأهلية وقادر على اتخاذ قرار مستنير.",
	},
	"SIGNER_IS_GUARDIAN": {
		"titleEn": "Guardian Representation",
		"titleAr": "إقرار تمثيل ولي الأمر",
		"bodyEn": "The guardian confirms legal authority to sign on behalf of the patient.",
		"bodyAr": "يؤكد ولي الأمر أحقيته النظامية في التوقيع نيابة عن المريض.",
	},
	"CLINICIAN_ATTESTS_CAPACITY_UNCERTAIN": {
		"titleEn": "Capacity Uncertain Attestation",
		"titleAr": "إثبات الطبيب عند عدم وضوح الأهلية",
		"bodyEn": "Clinical review is required before finalization due to uncertain patient capacity.",
		"bodyAr": "يتطلب الأمر مراجعة سريرية قبل الاعتماد النهائي لعدم وضوح أهلية المريض.",
	},
	"DISCHARGE_DECISION_EXPLAINED": {
		"titleEn": "Discharge Decision Explained",
		"titleAr": "إثبات شرح قرار الخروج",
		"bodyEn": "The discharge decision and follow-up instructions were explained to the patient or legal representative.",
		"bodyAr": "تم شرح قرار الخروج وتعليمات المتابعة للمريض أو ممثله النظامي.",
	},
	"AMA_RISK_DISCLOSURE": {
		"titleEn": "AMA Risk Disclosure",
		"titleAr": "إفصاح مخاطر الخروج خلاف النصيحة الطبية",
		"bodyEn": "The risks of refusing recommended discharge were disclosed and understood.",
		"bodyAr": "تم الإفصاح عن مخاطر رفض الخروج الموصى به وتم الإقرار بفهمها.",
	},
	"REFUSAL_TO_DISCHARGE_RISK_NOTICE": {
		"titleEn": "Refusal Risk Notice",
		"titleAr": "إشعار مخاطر رفض الخروج",
		"bodyEn": "Refusal to leave after discharge decision may create avoidable medical, administrative, and financial consequences.",
		"bodyAr": "قد يترتب على رفض مغادرة المستشفى بعد قرار الخروج آثار طبية وإدارية ومالية يمكن تفاديها.",
	},
	"DISCHARGE_INSTRUCTIONS_RECEIVED": {
		"titleEn": "Instructions Acknowledgment",
		"titleAr": "إقرار استلام تعليمات الخروج",
		"bodyEn": "The patient or representative confirms receiving and understanding discharge instructions.",
		"bodyAr": "يؤكد المريض أو ممثله استلام وفهم تعليمات الخروج.",
	},
	"HOME_EQUIPMENT_RETURN_UNDERTAKING": {
		"titleEn": "Equipment Undertaking",
		"titleAr": "تعهد الأجهزة المنزلية",
		"bodyEn": "Any issued home medical equipment must be handled according to hospital policy and return terms.",
		"bodyAr": "يتم التعامل مع الأجهزة الطبية المنزلية المصروفة وفق سياسة المنشأة وشروط الإرجاع.",
	},
	"FINANCIAL_GUARANTEE_CLAUSE": {
		"titleEn": "Financial Guarantee Clause",
		"titleAr": "بند الضمان المالي",
		"bodyEn": "The signer acknowledges potential financial responsibility in applicable scenarios.",
		"bodyAr": "يقر الموقّع بتحمل المسؤولية المالية المحتملة في الحالات المطبقة.",
	},
	"WITNESS_ATTESTATION_REQUIRED": {
		"titleEn": "Witness Attestation",
		"titleAr": "اشتراط إثبات الشاهد",
		"bodyEn": "Witness attestation is required for this high-risk workflow.",
		"bodyAr": "يتطلب هذا المسار عالي الخطورة إثبات شاهد.",
	},
	"PHYSICIAN_EXPLANATION_ATTESTATION": {
		"titleEn": "Physician Explanation Attestation",
		"titleAr": "إثبات شرح الطبيب",
		"bodyEn": "The physician attests that diagnosis, risks, and options were clearly explained.",
		"bodyAr": "يُثبت الطبيب أنه تم شرح التشخيص والمخاطر والخيارات بشكل واضح.",
	},
	"CHART_FINALIZATION_STATEMENT": {
		"titleEn": "Chart Finalization Statement",
		"titleAr": "بيان اعتماد السجل الطبي",
		"bodyEn": "This finalized form is locked and persisted as part of the chart-level legal record.",
		"bodyAr": "تم اعتماد هذا النموذج نهائيا وحفظه كسجل قانوني ضمن الملف الطبي.",
	},
}


TEMPLATES: Dict[str, TemplateDef] = {
	"DISCHARGE_DECISION_NOTICE": TemplateDef(
		code="DISCHARGE_DECISION_NOTICE",
		title_en="Discharge Decision Notice",
		title_ar="إشعار قرار الخروج",
		version=1,
		default_clause_codes=[
			"DISCHARGE_DECISION_EXPLAINED",
			"PHYSICIAN_EXPLANATION_ATTESTATION",
			"CHART_FINALIZATION_STATEMENT",
		],
	),
	"REFUSAL_TO_DISCHARGE": TemplateDef(
		code="REFUSAL_TO_DISCHARGE",
		title_en="Refusal to Discharge",
		title_ar="رفض الخروج",
		version=1,
		default_clause_codes=[
			"REFUSAL_TO_DISCHARGE_RISK_NOTICE",
			"DISCHARGE_DECISION_EXPLAINED",
			"PHYSICIAN_EXPLANATION_ATTESTATION",
		],
	),
	"DISCHARGE_INSTRUCTIONS_ACK": TemplateDef(
		code="DISCHARGE_INSTRUCTIONS_ACK",
		title_en="Discharge Instructions Acknowledgment",
		title_ar="إقرار تعليمات الخروج",
		version=1,
		default_clause_codes=[
			"DISCHARGE_INSTRUCTIONS_RECEIVED",
			"DISCHARGE_DECISION_EXPLAINED",
		],
	),
	"FINAL_MEDICO_LEGAL_DISCHARGE_RECORD": TemplateDef(
		code="FINAL_MEDICO_LEGAL_DISCHARGE_RECORD",
		title_en="Final Medico-Legal Discharge Record",
		title_ar="السجل الطبي القانوني النهائي للخروج",
		version=1,
		default_clause_codes=[
			"CHART_FINALIZATION_STATEMENT",
			"PHYSICIAN_EXPLANATION_ATTESTATION",
		],
	),
}


TEMPLATE_KEY_MAP = {
	"DISCHARGE_DECISION_NOTICE": "discharge_decision_record",
	"REFUSAL_TO_DISCHARGE": "discharge_refusal_form",
	"DISCHARGE_INSTRUCTIONS_ACK": "informed_consent",
	"FINAL_MEDICO_LEGAL_DISCHARGE_RECORD": "discharge_decision_record",
}


def _utc_now() -> datetime:
	return datetime.utcnow()


def _iso(value: Optional[datetime]) -> Optional[str]:
	return value.isoformat() if value else None


def _signature_hash(payload: str) -> str:
	return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _ensure_metadata(session: DischargeSession) -> Dict[str, Any]:
	return dict(session.public_metadata or {})


def _merge_dict(base: Dict[str, Any], patch: Dict[str, Any]) -> Dict[str, Any]:
	merged = dict(base)
	for key, value in patch.items():
		if isinstance(value, dict) and isinstance(merged.get(key), dict):
			merged[key] = _merge_dict(dict(merged[key]), value)
		else:
			merged[key] = value
	return merged


def _derive_age(patient: Patient) -> Optional[int]:
	if not patient.date_of_birth:
		return None
	today = datetime.utcnow().date()
	years = today.year - patient.date_of_birth.year
	if (today.month, today.day) < (patient.date_of_birth.month, patient.date_of_birth.day):
		years -= 1
	return max(years, 0)


def _resolve_dynamic_clause_codes(context: Dict[str, Any]) -> List[str]:
	discharge = context.get("discharge") if isinstance(context.get("discharge"), dict) else {}
	patient = context.get("patient") if isinstance(context.get("patient"), dict) else {}
	result: List[str] = []

	age = patient.get("age")
	if isinstance(age, int) and age < 18:
		result.append("SIGNER_IS_GUARDIAN")

	if str(discharge.get("type") or "").upper() == "AMA":
		result.append("AMA_RISK_DISCLOSURE")
		result.append("WITNESS_ATTESTATION_REQUIRED")

	if bool(discharge.get("homeEquipmentIssued")):
		result.append("HOME_EQUIPMENT_RETURN_UNDERTAKING")

	if bool(discharge.get("financialGuaranteeRequired")):
		result.append("FINANCIAL_GUARANTEE_CLAUSE")

	return result


class DischargeMedicoLegalFormsService:
	def list_templates(self, category: Optional[str]) -> List[Dict[str, Any]]:
		if category and category != "discharge":
			return []
		return [
			{
				"code": template.code,
				"titleEn": template.title_en,
				"titleAr": template.title_ar,
				"category": "discharge",
				"version": template.version,
				"status": "active",
			}
			for template in TEMPLATES.values()
		]

	def get_template(self, template_code: str) -> Dict[str, Any]:
		template = TEMPLATES.get(template_code)
		if not template:
			raise ValueError("Template not found")
		return {
			"code": template.code,
			"titleEn": template.title_en,
			"titleAr": template.title_ar,
			"category": "discharge",
			"version": template.version,
			"status": "active",
			"defaultClauseCodes": template.default_clause_codes,
		}

	def create_instance(
		self,
		*,
		tenant_id: str,
		actor_user_id: str,
		template_code: str,
		patient_id: str,
		encounter_id: str,
		language_mode: str,
	) -> Dict[str, Any]:
		template = TEMPLATES.get(template_code)
		if not template:
			raise ValueError("Unsupported templateCode")

		db = SessionLocal()
		try:
			patient = (
				db.query(Patient)
				.filter(Patient.id == patient_id, Patient.tenant_id == tenant_id)
				.first()
			)
			if not patient:
				raise ValueError("Patient not found")

			encounter = (
				db.query(DischargeEncounter)
				.filter(
					DischargeEncounter.id == encounter_id,
					DischargeEncounter.tenant_id == tenant_id,
					DischargeEncounter.patient_id == patient_id,
				)
				.first()
			)
			if not encounter:
				raise ValueError("Encounter not found")

			token_hash = hashlib.sha256(f"{uuid.uuid4()}:{tenant_id}".encode("utf-8")).hexdigest()
			metadata: Dict[str, Any] = {
				"templateCode": template.code,
				"templateVersion": template.version,
				"languageMode": language_mode,
				"status": "draft",
				"dataSnapshot": {},
				"sectionInstances": [],
				"resolvedClauseCodes": [],
				"resolvedClauses": [],
				"signerContext": {
					"signerType": "patient",
					"signerName": "",
					"patientCapacity": "competent",
					"validationOutcome": "needs_review",
					"validationReasons": ["Signer validation pending"],
					"witnessRequired": False,
					"clinicianAttestationRequired": False,
				},
			}

			session = DischargeSession(
				tenant_id=tenant_id,
				patient_id=patient.id,
				encounter_id=encounter.id,
				token_hash=token_hash,
				token_expires_at=_utc_now() + timedelta(days=7),
				access_status="internal",
				workflow_status="draft",
				initiated_by_user_id=actor_user_id,
				source_system="medico_legal_forms.discharge",
				one_time_access=False,
				otp_enabled=False,
				payment_required=False,
				workflow_sequence=["create", "autofill", "resolve_clauses", "validate_signer", "sign", "finalize"],
				public_metadata=metadata,
			)
			db.add(session)
			db.flush()

			document = DischargeDocument(
				session_id=session.id,
				document_type=template.code,
				document_version=str(template.version),
				language="ar" if language_mode == "arabic" else "bilingual",
				content_snapshot={},
				rendered_html="",
				status="draft",
			)
			db.add(document)

			db.add(
				DischargeSessionAuditLog(
					session_id=session.id,
					event_type="FORM_CREATED",
					actor_type="user",
					actor_id=actor_user_id,
					event_metadata={
						"templateCode": template.code,
						"templateVersion": template.version,
						"patientId": patient_id,
						"encounterId": encounter_id,
					},
				)
			)

			db.commit()

			return {
				"formInstanceId": session.id,
				"status": "draft",
				"templateVersion": template.version,
			}
		except Exception:
			db.rollback()
			raise
		finally:
			db.close()

	def _get_session(self, db: Session, tenant_id: str, instance_id: str) -> DischargeSession:
		session = (
			db.query(DischargeSession)
			.filter(DischargeSession.id == instance_id, DischargeSession.tenant_id == tenant_id)
			.first()
		)
		if not session:
			raise ValueError("Form instance not found")
		return session

	def autofill(self, *, tenant_id: str, actor_user_id: str, instance_id: str) -> Dict[str, Any]:
		db = SessionLocal()
		try:
			session = self._get_session(db, tenant_id, instance_id)
			patient = db.query(Patient).filter(Patient.id == session.patient_id).first()
			encounter = db.query(DischargeEncounter).filter(DischargeEncounter.id == session.encounter_id).first()
			if not patient or not encounter:
				raise ValueError("Unable to hydrate patient/encounter context")

			metadata = _ensure_metadata(session)
			snapshot = dict(metadata.get("dataSnapshot") or {})
			snapshot = _merge_dict(
				snapshot,
				{
					"patient": {
						"id": patient.id,
						"mrn": patient.mrn,
						"fullName": patient.full_name,
						"nationalId": patient.national_id,
						"age": _derive_age(patient),
					},
					"encounter": {
						"id": encounter.id,
						"externalEncounterId": encounter.external_encounter_id,
						"status": encounter.status,
						"dischargeOrderIssuedAt": _iso(encounter.discharge_order_issued_at),
					},
				},
			)
			metadata["dataSnapshot"] = snapshot
			session.public_metadata = metadata

			db.add(
				DischargeSessionAuditLog(
					session_id=session.id,
					event_type="AUTO_FILLED",
					actor_type="user",
					actor_id=actor_user_id,
					event_metadata={"fields": ["patient", "encounter"]},
				)
			)
			db.commit()
			return {"formInstanceId": session.id, "status": "draft"}
		except Exception:
			db.rollback()
			raise
		finally:
			db.close()

	def resolve_clauses(
		self,
		*,
		tenant_id: str,
		actor_user_id: str,
		instance_id: str,
		context_overrides: Dict[str, Any],
	) -> Dict[str, Any]:
		db = SessionLocal()
		try:
			session = self._get_session(db, tenant_id, instance_id)
			metadata = _ensure_metadata(session)
			template_code = str(metadata.get("templateCode") or "")
			template = TEMPLATES.get(template_code)
			if not template:
				raise ValueError("Template metadata is missing")

			snapshot = dict(metadata.get("dataSnapshot") or {})
			snapshot = _merge_dict(snapshot, context_overrides or {})
			dynamic_clause_codes = _resolve_dynamic_clause_codes(snapshot)
			clause_codes = list(dict.fromkeys(template.default_clause_codes + dynamic_clause_codes))

			resolved_clauses = [
				{
					"code": code,
					"titleEn": CLAUSE_LIBRARY[code]["titleEn"],
					"titleAr": CLAUSE_LIBRARY[code]["titleAr"],
					"bodyEn": CLAUSE_LIBRARY[code]["bodyEn"],
					"bodyAr": CLAUSE_LIBRARY[code]["bodyAr"],
				}
				for code in clause_codes
				if code in CLAUSE_LIBRARY
			]

			metadata["dataSnapshot"] = snapshot
			metadata["resolvedClauseCodes"] = clause_codes
			metadata["resolvedClauses"] = resolved_clauses
			session.public_metadata = metadata

			db.add(
				DischargeSessionAuditLog(
					session_id=session.id,
					event_type="CLAUSES_RESOLVED",
					actor_type="user",
					actor_id=actor_user_id,
					event_metadata={"resolvedClauseCodes": clause_codes},
				)
			)
			db.commit()
			return {
				"formInstanceId": session.id,
				"resolvedClauseCodes": clause_codes,
			}
		except Exception:
			db.rollback()
			raise
		finally:
			db.close()

	def validate_signer(
		self,
		*,
		tenant_id: str,
		actor_user_id: str,
		instance_id: str,
		signer_payload: Dict[str, Any],
	) -> Dict[str, Any]:
		db = SessionLocal()
		try:
			session = self._get_session(db, tenant_id, instance_id)
			metadata = _ensure_metadata(session)
			snapshot = dict(metadata.get("dataSnapshot") or {})
			discharge = snapshot.get("discharge") if isinstance(snapshot.get("discharge"), dict) else {}

			signer_type = str(signer_payload.get("signerType") or "patient")
			signer_name = str(signer_payload.get("signerName") or "").strip()
			patient_capacity = str(signer_payload.get("patientCapacity") or "competent")
			reasons: List[str] = []
			outcome = "valid"
			witness_required = False
			clinician_attestation_required = False

			if patient_capacity == "competent" and signer_type != "patient":
				outcome = "needs_review"
				reasons.append("Competent patient should sign directly")

			if patient_capacity == "minor" and signer_type != "guardian":
				outcome = "blocked"
				reasons.append("Minor requires guardian signer")

			if patient_capacity == "incapacitated" and signer_type not in {"guardian", "representative"}:
				outcome = "blocked"
				reasons.append("Incapacitated patient requires legal representative")

			if patient_capacity == "uncertain":
				outcome = "needs_review"
				clinician_attestation_required = True
				reasons.append("Capacity uncertain requires clinician attestation")

			if str(discharge.get("type") or "").upper() == "AMA":
				witness_required = True

			signer_context = {
				"signerType": signer_type,
				"signerName": signer_name,
				"signerNationalId": signer_payload.get("signerNationalId"),
				"relationshipToPatient": signer_payload.get("relationshipToPatient"),
				"patientCapacity": patient_capacity,
				"validationOutcome": outcome,
				"validationReasons": reasons,
				"witnessRequired": witness_required,
				"clinicianAttestationRequired": clinician_attestation_required,
			}

			metadata["signerContext"] = signer_context
			session.public_metadata = metadata

			db.add(
				DischargeSessionAuditLog(
					session_id=session.id,
					event_type="SIGNER_VALIDATED",
					actor_type="user",
					actor_id=actor_user_id,
					event_metadata={"signerContext": signer_context},
				)
			)
			db.commit()
			return signer_context
		except Exception:
			db.rollback()
			raise
		finally:
			db.close()

	def update_draft(
		self,
		*,
		tenant_id: str,
		actor_user_id: str,
		instance_id: str,
		patch_payload: Dict[str, Any],
	) -> Dict[str, Any]:
		db = SessionLocal()
		try:
			session = self._get_session(db, tenant_id, instance_id)
			if session.workflow_status == "finalized":
				raise ValueError("Finalized forms are immutable")

			metadata = _ensure_metadata(session)
			current_snapshot = dict(metadata.get("dataSnapshot") or {})
			metadata["dataSnapshot"] = _merge_dict(current_snapshot, patch_payload or {})
			session.public_metadata = metadata

			db.add(
				DischargeSessionAuditLog(
					session_id=session.id,
					event_type="FORM_EDITED",
					actor_type="user",
					actor_id=actor_user_id,
					event_metadata={"keys": list((patch_payload or {}).keys())},
				)
			)
			db.commit()
			return {"formInstanceId": session.id, "status": session.workflow_status}
		except Exception:
			db.rollback()
			raise
		finally:
			db.close()

	def add_signature(
		self,
		*,
		tenant_id: str,
		actor_user_id: str,
		instance_id: str,
		signature_payload: Dict[str, Any],
	) -> Dict[str, Any]:
		db = SessionLocal()
		try:
			session = self._get_session(db, tenant_id, instance_id)
			blob = str(signature_payload.get("signatureBlob") or "").strip()
			if not blob:
				raise ValueError("signatureBlob is required")

			document = (
				db.query(DischargeDocument)
				.filter(DischargeDocument.session_id == session.id)
				.order_by(DischargeDocument.created_at.desc())
				.first()
			)

			signature = DischargeSignature(
				session_id=session.id,
				document_id=document.id if document else None,
				signer_name=str(signature_payload.get("signerName") or "").strip() or "Unknown",
				signer_role=str(signature_payload.get("signerType") or "patient"),
				signature_storage_url="inline:base64",
				signature_hash=_signature_hash(blob),
				ip_address=str(signature_payload.get("ip") or "") or None,
				user_agent=str(signature_payload.get("userAgent") or "") or None,
				device_fingerprint=str(signature_payload.get("device") or "") or None,
				signed_at=_utc_now(),
			)
			db.add(signature)

			db.add(
				DischargeSessionAuditLog(
					session_id=session.id,
					event_type="SIGNATURE_CAPTURED",
					actor_type="user",
					actor_id=actor_user_id,
					event_metadata={"signerType": signature.signer_role},
				)
			)
			db.commit()
			return {
				"signatureId": signature.id,
				"signerType": signature.signer_role,
				"signedAt": _iso(signature.signed_at),
			}
		except Exception:
			db.rollback()
			raise
		finally:
			db.close()

	def finalize(self, *, tenant_id: str, actor_user_id: str, instance_id: str) -> Dict[str, Any]:
		db = SessionLocal()
		try:
			session = self._get_session(db, tenant_id, instance_id)
			metadata = _ensure_metadata(session)
			signer_context = dict(metadata.get("signerContext") or {})
			outcome = str(signer_context.get("validationOutcome") or "needs_review")
			if outcome != "valid":
				raise ValueError("Cannot finalize without valid signer validation")

			clause_codes = list(metadata.get("resolvedClauseCodes") or [])
			if not clause_codes:
				raise ValueError("Cannot finalize without resolved clauses")

			has_signature = (
				db.query(DischargeSignature)
				.filter(DischargeSignature.session_id == session.id)
				.count()
			) > 0
			if not has_signature:
				raise ValueError("Cannot finalize without captured signature")

			template_code = str(metadata.get("templateCode") or "")
			template_key = TEMPLATE_KEY_MAP.get(template_code)
			if not template_key:
				raise ValueError("No rendering profile for template")

			snapshot = dict(metadata.get("dataSnapshot") or {})
			patient_ctx = snapshot.get("patient") if isinstance(snapshot.get("patient"), dict) else {}
			encounter_ctx = snapshot.get("encounter") if isinstance(snapshot.get("encounter"), dict) else {}
			signer_name = str(signer_context.get("signerName") or "")

			render_context = {
				"patient_name": str(patient_ctx.get("fullName") or ""),
				"patient_id_number": str(patient_ctx.get("nationalId") or ""),
				"medical_record_number": str(patient_ctx.get("mrn") or ""),
				"room_number": "",
				"department": "",
				"attending_physician": "",
				"discharge_decision_at": str(encounter_ctx.get("dischargeOrderIssuedAt") or ""),
				"generated_at": _iso(_utc_now()) or "",
				"reference_number": instance_id,
				"discussion_summary": "",
				"refusal_reason": "",
				"patient_signature": signer_name,
				"relationship": str(signer_context.get("relationshipToPatient") or ""),
			}
			html = render_form_by_key(template_key, render_context)

			out_dir = Path("backend/generated/medico_legal_forms") / session.id
			out_dir.mkdir(parents=True, exist_ok=True)
			pdf_path = out_dir / f"{template_key}_finalized.pdf"
			render_html_to_pdf(html_content=html, output_path=pdf_path, title=template_code)

			document = (
				db.query(DischargeDocument)
				.filter(DischargeDocument.session_id == session.id)
				.order_by(DischargeDocument.created_at.desc())
				.first()
			)
			if not document:
				document = DischargeDocument(
					session_id=session.id,
					document_type=template_code,
					document_version=str(metadata.get("templateVersion") or "1"),
					language="bilingual",
					content_snapshot=snapshot,
					rendered_html=html,
					status="finalized",
					signed_at=_utc_now(),
				)
				db.add(document)
				db.flush()
			else:
				document.content_snapshot = snapshot
				document.rendered_html = html
				document.pdf_url = str(pdf_path)
				document.pdf_hash_sha256 = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
				document.status = "finalized"
				document.signed_at = _utc_now()

			metadata["status"] = "finalized"
			metadata["lockedAt"] = _iso(_utc_now())
			metadata["lockedBy"] = actor_user_id
			metadata["chartDocumentId"] = f"chart-{session.id}"
			session.public_metadata = metadata
			session.workflow_status = "finalized"
			session.completed_at = _utc_now()

			db.add(
				DischargeSessionAuditLog(
					session_id=session.id,
					event_type="FORM_FINALIZED",
					actor_type="user",
					actor_id=actor_user_id,
					event_metadata={"chartDocumentId": metadata["chartDocumentId"]},
				)
			)
			db.add(
				DischargeSessionAuditLog(
					session_id=session.id,
					event_type="PDF_EXPORTED",
					actor_type="system",
					actor_id=actor_user_id,
					event_metadata={"pdfUrl": str(pdf_path)},
				)
			)
			db.add(
				DischargeSessionAuditLog(
					session_id=session.id,
					event_type="CHART_SAVED",
					actor_type="system",
					actor_id=actor_user_id,
					event_metadata={"chartDocumentId": metadata["chartDocumentId"]},
				)
			)

			db.commit()
			return {
				"status": "finalized",
				"chartDocumentId": metadata["chartDocumentId"],
				"pdfUrl": f"/api/forms/instances/{session.id}/pdf",
			}
		except Exception:
			db.rollback()
			raise
		finally:
			db.close()

	def get_instance(self, *, tenant_id: str, instance_id: str) -> Dict[str, Any]:
		db = SessionLocal()
		try:
			session = self._get_session(db, tenant_id, instance_id)
			metadata = _ensure_metadata(session)
			return {
				"id": session.id,
				"templateCode": metadata.get("templateCode"),
				"status": session.workflow_status,
				"patientId": session.patient_id,
				"encounterId": session.encounter_id,
				"languageMode": metadata.get("languageMode"),
				"signerContext": metadata.get("signerContext"),
				"sections": metadata.get("sectionInstances") or [],
				"resolvedClauses": metadata.get("resolvedClauses") or [],
				"dataSnapshot": metadata.get("dataSnapshot") or {},
				"chartDocumentId": metadata.get("chartDocumentId"),
				"finalPdfDocumentId": metadata.get("chartDocumentId"),
				"createdAt": _iso(session.created_at),
				"updatedAt": _iso(session.updated_at),
			}
		finally:
			db.close()

	def list_chart_forms(self, *, tenant_id: str, patient_id: str) -> List[Dict[str, Any]]:
		db = SessionLocal()
		try:
			sessions = (
				db.query(DischargeSession)
				.filter(
					DischargeSession.tenant_id == tenant_id,
					DischargeSession.patient_id == patient_id,
					DischargeSession.workflow_status == "finalized",
				)
				.order_by(DischargeSession.updated_at.desc())
				.all()
			)
			result: List[Dict[str, Any]] = []
			for session in sessions:
				metadata = _ensure_metadata(session)
				result.append(
					{
						"formInstanceId": session.id,
						"templateCode": metadata.get("templateCode"),
						"chartDocumentId": metadata.get("chartDocumentId"),
						"finalizedAt": _iso(session.completed_at),
						"pdfUrl": f"/api/forms/instances/{session.id}/pdf",
					}
				)
			return result
		finally:
			db.close()

	def get_pdf_path(self, *, tenant_id: str, instance_id: str) -> Path:
		db = SessionLocal()
		try:
			session = self._get_session(db, tenant_id, instance_id)
			document = (
				db.query(DischargeDocument)
				.filter(DischargeDocument.session_id == session.id)
				.order_by(DischargeDocument.updated_at.desc())
				.first()
			)
			if not document or not document.pdf_url:
				raise ValueError("PDF not generated")
			path = Path(document.pdf_url)
			if not path.exists():
				raise ValueError("PDF file is missing")
			return path
		finally:
			db.close()

	def list_audit(self, *, tenant_id: str, instance_id: str) -> List[Dict[str, Any]]:
		db = SessionLocal()
		try:
			session = self._get_session(db, tenant_id, instance_id)
			events = (
				db.query(DischargeSessionAuditLog)
				.filter(DischargeSessionAuditLog.session_id == session.id)
				.order_by(DischargeSessionAuditLog.event_time.asc())
				.all()
			)
			return [
				{
					"eventType": item.event_type,
					"timestamp": _iso(item.event_time),
					"actorType": item.actor_type,
					"actorId": item.actor_id,
					"details": item.event_metadata,
				}
				for item in events
			]
		finally:
			db.close()
