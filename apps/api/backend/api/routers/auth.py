import logging
from datetime import datetime, timedelta
from threading import Lock

from fastapi import APIRouter, HTTPException

from backend.core.database import SessionLocal
from backend.core.security import create_access_token, verify_password
from backend.models.tenant import Tenant
from backend.models.user import User
from backend.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger(__name__)

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


def _masked_email(email: str) -> str:
    if "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    visible = local[:2] if len(local) > 2 else local[:1]
    return f"{visible}***@{domain}"


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    db = SessionLocal()
    try:
        email = (payload.email or "").strip().lower()
        logger.info("login_attempt email=%s", _masked_email(email))

        if _is_rate_limited(email):
            logger.warning("login_rate_limited email=%s", _masked_email(email))
            raise HTTPException(status_code=429, detail="عدد محاولات الدخول كبير. يرجى المحاولة لاحقاً")

        user = db.query(User).filter(User.email == email).first()
        if not user or not user.hashed_password:
            _register_failed_attempt(email)
            logger.warning("login_failed_invalid_credentials email=%s", _masked_email(email))
            raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")
        if not user.is_active:
            logger.warning("login_failed_inactive_user email=%s", _masked_email(email))
            raise HTTPException(status_code=401, detail="تم تعطيل حساب المستخدم")

        if not verify_password(payload.password, user.hashed_password):
            _register_failed_attempt(email)
            logger.warning("login_failed_invalid_credentials email=%s", _masked_email(email))
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

        logger.info(
            "login_success user_id=%s tenant_id=%s role=%s",
            user.id,
            user.tenant_id,
            user.role,
        )

        return TokenResponse(access_token=token)

    finally:
        db.close()
