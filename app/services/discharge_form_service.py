"""
Discharge Form Service
======================
Handles create, read, update, submit, and list operations for the
Inpatient Care Discharge Form.  Every mutating action is audit-logged.

Status lifecycle
----------------
  draft → submitted → signed  (signed is set externally when a signature is captured)

Business rules
--------------
- Only draft forms may be updated.
- Submitted and signed forms are immutable.
- Discharge date must not precede admission date (enforced at schema level too).
- Follow-up date, if provided, must not precede discharge date.
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


def _validate_dates(
    date_of_admission,
    date_of_discharge,
    follow_up_appointment_date=None,
) -> None:
    if date_of_discharge < date_of_admission:
        raise ValueError("discharge date cannot be earlier than admission date")
    if follow_up_appointment_date is not None and follow_up_appointment_date < date_of_discharge:
        raise ValueError(
            "follow-up appointment date should not be earlier than discharge date"
        )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def create_discharge_form(
    db: Session,
    data: DischargeFormCreate,
    created_by: str,
) -> DischargeForm:
    """
    Persist a new discharge form in 'draft' status.

    Raises
    ------
    ValueError
        If the referenced patient does not exist, or if date constraints are violated.
    """
    patient: Optional[Patient] = (
        db.query(Patient).filter(Patient.id == data.patient_id).first()
    )
    if not patient:
        raise ValueError(f"Patient '{data.patient_id}' not found.")

    _validate_dates(data.date_of_admission, data.date_of_discharge, data.follow_up_appointment_date)

    form = DischargeForm(
        patient_id=data.patient_id,
        first_name=data.first_name,
        last_name=data.last_name,
        patient_identifier=data.patient_identifier,
        date_of_admission=data.date_of_admission,
        date_of_discharge=data.date_of_discharge,
        diagnosis=data.diagnosis,
        treatment_summary=data.treatment_summary,
        discharge_instructions=data.discharge_instructions,
        follow_up_appointment_date=data.follow_up_appointment_date,
        physician_first_name=data.physician_first_name,
        physician_last_name=data.physician_last_name,
        patient_guardian_signature=data.patient_guardian_signature,
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
            "date_of_discharge": str(form.date_of_discharge),
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
        If the form is not in 'draft' status, or if updated dates are invalid.
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

    # Re-validate dates after update
    _validate_dates(
        form.date_of_admission,
        form.date_of_discharge,
        form.follow_up_appointment_date,
    )

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

    Returns a dict that supports both flat keys (``{{ first_name }}``) and
    nested keys (``{{ patient.full_name }}``) consistent with the base template
    contract.
    """
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    return {
        # ── flat / legacy keys ────────────────────────────────────────────────
        "first_name": form.first_name,
        "last_name": form.last_name,
        "patient_full_name": f"{form.first_name} {form.last_name}",
        "patient_identifier": form.patient_identifier,
        "date_of_admission": str(form.date_of_admission),
        "date_of_discharge": str(form.date_of_discharge),
        "diagnosis": form.diagnosis,
        "treatment_summary": form.treatment_summary,
        "discharge_instructions": form.discharge_instructions,
        "follow_up_appointment_date": (
            str(form.follow_up_appointment_date) if form.follow_up_appointment_date else ""
        ),
        "physician_first_name": form.physician_first_name,
        "physician_last_name": form.physician_last_name,
        "physician_full_name": f"{form.physician_first_name} {form.physician_last_name}",
        "patient_guardian_signature": form.patient_guardian_signature or "",
        "form_status": form.status,
        "submitted_at": form.submitted_at.isoformat() if form.submitted_at else "",
        # ── institutional metadata ────────────────────────────────────────────
        "hospital_name": hospital_name,
        "hospital_logo": "",
        "form_number": f"WQ-DF-{form.id[:8].upper()}",
        "form_version": "v1.0",
        "generated_date": now.strftime("%Y-%m-%d"),
        "generated_time": now.strftime("%H:%M UTC"),
        "generated_at": now.isoformat(),
        # ── nested: patient ──────────────────────────────────────────────────
        "patient": {
            "full_name": f"{form.first_name} {form.last_name}",
            "first_name": form.first_name,
            "last_name": form.last_name,
            "national_id": form.patient_identifier,
            "mrn": form.patient_id[:8].upper(),
        },
        # ── nested: physician ────────────────────────────────────────────────
        "physician": {
            "full_name": f"{form.physician_first_name} {form.physician_last_name}",
            "first_name": form.physician_first_name,
            "last_name": form.physician_last_name,
        },
        # ── nested: clinical ─────────────────────────────────────────────────
        "clinical": {
            "diagnosis": form.diagnosis,
            "treatment_summary": form.treatment_summary,
            "discharge_instructions": form.discharge_instructions,
            "date_of_admission": str(form.date_of_admission),
            "date_of_discharge": str(form.date_of_discharge),
            "follow_up_date": (
                str(form.follow_up_appointment_date)
                if form.follow_up_appointment_date
                else ""
            ),
        },
    }
