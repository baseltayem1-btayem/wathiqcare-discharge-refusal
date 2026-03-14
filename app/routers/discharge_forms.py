from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response as PDFResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user, require_role
from app.schemas.discharge_form import DischargeFormCreate, DischargeFormOut, DischargeFormUpdate
from app.services import discharge_form_service, discharge_pdf_service

router = APIRouter(prefix="/discharge-forms", tags=["discharge-forms"])


@router.post("", response_model=DischargeFormOut, status_code=status.HTTP_201_CREATED)
def create_discharge_form(
    data: DischargeFormCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "nurse", "admin")),
):
    """
    Create a new Hospital Discharge Form in 'draft' status.

    The form is linked to the specified patient record.  Required fields are
    validated at schema level (dates, non-empty clinical text).

    Roles: doctor, nurse, admin
    """
    try:
        form = discharge_form_service.create_discharge_form(db, data, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    return form


@router.get("", response_model=List[DischargeFormOut])
def list_discharge_forms(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all discharge forms with optional pagination.

    All authenticated users may list forms.
    """
    return discharge_form_service.list_all_discharge_forms(db, skip, limit)


@router.get("/patient/{patient_id}", response_model=List[DischargeFormOut])
def list_forms_for_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all discharge forms for a specific patient, newest first.

    Returns an empty list when no forms exist for the patient.
    """
    return discharge_form_service.list_discharge_forms_for_patient(db, patient_id)


@router.get("/{form_id}", response_model=DischargeFormOut)
def get_discharge_form(
    form_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single discharge form by ID."""
    form = discharge_form_service.get_discharge_form(db, form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discharge form not found")
    return form


@router.patch("/{form_id}", response_model=DischargeFormOut)
def update_discharge_form(
    form_id: str,
    data: DischargeFormUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "nurse", "admin")),
):
    """
    Partially update a discharge form that is still in 'draft' status.

    Submitted or signed forms are immutable.

    Roles: doctor, nurse, admin
    """
    try:
        form = discharge_form_service.update_discharge_form(db, form_id, data, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discharge form not found")
    return form


@router.post("/{form_id}/submit", response_model=DischargeFormOut)
def submit_discharge_form(
    form_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "nurse", "admin")),
):
    """
    Submit a draft discharge form.

    Transitions status from 'draft' → 'submitted' and records ``submitted_at``.

    Roles: doctor, nurse, admin
    """
    try:
        form = discharge_form_service.submit_discharge_form(db, form_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discharge form not found")
    return form


@router.get("/{form_id}/pdf")
def download_discharge_form_pdf(
    form_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate and download the Hospital Discharge Form as a bilingual
    (Arabic/English) A4 PDF.

    The PDF is rendered on-the-fly from the stored form data using Jinja2 +
    WeasyPrint.  All authenticated users may download the PDF.

    Returns
    -------
    application/pdf
        A4-sized PDF suitable for printing, legal review, and patient
        signature workflows.
    """
    form = discharge_form_service.get_discharge_form(db, form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discharge form not found")

    form_data = discharge_form_service.build_pdf_context(form)

    try:
        pdf_bytes = discharge_pdf_service.render_pdf(form_data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    form_number = form_data.get("form_number", form_id[:8])
    filename = f"discharge_form_{form_number}.pdf"

    return PDFResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
