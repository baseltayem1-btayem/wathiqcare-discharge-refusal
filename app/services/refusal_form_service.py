"""
Refusal Forms Service
=====================
Maintains the forms template library and handles form generation, retrieval,
and download for refused / escalated consents.

Available form types
--------------------
- medical_discharge_refusal       Medical Discharge Refusal Form
- financial_responsibility_notice Financial Responsibility Notice /
                                   Patient Cost Acknowledgment
- procedure_refusal               Procedure Consent Refusal Form
"""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.consent import Consent
from app.models.patient import Patient
from app.models.refusal_form import RefusalForm
from app.schemas.refusal_form import RefusalFormGenerate, RefusalFormTemplate
from app.services import audit_service

# Hours a patient must be observed after discharge refusal (per Saudi MOH regulations)
DISCHARGE_REFUSAL_OBSERVATION_HOURS = 24

# ---------------------------------------------------------------------------
# Template registry
# ---------------------------------------------------------------------------

FORM_TEMPLATES: List[RefusalFormTemplate] = [
    RefusalFormTemplate(
        form_type="medical_discharge_refusal",
        title="Medical Discharge Refusal Form",
        description=(
            "Documents the patient's informed refusal of medical discharge advice. "
            "Required under PDPL Article 12 and Saudi MOH Patient Rights Charter."
        ),
        required_consent_statuses=["refused", "escalated"],
        fields=[
            "patient_name",
            "national_id",
            "date_of_birth",
            "gender",
            "consent_id",
            "refusal_reason",
            "icd11_codes",
            "procedure_description",
            "attending_doctor",
            "refusal_date",
            "escalation_status",
            "required_actions",
            "observation_hours_required",
            "notes",
        ],
    ),
    RefusalFormTemplate(
        form_type="financial_responsibility_notice",
        title="Financial Responsibility Notice / Patient Cost Acknowledgment",
        description=(
            "Notifies the patient of full financial responsibility arising from refusal "
            "of prescribed treatment or discharge advice, as required by Saudi healthcare "
            "billing regulations."
        ),
        required_consent_statuses=["refused", "escalated"],
        fields=[
            "patient_name",
            "national_id",
            "consent_id",
            "refusal_reason",
            "procedure_description",
            "financial_liability_statement",
            "acknowledgment_date",
            "notes",
        ],
    ),
    RefusalFormTemplate(
        form_type="procedure_refusal",
        title="Procedure Consent Refusal Form",
        description=(
            "Formal documentation of patient refusal of a specific medical procedure, "
            "including ICD-11 diagnosis codes and attending-physician attestation."
        ),
        required_consent_statuses=["refused", "escalated"],
        fields=[
            "patient_name",
            "national_id",
            "date_of_birth",
            "gender",
            "consent_id",
            "consent_type",
            "icd11_codes",
            "procedure_description",
            "refusal_reason",
            "attending_doctor",
            "refusal_date",
            "high_risk_flag",
            "notes",
        ],
    ),
]

TEMPLATE_INDEX = {t.form_type: t for t in FORM_TEMPLATES}

# Statuses that permit form generation
ELIGIBLE_STATUSES = {"refused", "escalated"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_template(form_type: str) -> Optional[RefusalFormTemplate]:
    return TEMPLATE_INDEX.get(form_type)


def get_template(form_type: str) -> Optional[RefusalFormTemplate]:
    """Public accessor for a single template by form_type."""
    return TEMPLATE_INDEX.get(form_type)


def _render_form_data(
    template: RefusalFormTemplate,
    consent: Consent,
    patient: Patient,
    request: "RefusalFormGenerate",
) -> dict:
    """Populate form fields from live consent + patient data plus request overrides."""
    now = datetime.now(timezone.utc)
    base = {
        "form_type": template.form_type,
        "title": template.title,
        # ── patient identity ─────────────────────────────────────────────────
        "patient_name": patient.full_name,
        "national_id": patient.national_id,
        "date_of_birth": str(patient.date_of_birth),
        "gender": patient.gender,
        "patient_phone": patient.contact_phone or "",
        # MRN: first 8 hex chars of patient UUID (provisional — no dedicated MRN column yet)
        "mrn": patient.id[:8].upper(),
        # ── consent / clinical ────────────────────────────────────────────────
        "consent_id": consent.id,
        "consent_type": consent.consent_type,
        "refusal_reason": consent.refusal_reason or "",
        "icd11_codes": consent.icd11_codes or [],
        "procedure_description": consent.procedure_description or "",
        "refusal_date": (
            consent.escalated_at or consent.updated_at or consent.created_at
        ).isoformat(),
        "escalation_status": consent.status,
        "is_escalated": consent.is_escalated,
        # ── physician (from request) ──────────────────────────────────────────
        "physician_name": request.physician_name or "",
        "physician_specialty": request.physician_specialty or "",
        "physician_license_number": request.physician_license_number or "",
        "department": request.department or "",
        # ── clinical supplements (from request) ──────────────────────────────
        "risk_summary": request.risk_summary or "",
        "alternatives_offered": request.alternatives_offered or "",
        # ── institutional metadata ────────────────────────────────────────────
        "hospital_name": request.hospital_name or "WathiqCare Hospital",
        "form_number": f"WQ-RF-{consent.id[:8].upper()}",
        "form_version": "v1.0",
        "generated_date": now.strftime("%Y-%m-%d"),
        "generated_time": now.strftime("%H:%M UTC"),
        "generated_at": now.isoformat(),
    }

    if template.form_type == "medical_discharge_refusal":
        base["observation_hours_required"] = DISCHARGE_REFUSAL_OBSERVATION_HOURS
        base["required_actions"] = [
            "Notify legal officer",
            "Schedule patient interview within 24 hours",
            "Document patient's mental competency assessment",
            "Prepare legal discharge waiver if applicable",
        ]

    if template.form_type == "financial_responsibility_notice":
        base["financial_liability_statement"] = (
            "By refusing the prescribed medical treatment or discharge advice, the patient "
            "acknowledges full financial responsibility for any costs, complications, or "
            "extended care arising from this refusal, in accordance with Saudi healthcare "
            "billing regulations."
        )
        base["acknowledgment_date"] = now.isoformat()

    if template.form_type == "procedure_refusal":
        from app.services.icd11_service import is_refusal_high_risk

        base["high_risk_flag"] = is_refusal_high_risk(consent.icd11_codes or [])

    return base


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def list_templates() -> List[RefusalFormTemplate]:
    """Return all registered form templates."""
    return FORM_TEMPLATES


def generate_form(
    db: Session,
    request: RefusalFormGenerate,
    generated_by: str,
) -> RefusalForm:
    """
    Generate a refusal form for the given consent.

    Raises
    ------
    ValueError
        If the consent does not exist, the consent status is not eligible
        (must be 'refused' or 'escalated'), or the form_type is unknown.
    """
    consent: Optional[Consent] = (
        db.query(Consent).filter(Consent.id == request.consent_id).first()
    )
    if not consent:
        raise ValueError(f"Consent '{request.consent_id}' not found.")

    if consent.status not in ELIGIBLE_STATUSES:
        raise ValueError(
            f"Refusal forms can only be generated for consents with status "
            f"'refused' or 'escalated'. Current status: '{consent.status}'."
        )

    template = _get_template(request.form_type)
    if not template:
        known = ", ".join(TEMPLATE_INDEX.keys())
        raise ValueError(
            f"Unknown form type '{request.form_type}'. Known types: {known}."
        )

    patient: Optional[Patient] = (
        db.query(Patient).filter(Patient.id == consent.patient_id).first()
    )
    if not patient:
        raise ValueError(f"Patient '{consent.patient_id}' not found.")

    form_data = _render_form_data(template, consent, patient, request)
    if request.notes:
        form_data["notes"] = request.notes

    form = RefusalForm(
        consent_id=consent.id,
        patient_id=patient.id,
        form_type=request.form_type,
        status="generated",
        form_data=form_data,
        notes=request.notes,
        generated_by=generated_by,
    )
    db.add(form)
    db.commit()
    db.refresh(form)

    audit_service.log_event(
        db,
        event_type="refusal_form_generated",
        entity_type="refusal_form",
        entity_id=form.id,
        performed_by_id=generated_by,
        payload={
            "consent_id": consent.id,
            "patient_id": patient.id,
            "form_type": request.form_type,
        },
    )
    return form


def get_form(db: Session, form_id: str) -> Optional[RefusalForm]:
    form = db.query(RefusalForm).filter(RefusalForm.id == form_id).first()
    if form and form.status == "generated":
        form.status = "previewed"
        db.commit()
        db.refresh(form)
    return form


def list_forms_for_consent(db: Session, consent_id: str) -> List[RefusalForm]:
    return (
        db.query(RefusalForm)
        .filter(RefusalForm.consent_id == consent_id)
        .order_by(RefusalForm.generated_at.desc())
        .all()
    )


def download_form(
    db: Session, form_id: str, downloaded_by: str
) -> Optional[RefusalForm]:
    """Mark form as downloaded and return it."""
    form = db.query(RefusalForm).filter(RefusalForm.id == form_id).first()
    if not form:
        return None
    form.status = "downloaded"
    form.downloaded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(form)
    audit_service.log_event(
        db,
        event_type="refusal_form_downloaded",
        entity_type="refusal_form",
        entity_id=form.id,
        performed_by_id=downloaded_by,
        payload={"form_type": form.form_type, "consent_id": form.consent_id},
    )
    return form
