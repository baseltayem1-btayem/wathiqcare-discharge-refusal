from fastapi import FastAPI
from backend.api.routers import discharge

app = FastAPI()

app.include_router(discharge.router, prefix="/api", tags=["discharge"])
