"""
Discharge Form Service
======================
Handles create, read, update, submit, and list operations for the
Hospital Discharge Form.  Every mutating action is audit-logged.

Status lifecycle
----------------
  draft → submitted → signed  (signed is set externally when a signature is captured)

Business rules
--------------
- Only draft forms may be updated.
- Submitted and signed forms are immutable.
- date_services_should_end must not precede admission_date.
- other_text is required when other_checkbox is True.
"""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.discharge_form import DischargeForm
from app.models.patient import Patient
from app.schemas.discharge_form import DischargeFormCreate, DischargeFormUpdate
from app.services import audit_service

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _validate_business_rules(form: DischargeForm) -> None:
    """Re-validate business rules on the current state of the form object."""
    if form.date_services_should_end < form.admission_date:
        raise ValueError(
            "date_services_should_end cannot be earlier than admission_date"
        )
    if form.other_checkbox and not form.other_text:
        raise ValueError("other_text is required when other_checkbox is selected")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def create_discharge_form(
    db: Session,
    data: DischargeFormCreate,
    created_by: str,
) -> DischargeForm:
    """
    Persist a new Hospital Discharge Form in 'draft' status.

    Raises
    ------
    ValueError
        If the referenced patient does not exist, or if business rules are violated.
    """
    patient: Optional[Patient] = (
        db.query(Patient).filter(Patient.id == data.patient_id).first()
    )
    if not patient:
        raise ValueError(f"Patient '{data.patient_id}' not found.")

    form = DischargeForm(
        patient_id=data.patient_id,
        # Section 1
        patient_first_name=data.patient_first_name,
        patient_last_name=data.patient_last_name,
        patient_phone_number=data.patient_phone_number,
        attending_physician_first_name=data.attending_physician_first_name,
        attending_physician_last_name=data.attending_physician_last_name,
        facility_name=data.facility_name,
        date_services_should_end=data.date_services_should_end,
        # Section 2
        physician_note_reflecting_readiness_for_discharge=data.physician_note_reflecting_readiness_for_discharge,
        discharge_plan_discussed_with_member_family=data.discharge_plan_discussed_with_member_family,
        discharge_plan_discussed_with_attending_provider=data.discharge_plan_discussed_with_attending_provider,
        description_of_discharge_plan_in_place=data.description_of_discharge_plan_in_place,
        therapy_notes_if_applicable=data.therapy_notes_if_applicable,
        other_checkbox=data.other_checkbox,
        other_text=data.other_text,
        # Section 3
        admission_date=data.admission_date,
        admission_symptoms=data.admission_symptoms,
        diagnosis=data.diagnosis,
        treatment=data.treatment,
        tests_and_results=data.tests_and_results,
        evaluated_by=data.evaluated_by,
        current_status=data.current_status,
        safe_care_setting=data.safe_care_setting,
        discharge_plan_follow_up=data.discharge_plan_follow_up,
        # Section 4
        completed_by_first_name=data.completed_by_first_name,
        completed_by_last_name=data.completed_by_last_name,
        completed_by_phone_number=data.completed_by_phone_number,
        completion_date=data.completion_date,
        completed_by_signature=data.completed_by_signature,
        status="draft",
        created_by=created_by,
    )
    db.add(form)
    db.commit()
    db.refresh(form)

    audit_service.log_event(
        db,
        event_type="discharge_form_created",
        entity_type="discharge_form",
        entity_id=form.id,
        performed_by_id=created_by,
        payload={
            "patient_id": form.patient_id,
            "status": form.status,
            "date_services_should_end": str(form.date_services_should_end),
        },
    )
    return form


def get_discharge_form(db: Session, form_id: str) -> Optional[DischargeForm]:
    """Return a single discharge form by ID, or None if not found."""
    return db.query(DischargeForm).filter(DischargeForm.id == form_id).first()


def list_discharge_forms_for_patient(
    db: Session, patient_id: str
) -> List[DischargeForm]:
    """Return all discharge forms for the given patient, newest first."""
    return (
        db.query(DischargeForm)
        .filter(DischargeForm.patient_id == patient_id)
        .order_by(DischargeForm.created_at.desc())
        .all()
    )


def list_all_discharge_forms(
    db: Session, skip: int = 0, limit: int = 100
) -> List[DischargeForm]:
    """Return all discharge forms with pagination."""
    return (
        db.query(DischargeForm)
        .order_by(DischargeForm.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def update_discharge_form(
    db: Session,
    form_id: str,
    data: DischargeFormUpdate,
    updated_by: str,
) -> Optional[DischargeForm]:
    """
    Partially update a draft discharge form.

    Raises
    ------
    ValueError
        If the form is not in 'draft' status, or if business rules are violated.
    """
    form: Optional[DischargeForm] = get_discharge_form(db, form_id)
    if not form:
        return None

    if form.status != "draft":
        raise ValueError(
            f"Only draft forms may be updated. Current status: '{form.status}'."
        )

    # Apply only the fields that were explicitly provided
    update_dict = data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(form, field, value)

    # Re-validate business rules after applying changes
    _validate_business_rules(form)

    db.commit()
    db.refresh(form)

    audit_service.log_event(
        db,
        event_type="discharge_form_updated",
        entity_type="discharge_form",
        entity_id=form.id,
        performed_by_id=updated_by,
        payload={"updated_fields": list(update_dict.keys()), "status": form.status},
    )
    return form


def submit_discharge_form(
    db: Session,
    form_id: str,
    submitted_by: str,
) -> Optional[DischargeForm]:
    """
    Transition a draft form to 'submitted' status and record the submission timestamp.

    Raises
    ------
    ValueError
        If the form is not in 'draft' status.
    """
    form: Optional[DischargeForm] = get_discharge_form(db, form_id)
    if not form:
        return None

    if form.status != "draft":
        raise ValueError(
            f"Only draft forms may be submitted. Current status: '{form.status}'."
        )

    form.status = "submitted"
    form.submitted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(form)

    audit_service.log_event(
        db,
        event_type="discharge_form_submitted",
        entity_type="discharge_form",
        entity_id=form.id,
        performed_by_id=submitted_by,
        payload={
            "patient_id": form.patient_id,
            "submitted_at": form.submitted_at.isoformat(),
        },
    )
    return form


def build_pdf_context(form: DischargeForm, hospital_name: str = "WathiqCare Hospital") -> dict:
    """
    Build the flat + nested template context dict used by discharge_pdf_service.
    """
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)

    checklist = {
        "physician_note": form.physician_note_reflecting_readiness_for_discharge,
        "discussed_with_family": form.discharge_plan_discussed_with_member_family,
        "discussed_with_provider": form.discharge_plan_discussed_with_attending_provider,
        "discharge_plan_in_place": form.description_of_discharge_plan_in_place,
        "therapy_notes": form.therapy_notes_if_applicable,
        "other": form.other_checkbox,
        "other_text": form.other_text or "",
    }

    return {
        # Section 1
        "patient_first_name": form.patient_first_name,
        "patient_last_name": form.patient_last_name,
        "patient_full_name": f"{form.patient_first_name} {form.patient_last_name}",
        "patient_phone_number": form.patient_phone_number or "",
        "attending_physician_first_name": form.attending_physician_first_name,
        "attending_physician_last_name": form.attending_physician_last_name,
        "attending_physician_full_name": (
            f"{form.attending_physician_first_name} {form.attending_physician_last_name}"
        ),
        "facility_name": form.facility_name or hospital_name,
        "date_services_should_end": str(form.date_services_should_end),
        # Section 2
        "checklist": checklist,
        # Section 3
        "admission_date": str(form.admission_date),
        "admission_symptoms": form.admission_symptoms or "",
        "diagnosis": form.diagnosis,
        "treatment": form.treatment or "",
        "tests_and_results": form.tests_and_results or "",
        "evaluated_by": form.evaluated_by or "",
        "current_status": form.current_status or "",
        "safe_care_setting": form.safe_care_setting or "",
        "discharge_plan_follow_up": form.discharge_plan_follow_up or "",
        # Section 4
        "completed_by_first_name": form.completed_by_first_name or "",
        "completed_by_last_name": form.completed_by_last_name or "",
        "completed_by_full_name": (
            f"{form.completed_by_first_name or ''} {form.completed_by_last_name or ''}".strip()
        ),
        "completed_by_phone_number": form.completed_by_phone_number or "",
        "completion_date": str(form.completion_date) if form.completion_date else "",
        "completed_by_signature": form.completed_by_signature or "",
        # Lifecycle & metadata
        "form_status": form.status,
        "submitted_at": form.submitted_at.isoformat() if form.submitted_at else "",
        "hospital_name": hospital_name,
        "hospital_logo": "",
        "form_number": f"WQ-DF-{form.id[:8].upper()}",
        "form_version": "v1.0",
        "generated_date": now.strftime("%Y-%m-%d"),
        "generated_time": now.strftime("%H:%M UTC"),
        "generated_at": now.isoformat(),
        # Nested: patient (template compatibility)
        "patient": {
            "full_name": f"{form.patient_first_name} {form.patient_last_name}",
            "first_name": form.patient_first_name,
            "last_name": form.patient_last_name,
            "phone": form.patient_phone_number or "",
            "mrn": form.patient_id[:8].upper(),
        },
        # Nested: physician
        "physician": {
            "full_name": (
                f"{form.attending_physician_first_name} {form.attending_physician_last_name}"
            ),
            "first_name": form.attending_physician_first_name,
            "last_name": form.attending_physician_last_name,
        },
    }
