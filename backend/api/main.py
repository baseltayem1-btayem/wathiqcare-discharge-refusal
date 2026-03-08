from fastapi import FastAPI
from backend.api.routers import discharge
from backend.api.routers.home_healthcare import router as home_healthcare_router

app = FastAPI()

app.include_router(discharge.router, prefix="/api", tags=["discharge"])
app.include_router(home_healthcare_router)
