from fastapi import FastAPI
import os
import backend.models  # noqa: F401
from backend.api.routers.discharge import router as discharge_router
from backend.api.routers.discharge_refusal_workflow import router as discharge_refusal_workflow_router
from backend.api.routers.auth import router as auth_router
from backend.api.routers.signature import router as signature_router
from backend.api.routers.home_healthcare import router as home_healthcare_router
from backend.api.routers.shc_discharge_compliance import router as shc_discharge_compliance_router
from backend.api.routers.integration import router as integration_router

app = FastAPI(
    title="WathiqCare Core API",
    version="0.1.0"
)

@app.get("/")
def root():
    return {"message": "WathiqCare API is running"}

app.include_router(auth_router)
app.include_router(discharge_router)
app.include_router(discharge_refusal_workflow_router)
app.include_router(signature_router)
app.include_router(home_healthcare_router)
app.include_router(integration_router)

if os.getenv("SHC_COMPLIANCE_MODULE", "false").lower() == "true":
    app.include_router(shc_discharge_compliance_router)
