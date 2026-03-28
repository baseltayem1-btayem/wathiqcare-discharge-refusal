from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi import FastAPI
from api.routers import cases

app = FastAPI()

app.include_router(cases.router, prefix="/api/cases")
from backend.api.routers import discharge
from backend.api.routers.cases import router as cases_router
from backend.api.routers.emails import router as emails_router
from backend.api.routers.forms_engine import router as forms_engine_router
from backend.api.routers.home_healthcare import router as home_healthcare_router
from backend.api.routers.integration import router as integration_router
from backend.api.routers.legal_queue import router as legal_queue_router

app = FastAPI(
    title="WathiqCare API",
    version="0.1.0",
)


@app.get("/api/health")
def health_check():
    return JSONResponse(content={"status": "ok"})


app.include_router(discharge.router, prefix="/api", tags=["discharge"])
app.include_router(cases_router, prefix="/api/cases", tags=["Cases"])
app.include_router(forms_engine_router)
app.include_router(home_healthcare_router)
app.include_router(integration_router)
app.include_router(emails_router)
app.include_router(legal_queue_router, prefix="/api/legal", tags=["Legal Affairs"])