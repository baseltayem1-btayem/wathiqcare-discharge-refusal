from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.api.deps import require_roles
from backend.core.database import SessionLocal
from backend.discharge.home_healthcare import (
    HOME_HEALTHCARE_MODEL_VALUE,
    POST_DISCHARGE_CARE_MODELS,
    build_homecare_context,
    is_home_healthcare_model,
    render_homecare_agreement_html,
)
from backend.models.discharge_case import DischargeCase
from backend.models.patient import Patient

router = APIRouter(prefix="/api/discharge", tags=["Home Healthcare Agreement"])


class CareModelSelectionRequest(BaseModel):
    care_model: str = Field(..., description="نموذج الرعاية المختار بعد الخروج")


class HomecarePreviewRequest(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict)


def _build_case_defaults(*, case_id: str, tenant_id: str) -> Dict[str, str]:
    db = SessionLocal()
    try:
        row = (
            db.query(DischargeCase, Patient)
            .join(Patient, Patient.id == DischargeCase.patient_id)
            .filter(DischargeCase.id == case_id, DischargeCase.tenant_id == tenant_id)
            .first()
        )
        if not row:
            # Keep preview non-blocking even when discharge-case linkage is unavailable.
            return {
                "patient_name": "",
                "medical_record_number": "",
                "urn": "",
                "current_location": "",
                "room_number": "",
                "legal_guardian": "",
                "relationship": "",
                "guardian_id": "",
                "date": datetime.utcnow().strftime("%Y-%m-%d"),
                "case_id": case_id,
            }

        discharge_case, patient = row
        return {
            "patient_name": patient.full_name or "",
            "medical_record_number": patient.mrn or "",
            "urn": patient.mrn or "",
            "current_location": "",
            "room_number": "",
            "legal_guardian": "",
            "relationship": "",
            "guardian_id": "",
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "case_id": discharge_case.id,
        }
    finally:
        db.close()


@router.get("/cases/{case_id}/post-discharge-care-models")
def list_post_discharge_care_models(
    case_id: str,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    _ = case_id
    return {
        "models": POST_DISCHARGE_CARE_MODELS,
        "home_healthcare_option": HOME_HEALTHCARE_MODEL_VALUE,
    }


@router.post("/cases/{case_id}/post-discharge-care-model")
def select_post_discharge_care_model(
    case_id: str,
    request: CareModelSelectionRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    _ = case_id

    selected = (request.care_model or "").strip().lower()
    allowed = {item["value"] for item in POST_DISCHARGE_CARE_MODELS}
    if selected not in allowed:
        raise HTTPException(status_code=400, detail="نموذج الرعاية بعد الخروج غير مدعوم")

    return {
        "care_model": selected,
        "trigger_home_healthcare_workflow": is_home_healthcare_model(selected),
        "next_step": "بدء اتفاقية الرعاية الصحية المنزلية" if is_home_healthcare_model(selected) else "متابعة تخطيط الخروج المعتاد",
    }


@router.post("/cases/{case_id}/home-healthcare-agreement/preview")
def preview_home_healthcare_agreement(
    case_id: str,
    request: HomecarePreviewRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    try:
        defaults = _build_case_defaults(case_id=case_id, tenant_id=current_user["tenant_id"])
        merged = {**defaults, **request.payload}
        context = build_homecare_context(case_id=case_id, payload=merged)
        html_content = render_homecare_agreement_html(context)
        return {
            "template_key": "home_healthcare_agreement",
            "title": "إقرار وموافقة مستنيرة",
            "html_content": html_content,
            "context": context,
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي في الخادم")
