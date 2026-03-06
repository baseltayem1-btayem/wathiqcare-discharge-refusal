from fastapi import APIRouter, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from typing import List, Optional

from backend.core.discharge_engine import DischargeEngine

router = APIRouter()

engine = DischargeEngine()


# -------------------------------------------
# Request Models
# -------------------------------------------

class DischargeOrderRequest(BaseModel):
    patient_id: str
    physician_id: str
    diagnosis_codes: List[str]
    discharge_notes: Optional[str] = ""


class RefusalRequest(BaseModel):
    order_id: str
    patient_id: str
    reason: str
    witness_id: Optional[str] = None
    nurse_id: Optional[str] = None


# -------------------------------------------
# Create discharge order
# -------------------------------------------

@router.post("/discharge/order")
def create_discharge_order(data: DischargeOrderRequest):

    try:

        result = engine.create_discharge_order(
            patient_id=data.patient_id,
            physician_id=data.physician_id,
            diagnosis_codes=data.diagnosis_codes,
            discharge_notes=data.discharge_notes,
        )

        return jsonable_encoder(result)

    except Exception as e:

        raise HTTPException(status_code=400, detail=str(e))


# -------------------------------------------
# Record refusal
# -------------------------------------------

@router.post("/discharge/refusal")
def record_refusal(data: RefusalRequest):

    try:

        result = engine.record_patient_refusal(
            order_id=data.order_id,
            patient_id=data.patient_id,
            reason=data.reason,
            witness_id=data.witness_id,
            nurse_id=data.nurse_id,
        )

        return jsonable_encoder(result)

    except Exception as e:

        raise HTTPException(status_code=400, detail=str(e))


# -------------------------------------------
# Get discharge order
# -------------------------------------------

@router.get("/discharge/order/{order_id}")
def get_order(order_id: str):

    try:

        return engine.get_order(order_id)

    except Exception as e:

        raise HTTPException(status_code=404, detail=str(e))


# -------------------------------------------
# Get refusal record
# -------------------------------------------

@router.get("/discharge/refusal/{refusal_id}")
def get_refusal(refusal_id: str):

    try:

        return engine.get_refusal(refusal_id)

    except Exception as e:

        raise HTTPException(status_code=404, detail=str(e))
