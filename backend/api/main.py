from fastapi import FastAPI
from backend.api.routers import discharge

app = FastAPI(
    title="WathiqCare Discharge Refusal API",
    description="Legal workflow engine for patient discharge refusal",
    version="1.0.0",
)

app.include_router(discharge.router, prefix="/api", tags=["discharge"])
