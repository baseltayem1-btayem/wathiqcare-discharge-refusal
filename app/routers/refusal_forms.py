from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response as PDFResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.refusal_form import RefusalForm
from app.models.user import User
from app.routers.auth import get_current_user, require_role
from app.schemas.refusal_form import (
    RefusalFormDownload,
    RefusalFormGenerate,
    RefusalFormOut,
    RefusalFormTemplate,
)
from app.services import pdf_service, refusal_form_service

router = APIRouter(prefix="/refusal-forms", tags=["refusal-forms"])


@router.get("/templates", response_model=List[RefusalFormTemplate])
def list_templates(
    current_user: User = Depends(get_current_user),
):
    """
    List all available refusal form templates in the forms library.

    Returns the template catalogue including title, description, required
    consent statuses, and field definitions.  All authenticated users may
    view the catalogue.
    """
    return refusal_form_service.list_templates()


@router.post("", response_model=RefusalFormOut, status_code=status.HTTP_201_CREATED)
def generate_form(
    request: RefusalFormGenerate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "nurse", "legal_officer", "admin")),
):
    """
    Generate a refusal form for a consent that is in 'refused' or 'escalated' status.

    Prerequisites
    -------------
    - The referenced consent must exist.
    - The consent status must be 'refused' or 'escalated'.
    - The ``form_type`` must be one of the registered template types
      (use GET /refusal-forms/templates to list them).

    Roles: doctor, nurse, legal_officer, admin
    """
    try:
        form = refusal_form_service.generate_form(db, request, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    return form


@router.get("/consent/{consent_id}", response_model=List[RefusalFormOut])
def list_forms_for_consent(
    consent_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all generated refusal forms linked to a specific consent.

    Returns an empty list when no forms have been generated yet (instead of
    surfacing a misleading 'No refusal forms found' state without context).
    """
    return refusal_form_service.list_forms_for_consent(db, consent_id)


@router.get("/{form_id}", response_model=RefusalFormOut)
def get_form(
    form_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve and preview a specific refusal form.

    Transitions the form status from 'generated' → 'previewed' on first read.
    """
    form = refusal_form_service.get_form(db, form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Refusal form not found")
    return form


@router.get("/{form_id}/download", response_model=RefusalFormDownload)
def download_form(
    form_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Download a refusal form (marks it as 'downloaded' with a timestamp).

    Returns the full form payload ready for PDF rendering or storage.
    """
    form = refusal_form_service.download_form(db, form_id, current_user.id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Refusal form not found")

    template = refusal_form_service.get_template(form.form_type)
    title = template.title if template else form.form_type

    return RefusalFormDownload(
        form_id=form.id,
        form_type=form.form_type,
        title=title,
        downloaded_at=form.downloaded_at or datetime.now(timezone.utc),
        form_data=form.form_data,
    )


@router.get("/{form_id}/pdf")
def download_form_pdf(
    form_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate and download a refusal form as a bilingual (Arabic/English) A4 PDF.

    The PDF is rendered on-the-fly from the stored form_data using Jinja2
    templates and WeasyPrint.

    Prerequisites
    -------------
    - The form must have been generated (via POST /refusal-forms).
    - ``physician_name`` must be present in form_data (provide it during
      form generation via the ``physician_name`` field).

    Returns
    -------
    application/pdf
        A4-sized PDF suitable for printing, legal review, and patient
        signature workflows.
    """
    form: RefusalForm | None = db.query(RefusalForm).filter(RefusalForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Refusal form not found")

    try:
        pdf_bytes = pdf_service.render_pdf(form.form_type, form.form_data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        )

    form_number = form.form_data.get("form_number", form_id[:8])
    filename = f"refusal_form_{form_number}.pdf"

    return PDFResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
