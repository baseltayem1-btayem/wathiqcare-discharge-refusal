from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.api.deps import require_roles
from backend.core.database import SessionLocal
from backend.models.audit_log import AuditLog
from backend.modules.shc_discharge_compliance.shc_equipment_request import EquipmentRequest
from backend.modules.shc_discharge_compliance.shc_homecare_workflow import HomeCarePlan
from backend.modules.shc_discharge_compliance.shc_transfer_workflow import TransferRequest
from backend.modules.shc_discharge_compliance.shc_workflow_engine import (
    SHCDischargeComplianceEngine,
    SHCWorkflowInput,
)

router = APIRouter(prefix="/api/shc-compliance", tags=["SHC Discharge Compliance"])


class HomeCarePlanPayload(BaseModel):
    care_type: str
    equipment_required: List[str] = Field(default_factory=list)
    care_provider: str


class TransferRequestPayload(BaseModel):
    receiving_hospital: str
    transfer_reason: str
    medical_stability_confirmation: bool


class EquipmentRequestPayload(BaseModel):
    requested_equipment: str
    department: str
    status: str = "pending"


class SHCWorkflowRequest(BaseModel):
    case_id: str
    patient_name: str
    patient_id_number: str
    medical_record_number: str
    room_number: str
    attending_physician: str
    discharge_status: Literal["accept_discharge", "refuse_discharge"]
    discharge_alternative: Optional[
        Literal["home_care", "transfer_hospital", "financial_responsibility"]
    ] = None
    homecare_plan: Optional[HomeCarePlanPayload] = None
    transfer_request: Optional[TransferRequestPayload] = None
    equipment_request: Optional[EquipmentRequestPayload] = None
    signature_method: Optional[Literal["sms_otp", "nafath", "tablet_signature"]] = None
    signature_device: Optional[str] = None


def _persist_audit_events(tenant_id: str, user_id: str, case_id: str, events: list[dict]) -> None:
    db = SessionLocal()
    try:
        for event in events:
            audit = AuditLog(
                tenant_id=tenant_id,
                user_id=user_id,
                entity_type="discharge_case",
                entity_id=case_id,
                action=str(event.get("action", "shc_workflow_event")),
                details=str(event.get("details", {})),
                created_at=datetime.utcnow(),
            )
            db.add(audit)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@router.post("/workflow")
def execute_shc_workflow(
    payload: SHCWorkflowRequest,
    current_user=Depends(require_roles("tenant_admin", "legal_admin", "doctor")),
):
    try:
        engine = SHCDischargeComplianceEngine()
        result = engine.run(
            SHCWorkflowInput(
                case_id=payload.case_id,
                tenant_id=current_user["tenant_id"],
                user_id=current_user["id"],
                patient_name=payload.patient_name,
                patient_id_number=payload.patient_id_number,
                medical_record_number=payload.medical_record_number,
                room_number=payload.room_number,
                attending_physician=payload.attending_physician,
                discharge_status=payload.discharge_status,
                discharge_alternative=payload.discharge_alternative,
                homecare_plan=(
                    HomeCarePlan(**payload.homecare_plan.model_dump()) if payload.homecare_plan else None
                ),
                transfer_request=(
                    TransferRequest(**payload.transfer_request.model_dump())
                    if payload.transfer_request
                    else None
                ),
                equipment_request=(
                    EquipmentRequest(**payload.equipment_request.model_dump())
                    if payload.equipment_request
                    else None
                ),
                signature_method=payload.signature_method,
                signature_device=payload.signature_device,
                ip_address=None,
            )
        )

        _persist_audit_events(
            tenant_id=current_user["tenant_id"],
            user_id=current_user["id"],
            case_id=payload.case_id,
            events=result.get("audit", []),
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal server error: {exc}")
