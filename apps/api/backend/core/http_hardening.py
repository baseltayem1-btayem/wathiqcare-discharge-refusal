from __future__ import annotations

import logging
import re
import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

_OTP_ROUTE_PATTERN = re.compile(r"^/api/documents/[^/]+/(send-otp|verify-otp)$")


class SensitiveRouteRateLimiter:
    """Simple in-memory rate limiter for sensitive endpoints.

    This limiter is intentionally lightweight and non-breaking for current deployment.
    It limits requests by client IP within a rolling 60-second window.
    """

    def __init__(self, *, limit_per_minute: int = 100):
        self.limit_per_minute = max(1, int(limit_per_minute))
        self._events: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    @staticmethod
    def _client_ip(request: Request) -> str:
        forwarded = (request.headers.get("x-forwarded-for") or "").strip()
        if forwarded:
            return forwarded.split(",")[0].strip() or "unknown"
        if request.client and request.client.host:
            return request.client.host
        return "unknown"

    @staticmethod
    def _is_sensitive_route(path: str) -> bool:
        if path.startswith("/auth/"):
            return True
        if path.startswith("/otp/"):
            return True
        if path.startswith("/secure-links/"):
            return True
        if path.startswith("/api/secure-links/"):
            return True
        if path.startswith("/api/discharge/secure/"):
            return True
        return _OTP_ROUTE_PATTERN.match(path) is not None

    def allow(self, request: Request) -> bool:
        if request.method.upper() == "OPTIONS":
            return True

        path = request.url.path
        if not self._is_sensitive_route(path):
            return True

        now = time.time()
        min_time = now - 60
        ip_key = self._client_ip(request)
        key = f"{ip_key}"

        with self._lock:
            q = self._events[key]
            while q and q[0] < min_time:
                q.popleft()

            if len(q) >= self.limit_per_minute:
                logger.warning("rate_limit_exceeded ip=%s path=%s", ip_key, path)
                return False

            q.append(now)
            return True


def unauthorized_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    # Normalize all 401 responses to avoid leaking auth internals.
    _ = exc
    return JSONResponse(status_code=401, content={"message": "Unauthorized"})


def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled_exception", exc_info=exc)
    return JSONResponse(status_code=500, content={"message": "Internal server error"})
