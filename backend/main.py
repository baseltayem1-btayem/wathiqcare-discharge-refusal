from fastapi import FastAPI
from backend.api.routers.discharge import router as discharge_router
from backend.api.routers.auth import router as auth_router

app = FastAPI(
    title="WathiqCare Core API",
    version="0.1.0"
)

@app.get("/")
def root():
    return {"message": "WathiqCare API is running"}

app.include_router(auth_router)
app.include_router(discharge_router)
