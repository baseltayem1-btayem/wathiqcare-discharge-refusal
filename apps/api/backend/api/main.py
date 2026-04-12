from fastapi import FastAPI
from backend.api.routers import discharge
from backend.api.routers.forms_engine import router as forms_engine_router
from backend.api.routers.home_healthcare import router as home_healthcare_router
from backend.api.routers.integration import router as integration_router
from backend.api.routers.emails import router as emails_router
from backend.api.routers.secure_links import router as secure_links_router
from backend.api.routers.alerts import router as alerts_router
from backend.api.routers.sms_evidence import router as sms_evidence_router
from backend.services.integration_monitoring_service import (
	start_integration_scheduler,
	stop_integration_scheduler,
)

app = FastAPI()

app.include_router(discharge.router, prefix="/api", tags=["discharge"])
app.include_router(forms_engine_router)
app.include_router(home_healthcare_router)
app.include_router(integration_router)
app.include_router(emails_router)
app.include_router(secure_links_router)
app.include_router(alerts_router)
app.include_router(sms_evidence_router)


@app.on_event("startup")
def _startup_integration_scheduler() -> None:
	start_integration_scheduler()


@app.on_event("shutdown")
def _shutdown_integration_scheduler() -> None:
	stop_integration_scheduler()
