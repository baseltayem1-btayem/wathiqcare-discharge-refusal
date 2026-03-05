from fastapi import APIRouter

router = APIRouter()

@router.get("/discharge/status")
def discharge_status():
    return {
        "module": "WathiqCare Discharge Refusal",
        "status": "running"
    }

@router.post("/discharge/order")
def create_discharge_order(patient_id: str):
    return {
        "message": "Discharge order created",
        "patient_id": patient_id
    }

@router.post("/discharge/refusal")
def patient_refusal(patient_id: str):
    return {
        "message": "Patient refused discharge",
        "patient_id": patient_id
    }
