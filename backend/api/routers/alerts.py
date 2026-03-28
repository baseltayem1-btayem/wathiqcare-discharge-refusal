# Minimal stub for alerts router and request model
from pydantic import BaseModel
from fastapi import APIRouter

class AcknowledgeRequest(BaseModel):
    alert_id: str

def acknowledge_alert():
    pass

router = APIRouter()
