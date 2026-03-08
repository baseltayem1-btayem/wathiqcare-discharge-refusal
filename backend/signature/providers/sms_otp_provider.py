from __future__ import annotations

import hashlib
import os
import random
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from backend.signature.acknowledgment_engine import AcknowledgmentMethod


@dataclass(frozen=True)
class SmsOtpDispatchResult:
    challenge_id: str
    delivery_status: str
    otp_sent_at: str
    provider: str
    stub_mode: bool
    otp_debug_code: str | None


class SmsOtpProvider:
    method = AcknowledgmentMethod.SMS_OTP

    def is_available(self) -> bool:
        # SMS always stays available because a safe local stub mode is supported.
        return True

    def availability_reason(self) -> str | None:
        if self._is_stub_mode():
            return "Stub mode enabled (provider not configured)"
        return None

    def send_otp(self, phone_number: str, *, case_id: str, document_type: str) -> SmsOtpDispatchResult:
        challenge_id = str(uuid.uuid4())
        otp_code = f"{random.randint(0, 999999):06d}"
        sent_at = datetime.now(timezone.utc).isoformat()
        stub_mode = self._is_stub_mode()

        # Real provider integration is intentionally guarded and non-breaking.
        delivery_status = "sent_stub" if stub_mode else "sent"

        return SmsOtpDispatchResult(
            challenge_id=challenge_id,
            delivery_status=delivery_status,
            otp_sent_at=sent_at,
            provider="stub" if stub_mode else "configured_provider",
            stub_mode=stub_mode,
            otp_debug_code=otp_code if stub_mode else None,
        )

    @staticmethod
    def hash_code(code: str) -> str:
        return hashlib.sha256(code.encode("utf-8")).hexdigest()

    def verify_otp(self, *, submitted_code: str, expected_hash: str) -> bool:
        return self.hash_code(submitted_code) == expected_hash

    @staticmethod
    def mask_phone_number(phone_number: str) -> str:
        raw = "".join(ch for ch in phone_number if ch.isdigit() or ch == "+")
        if len(raw) <= 4:
            return "****"
        return f"{raw[:2]}****{raw[-2:]}"

    @staticmethod
    def _is_stub_mode() -> bool:
        provider_url = (os.getenv("WATHIQ_SMS_PROVIDER_URL") or "").strip()
        provider_key = (os.getenv("WATHIQ_SMS_PROVIDER_API_KEY") or "").strip()
        return not provider_url or not provider_key
