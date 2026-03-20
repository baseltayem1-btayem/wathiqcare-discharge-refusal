from __future__ import annotations

from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.api.deps import require_roles
from backend.modules.medico_legal_forms.discharge import DischargeMedicoLegalFormsService


router = APIRouter(prefix="/api", tags=["Medico Legal Forms"])
service = DischargeMedicoLegalFormsService()

ALLOWED_ROLES = (
    "tenant_admin",
    "legal_admin",
    "doctor",
    "nursing",
    "patient_affairs",
    "social_services",
    "quality",
    "compliance",
    "finance",
)


class CreateFormInstanceRequest(BaseModel):
    templateCode: str
    patientId: str
    encounterId: str
    languageMode: Literal["bilingual", "english", "arabic"] = "bilingual"


class ResolveClausesRequest(BaseModel):
    contextOverrides: Dict[str, Any] = Field(default_factory=dict)


class ValidateSignerRequest(BaseModel):
    signerType: Literal["patient", "guardian", "representative"] = "patient"
    signerName: str
    signerNationalId: Optional[str] = None
    relationshipToPatient: Optional[str] = None
    patientCapacity: Literal["competent", "minor", "incapacitated", "uncertain"] = "competent"


class UpdateDraftRequest(BaseModel):
    dataSnapshotPatch: Dict[str, Any] = Field(default_factory=dict)


class AddSignatureRequest(BaseModel):
    signerType: Literal["patient", "guardian", "representative"] = "patient"
    signerName: str
    method: str = "drawn_signature"
    signatureBlob: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


@router.get("/forms/templates")
def list_templates(
    category: Optional[str] = None,
    current_user=Depends(require_roles(*ALLOWED_ROLES)),
):
    _ = current_user
    return service.list_templates(category)


@router.get("/forms/templates/{template_code}")
def get_template(
    template_code: str,
    current_user=Depends(require_roles(*ALLOWED_ROLES)),
):
    _ = current_user
    try:
        return service.get_template(template_code)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/forms/instances")
def create_form_instance(
    request: CreateFormInstanceRequest,
    current_user=Depends(require_roles(*ALLOWED_ROLES)),
):
    try:
        return service.create_instance(
            tenant_id=current_user["tenant_id"],
            actor_user_id=current_user["id"],
            template_code=request.templateCode,
            patient_id=request.patientId,
            encounter_id=request.encounterId,
            language_mode=request.languageMode,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/forms/instances/{instance_id}")
def get_form_instance(
    instance_id: str,
    current_user=Depends(require_roles(*ALLOWED_ROLES)),
):
    try:
        return service.get_instance(tenant_id=current_user["tenant_id"], instance_id=instance_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/forms/instances/{instance_id}/autofill")
def autofill_instance(
    instance_id: str,
    current_user=Depends(require_roles(*ALLOWED_ROLES)),
):
    try:
        return service.autofill(
            tenant_id=current_user["tenant_id"],
            actor_user_id=current_user["id"],
            instance_id=instance_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/forms/instances/{instance_id}/resolve-clauses")
def resolve_instance_clauses(
    instance_id: str,
    request: ResolveClausesRequest,
    current_user=Depends(require_roles(*ALLOWED_ROLES)),
):
    try:
        return service.resolve_clauses(
            tenant_id=current_user["tenant_id"],
            actor_user_id=current_user["id"],
            instance_id=instance_id,
            context_overrides=request.contextOverrides,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/forms/instances/{instance_id}/validate-signer")
def validate_instance_signer(
    instance_id: str,
    request: ValidateSignerRequest,
    current_user=Depends(require_roles(*ALLOWED_ROLES)),
):
    try:
        return service.validate_signer(
            tenant_id=current_user["tenant_id"],
            actor_user_id=current_user["id"],
            instance_id=instance_id,
            signer_payload=request.model_dump(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/forms/instances/{instance_id}")
def update_form_instance(
    instance_id: str,
    request: UpdateDraftRequest,
    current_user=Depends(require_roles(*ALLOWED_ROLES)),
):
    try:
        return service.update_draft(
            tenant_id=current_user["tenant_id"],
            actor_user_id=current_user["id"],
            instance_id=instance_id,
            patch_payload=request.dataSnapshotPatch,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/forms/instances/{instance_id}/signatures")
def add_form_signature(
    instance_id: str,
    request: AddSignatureRequest,
    current_user=Depends(require_roles(*ALLOWED_ROLES)),
):
    payload = request.model_dump()
    payload.update(request.metadata or {})
    try:
        return service.add_signature(
            tenant_id=current_user["tenant_id"],
            actor_user_id=current_user["id"],
            instance_id=instance_id,
            signature_payload=payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/forms/instances/{instance_id}/finalize")
def finalize_form_instance(
    instance_id: str,
    current_user=Depends(require_roles(*ALLOWED_ROLES)),
):
    try:
        return service.finalize(
            tenant_id=current_user["tenant_id"],
            actor_user_id=current_user["id"],
            instance_id=instance_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/patients/{patient_id}/chart/forms")
def list_patient_chart_forms(
    patient_id: str,
    current_user=Depends(require_roles(*ALLOWED_ROLES)),
):
    return service.list_chart_forms(tenant_id=current_user["tenant_id"], patient_id=patient_id)


@router.get("/forms/instances/{instance_id}/pdf")
def get_form_pdf(
    instance_id: str,
    current_user=Depends(require_roles(*ALLOWED_ROLES)),
):
    try:
        file_path = service.get_pdf_path(tenant_id=current_user["tenant_id"], instance_id=instance_id)
        return FileResponse(path=str(file_path), filename=file_path.name, media_type="application/pdf")
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/forms/instances/{instance_id}/audit")
def get_form_audit(
    instance_id: str,
    current_user=Depends(require_roles(*ALLOWED_ROLES)),
):
    try:
        return service.list_audit(tenant_id=current_user["tenant_id"], instance_id=instance_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
