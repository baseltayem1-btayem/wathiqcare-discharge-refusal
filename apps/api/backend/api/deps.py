from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

from backend.core.database import SessionLocal
from backend.core.roles import canonicalize_role, role_allows
from backend.core.security import decode_access_token
from backend.models.tenant import Tenant
from backend.models.user import User

security = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials is None or not credentials.credentials:
        logger.warning("auth_missing_credentials")
        raise HTTPException(status_code=401, detail="رمز الدخول مفقود")

    token = credentials.credentials

    try:
        payload = decode_access_token(token)
    except ValueError as exc:
        logger.warning("auth_decode_failed reason=%s", str(exc))
        raise HTTPException(status_code=401, detail="رمز الدخول غير صالح أو منتهي الصلاحية")

    user_id = payload.get("sub")
    if not user_id:
        logger.warning("auth_invalid_claims missing_sub")
        raise HTTPException(status_code=401, detail="بيانات رمز الدخول غير صحيحة")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning("auth_user_not_found user_id=%s", user_id)
            raise HTTPException(status_code=401, detail="المستخدم غير موجود")
        if not user.is_active:
            logger.warning("auth_user_inactive user_id=%s", user_id)
            raise HTTPException(status_code=401, detail="تم تعطيل حساب المستخدم")
        if payload.get("tenant_id") != user.tenant_id:
            logger.warning("auth_tenant_mismatch user_id=%s token_tenant=%s db_tenant=%s", user_id, payload.get("tenant_id"), user.tenant_id)
            raise HTTPException(status_code=401, detail="بيانات رمز الدخول غير متطابقة")

        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if tenant and not tenant.is_active and not canonicalize_role(user.role).startswith("platform_"):
            logger.warning("auth_tenant_inactive user_id=%s tenant_id=%s", user_id, user.tenant_id)
            raise HTTPException(status_code=403, detail="المؤسسة غير مفعلة حالياً")

        return {
            "id": user.id,
            "email": user.email,
            "role": canonicalize_role(user.role),
            "tenant_id": user.tenant_id,
            "tenant_code": payload.get("tenant_code"),
        }
    finally:
        db.close()

def require_roles(*allowed_roles):
    def role_checker(current_user=Depends(get_current_user)):
        if not role_allows(current_user["role"], allowed_roles):
            raise HTTPException(status_code=403, detail="الصلاحيات غير كافية")
        return current_user
    return role_checker
