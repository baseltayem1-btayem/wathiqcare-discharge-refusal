from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, Response
from pydantic import BaseModel, Field

from backend.api.deps import require_roles
from backend.core.database import SessionLocal
from backend.core.forms_engine_service import FormsEngineService
from backend.core.discharge_workflow_service import get_document_record
from backend.services.audit_service import AuditService


router = APIRouter(prefix="/api", tags=["Forms Engine"])
service = FormsEngineService()


def _audit_document_access(*, current_user: Dict[str, Any], document, event_type: str, event_title: str, event_details: str) -> None:
    db = SessionLocal()
    try:
        AuditService(db).log(
            case_id=document.case_id,
            task_id=None,
            actor_user_id=current_user["id"],
            actor_role=current_user.get("role"),
            actor_department_code=current_user.get("department_code"),
            entity_type="workflow_document",
            entity_id=document.id,
            event_type=event_type,
            event_title=event_title,
            event_details=event_details,
            payload_summary=event_details[:500],
            metadata_json={
                "template_key": document.template_key,
                "locale": document.locale,
            },
        )
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

VIEW_ROLES = (
    "tenant_admin",
    "legal_admin",
    "doctor",
    "nursing",
    "patient_affairs",
    "social_services",
    "quality",
    "compliance",
)

EDIT_ROLES = (
    "tenant_admin",
    "legal_admin",
    "doctor",
    "nursing",
    "patient_affairs",
    "social_services",
    "compliance",
)

SIGN_ROLES = (
    "tenant_admin",
    "legal_admin",
    "doctor",
    "nursing",
    "patient_affairs",
    "compliance",
)

WITNESS_SIGN_ROLES = (
    "tenant_admin",
    "legal_admin",
    "nursing",
    "patient_affairs",
    "compliance",
)

OTP_ROLES = (
    "tenant_admin",
    "legal_admin",
    "doctor",
    "nursing",
    "patient_affairs",
    "compliance",
)


class GenerateFormRequest(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict)


class SignDocumentRequest(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict)


class WitnessSignRequest(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict)


class SendOtpRequest(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict)


class VerifyOtpRequest(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict)


@router.get("/forms/templates")
def list_form_templates(
    language_code: Optional[str] = None,
    current_user=Depends(require_roles(*VIEW_ROLES)),
):
    return service.list_templates(
        tenant_id=current_user["tenant_id"],
        requested_language=language_code,
    )


@router.get("/forms/templates/{form_type}")
def get_form_template(
    form_type: str,
    language_code: Optional[str] = None,
    current_user=Depends(require_roles(*VIEW_ROLES)),
):
    try:
        return service.get_template(
            tenant_id=current_user["tenant_id"],
            form_type=form_type,
            requested_language=language_code,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/forms/templates/{form_type}/validate")
def validate_form_template_availability(
    form_type: str,
    language_code: Optional[str] = None,
    current_user=Depends(require_roles(*VIEW_ROLES)),
):
    try:
        return service.validate_template_availability(
            tenant_id=current_user["tenant_id"],
            form_type=form_type,
            requested_language=language_code,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/cases/{case_id}/forms/{form_type}/generate")
def generate_case_form(
    case_id: str,
    form_type: str,
    request: GenerateFormRequest,
    current_user=Depends(require_roles(*EDIT_ROLES)),
):
    try:
        return service.generate_form(
            tenant_id=current_user["tenant_id"],
            case_id=case_id,
            form_type=form_type,
            payload=request.payload,
            current_user=current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="Document generation failed. Please retry.")


@router.get("/documents/{document_id}/preview", response_class=HTMLResponse)
def preview_document(
    document_id: str,
    current_user=Depends(require_roles(*VIEW_ROLES)),
):
    try:
        document = get_document_record(tenant_id=current_user["tenant_id"], document_id=document_id)
        preview = service.get_document_preview(tenant_id=current_user["tenant_id"], document_id=document_id)
        _audit_document_access(
            current_user=current_user,
            document=document,
            event_type="document_previewed",
            event_title="Document Previewed",
            event_details=f"Document {document.id} previewed",
        )
        return HTMLResponse(content=preview["previewHtml"])
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/documents/{document_id}/view", response_class=HTMLResponse)
def view_document(
    document_id: str,
    current_user=Depends(require_roles(*VIEW_ROLES)),
):
    try:
        document = get_document_record(tenant_id=current_user["tenant_id"], document_id=document_id)
        _audit_document_access(
            current_user=current_user,
            document=document,
            event_type="document_viewed",
            event_title="Document Viewed",
            event_details=f"Document {document.id} viewed",
        )
        path = Path(document.file_path)
        if path.exists() and path.suffix.lower() == ".pdf":
            return FileResponse(path=str(path), filename=document.file_name, media_type="application/pdf")

        preview = service.get_document_preview(tenant_id=current_user["tenant_id"], document_id=document_id)
        return HTMLResponse(content=preview["previewHtml"])
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/documents/{document_id}/download")
def download_document(
    document_id: str,
    current_user=Depends(require_roles(*VIEW_ROLES)),
):
    try:
        document = get_document_record(tenant_id=current_user["tenant_id"], document_id=document_id)
        _audit_document_access(
            current_user=current_user,
            document=document,
            event_type="document_downloaded",
            event_title="Document Downloaded",
            event_details=f"Document {document.id} downloaded/exported",
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    path = Path(document.file_path)
    if not path.exists():
        if document.html_content:
            return Response(
                content=document.html_content,
                media_type="text/html",
                headers={
                    "Content-Disposition": f'attachment; filename="{document.file_name}"',
                },
            )
        raise HTTPException(status_code=404, detail="Document file not found")

    media_type = "application/pdf" if path.suffix.lower() == ".pdf" else "text/html"
    return FileResponse(path=str(path), filename=document.file_name, media_type=media_type)


@router.post("/documents/{document_id}/sign")
def sign_document(
    document_id: str,
    request: SignDocumentRequest,
    current_user=Depends(require_roles(*SIGN_ROLES)),
):
    try:
        return service.sign_document(
            tenant_id=current_user["tenant_id"],
            document_id=document_id,
            payload=request.payload,
            current_user=current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="Document signing failed. Please retry.")


@router.post("/documents/{document_id}/witness-sign")
def witness_sign_document(
    document_id: str,
    request: WitnessSignRequest,
    current_user=Depends(require_roles(*WITNESS_SIGN_ROLES)),
):
    try:
        return service.witness_sign_document(
            tenant_id=current_user["tenant_id"],
            document_id=document_id,
            payload=request.payload,
            current_user=current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="Witness signing failed. Please retry.")


@router.post("/documents/{document_id}/send-otp")
def send_document_otp(
    document_id: str,
    request: SendOtpRequest,
    current_user=Depends(require_roles(*OTP_ROLES)),
):
    try:
        return service.send_document_otp(
            tenant_id=current_user["tenant_id"],
            document_id=document_id,
            payload=request.payload,
            current_user=current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="OTP send failed. Please retry.")


@router.post("/documents/{document_id}/verify-otp")
def verify_document_otp(
    document_id: str,
    request: VerifyOtpRequest,
    current_user=Depends(require_roles(*OTP_ROLES)),
):
    try:
        return service.verify_document_otp(
            tenant_id=current_user["tenant_id"],
            document_id=document_id,
            payload=request.payload,
            current_user=current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="OTP verification failed. Please retry.")


@router.get("/cases/{case_id}/documents")
def get_case_documents(
    case_id: str,
    current_user=Depends(require_roles(*VIEW_ROLES)),
):
    try:
        return service.list_case_documents(tenant_id=current_user["tenant_id"], case_id=case_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/cases/{case_id}/audit-log")
def get_case_audit_log(
    case_id: str,
    current_user=Depends(require_roles(*VIEW_ROLES)),
):
    try:
        return service.list_case_audit_log(tenant_id=current_user["tenant_id"], case_id=case_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
