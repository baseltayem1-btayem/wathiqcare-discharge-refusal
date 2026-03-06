from fastapi import APIRouter, HTTPException
from backend.schemas.auth import LoginRequest, TokenResponse
from backend.core.database import SessionLocal
from backend.models.user import User
from backend.models.tenant import Tenant
from backend.core.security import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == payload.email).first()
        if not user or not user.hashed_password:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not verify_password(payload.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()

        token = create_access_token({
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "tenant_id": user.tenant_id,
            "tenant_code": tenant.code if tenant else None,
        })

        return TokenResponse(access_token=token)

    finally:
        db.close()
