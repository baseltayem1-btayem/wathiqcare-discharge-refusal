from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from backend.signature.acknowledgment_engine import AcknowledgmentMethod


@dataclass(frozen=True)
class NafathStartResult:
    request_id: str
    status: str
    initiated_at: str
    provider: str


class NafathProvider:
    method = AcknowledgmentMethod.NAFATH

    def is_available(self) -> bool:
        enabled = (os.getenv("WATHIQ_NAFATH_ENABLED") or "").strip().lower() in {"1", "true", "yes"}
        endpoint = (os.getenv("WATHIQ_NAFATH_API_URL") or "").strip()
        client_id = (os.getenv("WATHIQ_NAFATH_CLIENT_ID") or "").strip()
        return enabled and bool(endpoint) and bool(client_id)

    def availability_reason(self) -> str | None:
        if self.is_available():
            return None
        return "Nafath is not configured in this environment"

    def start_verification(self, *, case_id: str, document_type: str, national_id: str | None) -> NafathStartResult:
        if not self.is_available():
            return NafathStartResult(
                request_id=str(uuid.uuid4()),
                status="unavailable",
                initiated_at=datetime.now(timezone.utc).isoformat(),
                provider="nafath",
            )

        return NafathStartResult(
            request_id=str(uuid.uuid4()),
            status="pending",
            initiated_at=datetime.now(timezone.utc).isoformat(),
            provider="nafath",
        )

    def verify(self, *, request_id: str, payload: dict) -> dict:
        if not self.is_available():
            return {
                "verified": False,
                "status": "unavailable",
                "request_id": request_id,
            }

        status = str(payload.get("nafath_status") or "").strip().lower()
        if status == "approved":
            return {
                "verified": True,
                "status": "approved",
                "request_id": request_id,
                "verified_at": datetime.now(timezone.utc).isoformat(),
            }

        return {
            "verified": False,
            "status": "pending",
            "request_id": request_id,
        }
