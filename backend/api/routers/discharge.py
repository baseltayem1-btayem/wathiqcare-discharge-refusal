from typing import List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel

from backend.core.discharge_engine import DischargeEngine

router = APIRouter()
engine = DischargeEngine()


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


@router.post("/discharge/order")
def create_discharge_order(payload: DischargeOrderRequest):
    try:
        result = engine.create_discharge_order(
            patient_id=payload.patient_id,
            physician_id=payload.physician_id,
            diagnosis_codes=payload.diagnosis_codes,
            discharge_notes=payload.discharge_notes or "",
        )
        return jsonable_encoder(result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/discharge/refusal")
def record_refusal(payload: RefusalRequest):
    try:
        result = engine.record_patient_refusal(
            order_id=payload.order_id,
            patient_id=payload.patient_id,
            reason=payload.reason,
            witness_id=payload.witness_id,
            nurse_id=payload.nurse_id,
        )
        return jsonable_encoder(result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/discharge/order/{order_id}")
def get_order(order_id: str):
    try:
        result = engine.get_order(order_id)
        return jsonable_encoder(result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/discharge/refusal/{refusal_id}")
def get_refusal(refusal_id: str):
    try:
        result = engine.get_refusal(refusal_id)
        return jsonable_encoder(result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
