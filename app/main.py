from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db.database import Base, engine

# These imports register SQLAlchemy models with Base.metadata before create_all is called.
from app.models import (  # noqa: F401
    audit,
    consent,
    discharge_form,
    notification,
    patient,
    refusal_form,
    user,
)
from app.routers import audit as audit_router
from app.routers import auth, discharge_forms, escalation, fhir, patients, refusal_forms
from app.routers import consent as consent_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="WathiqCare", version="1.0.0", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(consent_router.router)
app.include_router(escalation.router)
app.include_router(fhir.router)
app.include_router(audit_router.router)
app.include_router(refusal_forms.router)
app.include_router(discharge_forms.router)


@app.get("/health")
def health():
    return {"status": "ok"}
