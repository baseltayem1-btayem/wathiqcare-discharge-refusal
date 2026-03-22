from datetime import datetime, timedelta, timezone
import os
import logging

from dotenv import load_dotenv
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEFAULT_JWT_ISSUER = "wathiqcare"

logger = logging.getLogger(__name__)


def get_jwt_secret_key() -> str:
    secret = (os.getenv("JWT_SECRET_KEY") or "").strip()
    if not secret or secret == "change-me":
        raise ValueError("jwt_secret_not_configured")
    return secret


def get_jwt_algorithm() -> str:
    algorithm = (os.getenv("JWT_ALGORITHM") or "HS256").strip().upper()
    if algorithm != "HS256":
        raise ValueError("jwt_algorithm_not_supported")
    return algorithm


def get_jwt_issuer() -> str:
    return (os.getenv("JWT_ISSUER") or DEFAULT_JWT_ISSUER).strip() or DEFAULT_JWT_ISSUER


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
    to_encode.update({"iss": get_jwt_issuer()})
    return jwt.encode(to_encode, get_jwt_secret_key(), algorithm=get_jwt_algorithm())


def decode_access_token(token: str) -> dict:
    if not token or not token.strip():
        raise ValueError("missing_token")

    try:
        payload = jwt.decode(
            token,
            get_jwt_secret_key(),
            algorithms=[get_jwt_algorithm()],
            issuer=get_jwt_issuer(),
        )
    except ExpiredSignatureError as exc:
        raise ValueError("token_expired") from exc
    except JWTError as exc:
        raise ValueError("invalid_token") from exc

    if not isinstance(payload, dict):
        raise ValueError("invalid_token_payload")

    if not payload.get("sub"):
        raise ValueError("invalid_token_claims")

    return payload
