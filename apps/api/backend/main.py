import logging
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import backend.models  # noqa: F401
from backend.init_db import init_database
from backend.api.routers.auth import router as auth_router
from backend.api.routers.discharge import router as discharge_router
from backend.api.routers.discharge_refusal_workflow import router as discharge_refusal_workflow_router
from backend.api.routers.emails import router as emails_router
from backend.api.routers.forms_engine import router as forms_engine_router
from backend.api.routers.home_healthcare import router as home_healthcare_router
from backend.api.routers.integration import router as integration_router
from backend.api.routers.medico_legal_forms import router as medico_legal_forms_router
from backend.api.routers.secure_links import router as secure_links_router
from backend.api.routers.shc_discharge_compliance import router as shc_discharge_compliance_router
from backend.api.routers.signature import router as signature_router
from backend.api.routers.sms_test import router as sms_test_router
from backend.api.routers.system_inspect import router as system_inspect_router
from backend.api.routers.workflow import router as workflow_router
from backend.core.http_hardening import (
    SensitiveRouteRateLimiter,
    unauthorized_exception_handler,
    unhandled_exception_handler,
)
from backend.services.integration_monitoring_service import (
    start_integration_scheduler,
    stop_integration_scheduler,
)

logger = logging.getLogger(__name__)

app = FastAPI(title="WathiqCare Core API", version="0.1.0")

cors_origins = [o.strip() for o in os.getenv("CORS_ALLOW_ORIGINS", "https://wathiqcare.online").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With", "Accept"],
)

rate_limiter = SensitiveRouteRateLimiter(
    limit_per_minute=int(os.getenv("SENSITIVE_ROUTE_RATE_LIMIT_PER_MIN", "100"))
)

if os.getenv("SENTRY_DSN"):
    logger.info("sentry_placeholder_enabled dsn_configured=true")


@app.middleware("http")
async def request_hardening_middleware(request: Request, call_next):
    if not rate_limiter.allow(request):
        return JSONResponse(status_code=429, content={"message": "Too many requests"})

    try:
        response = await call_next(request)
    except Exception as exc:
        logger.exception("request_failed path=%s method=%s", request.url.path, request.method, exc_info=exc)
        raise

    if response.status_code >= 500:
        logger.error("api_error path=%s method=%s status=%s", request.url.path, request.method, response.status_code)

    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 401:
        return unauthorized_exception_handler(request, exc)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return unhandled_exception_handler(request, exc)


@app.get("/")
def root():
    return {"message": "WathiqCare API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.on_event("startup")
def _startup_integration_scheduler() -> None:
     try:
          init_database()
          logger.info("Database tables initialized successfully")
     except Exception as e:
          logger.error(f"Database initialization failed: {e}")
    start_integration_scheduler()


@app.on_event("shutdown")
def _shutdown_integration_scheduler() -> None:
    stop_integration_scheduler()


app.include_router(auth_router)
app.include_router(discharge_router)
app.include_router(discharge_refusal_workflow_router)
app.include_router(forms_engine_router)
app.include_router(signature_router)
app.include_router(home_healthcare_router)
app.include_router(integration_router)
app.include_router(emails_router)
app.include_router(workflow_router)
app.include_router(system_inspect_router)
app.include_router(sms_test_router)
app.include_router(secure_links_router)
app.include_router(medico_legal_forms_router)

if os.getenv("SHC_COMPLIANCE_MODULE", "false").lower() == "true":
    app.include_router(shc_discharge_compliance_router)
