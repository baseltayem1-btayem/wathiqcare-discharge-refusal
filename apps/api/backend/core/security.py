from datetime import datetime, timedelta, timezone
import os
import logging

from dotenv import load_dotenv
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ISSUER = (os.getenv("JWT_ISSUER") or "").strip() or None

logger = logging.getLogger(__name__)


def _token_ttl_minutes() -> int:
    raw = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    try:
        parsed = int(raw)
    except (TypeError, ValueError):
        return 30
    return max(15, min(30, parsed))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=_token_ttl_minutes())
    to_encode.update({"exp": expire})
    if JWT_ISSUER:
        to_encode.update({"iss": JWT_ISSUER})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    if not token or not token.strip():
        raise ValueError("missing_token")

    try:
        if JWT_ISSUER:
            payload = jwt.decode(
                token,
                JWT_SECRET_KEY,
                algorithms=[JWT_ALGORITHM],
                issuer=JWT_ISSUER,
            )
        else:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except ExpiredSignatureError as exc:
        raise ValueError("token_expired") from exc
    except JWTError as exc:
        if not JWT_ISSUER:
            raise ValueError("invalid_token") from exc

        # Compatibility fallback: accept legacy tokens without issuer claim
        # when signature and expiration are otherwise valid.
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            logger.warning("jwt_issuer_mismatch_fallback_used")
        except ExpiredSignatureError as exp_exc:
            raise ValueError("token_expired") from exp_exc
        except JWTError as fallback_exc:
            raise ValueError("invalid_token") from fallback_exc

    if not isinstance(payload, dict):
        raise ValueError("invalid_token_payload")

    if not payload.get("sub") or not payload.get("tenant_id"):
        raise ValueError("invalid_token_claims")

    return payload
