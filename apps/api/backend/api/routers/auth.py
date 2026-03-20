from datetime import datetime, timedelta
from threading import Lock

from fastapi import APIRouter, HTTPException
from backend.schemas.auth import LoginRequest, TokenResponse
from backend.core.database import SessionLocal
from backend.models.user import User
from backend.models.tenant import Tenant
from backend.core.security import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

_FAILED_LOGIN_ATTEMPTS: dict[str, list[datetime]] = {}
_FAILED_LOGIN_LOCK = Lock()
_MAX_FAILED_ATTEMPTS = 5
_FAILED_ATTEMPT_WINDOW = timedelta(minutes=5)


def _is_rate_limited(email: str) -> bool:
    now = datetime.utcnow()
    with _FAILED_LOGIN_LOCK:
        attempts = _FAILED_LOGIN_ATTEMPTS.get(email, [])
        attempts = [t for t in attempts if now - t <= _FAILED_ATTEMPT_WINDOW]
        _FAILED_LOGIN_ATTEMPTS[email] = attempts
        return len(attempts) >= _MAX_FAILED_ATTEMPTS


def _register_failed_attempt(email: str) -> None:
    now = datetime.utcnow()
    with _FAILED_LOGIN_LOCK:
        attempts = _FAILED_LOGIN_ATTEMPTS.get(email, [])
        attempts.append(now)
        _FAILED_LOGIN_ATTEMPTS[email] = [t for t in attempts if now - t <= _FAILED_ATTEMPT_WINDOW]


def _clear_failed_attempts(email: str) -> None:
    with _FAILED_LOGIN_LOCK:
        _FAILED_LOGIN_ATTEMPTS.pop(email, None)

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    db = SessionLocal()
    try:
        email = (payload.email or "").strip().lower()
        if _is_rate_limited(email):
            raise HTTPException(status_code=429, detail="عدد محاولات الدخول كبير. يرجى المحاولة لاحقاً")

        user = db.query(User).filter(User.email == email).first()
        if not user or not user.hashed_password:
            _register_failed_attempt(email)
            raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")
        if not user.is_active:
            raise HTTPException(status_code=401, detail="تم تعطيل حساب المستخدم")

        if not verify_password(payload.password, user.hashed_password):
            _register_failed_attempt(email)
            raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")

        _clear_failed_attempts(email)

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
