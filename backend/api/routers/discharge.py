from fastapi import APIRouter
from backend.core.discharge_engine import DischargeEngine

router = APIRouter()

engine = DischargeEngine()


@router.post("/discharge/order")
def create_discharge(patient_id: str, physician_id: str, diagnosis: str):

    order = engine.create_discharge_order(
        patient_id=patient_id,
        physician_id=physician_id,
        diagnosis=diagnosis
    )

    return order


@router.post("/discharge/refusal")
def patient_refusal(order_id: str, reason: str):

    refusal = engine.record_patient_refusal(
        order_id=order_id,
        reason=reason
    )

    return refusal


@router.get("/discharge/{order_id}")
def get_order(order_id: str):

    return engine.get_order(order_id)
