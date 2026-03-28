from backend.core.database import SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.core.database import SessionLocal
from backend.core.security import decode_access_token
from backend.models.user import User

security = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="رمز الدخول مفقود")

    token = credentials.credentials

    try:
        payload = decode_access_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="رمز الدخول غير صالح أو منتهي الصلاحية")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="بيانات رمز الدخول غير صحيحة")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="المستخدم غير موجود")
        if not user.is_active:
            raise HTTPException(status_code=401, detail="تم تعطيل حساب المستخدم")
        if payload.get("tenant_id") != user.tenant_id:
            raise HTTPException(status_code=401, detail="بيانات رمز الدخول غير متطابقة")

        return {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "tenant_id": user.tenant_id,
            "tenant_code": payload.get("tenant_code"),
        }
    finally:
        db.close()

def require_roles(*allowed_roles):
    def role_checker(current_user=Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="الصلاحيات غير كافية")
        return current_user
    return role_checker
