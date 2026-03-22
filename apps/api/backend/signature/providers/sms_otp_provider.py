from __future__ import annotations

import hashlib
import os
import random
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
import requests

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

        if stub_mode:
            delivery_status = "sent_stub"
            provider = "stub"
        else:
            self._dispatch_live_sms(
                phone_number=phone_number,
                otp_code=otp_code,
                case_id=case_id,
                document_type=document_type,
            )
            delivery_status = "sent"
            provider = self._provider_name()

        return SmsOtpDispatchResult(
            challenge_id=challenge_id,
            delivery_status=delivery_status,
            otp_sent_at=sent_at,
            provider=provider,
            stub_mode=stub_mode,
            otp_debug_code=otp_code,
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
        forced_stub = (os.getenv("WATHIQ_SMS_STUB_MODE") or "").strip().lower()
        if forced_stub in {"1", "true", "yes"}:
            return True

        provider_url = (os.getenv("WATHIQ_SMS_PROVIDER_URL") or "").strip()
        provider_key = (os.getenv("WATHIQ_SMS_PROVIDER_API_KEY") or "").strip()
        return not provider_url or not provider_key

    @staticmethod
    def _provider_name() -> str:
        return (os.getenv("WATHIQ_SMS_PROVIDER_NAME") or "configured_provider").strip() or "configured_provider"

    @staticmethod
    def _provider_sender_id() -> str | None:
        value = (os.getenv("WATHIQ_SMS_SENDER_ID") or "").strip()
        return value or None

    @staticmethod
    def _provider_timeout_seconds() -> int:
        raw = (os.getenv("WATHIQ_SMS_PROVIDER_TIMEOUT_SECONDS") or "15").strip()
        try:
            return max(3, min(60, int(raw)))
        except ValueError:
            return 15

    @staticmethod
    def _render_message(*, otp_code: str, case_id: str, document_type: str) -> str:
        return (
            f"WathiqCare verification code: {otp_code}. "
            f"Case {case_id}, document {document_type}. "
            "If you did not request this code, ignore this message."
        )

    def _dispatch_live_sms(self, *, phone_number: str, otp_code: str, case_id: str, document_type: str) -> None:
        provider_url = (os.getenv("WATHIQ_SMS_PROVIDER_URL") or "").strip()
        provider_key = (os.getenv("WATHIQ_SMS_PROVIDER_API_KEY") or "").strip()
        if not provider_url or not provider_key:
            raise RuntimeError("SMS provider is not configured")

        response = requests.post(
            provider_url,
            json={
                "to": phone_number,
                "message": self._render_message(
                    otp_code=otp_code,
                    case_id=case_id,
                    document_type=document_type,
                ),
                "sender_id": self._provider_sender_id(),
                "otp_code": otp_code,
                "case_id": case_id,
                "document_type": document_type,
            },
            headers={
                "Content-Type": "application/json",
                "X-API-Key": provider_key,
                "Authorization": f"Bearer {provider_key}",
            },
            timeout=self._provider_timeout_seconds(),
        )
        response.raise_for_status()
