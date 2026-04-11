from __future__ import annotations

import hashlib
import os
import random
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from backend.signature.acknowledgment_engine import AcknowledgmentMethod
from backend.services.notifications.base import SmsMessageType
from backend.services.notifications.sms_service import SmsService


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
        if self._stub_mode_requested() and not self._is_non_production():
            return False
        if self._allow_stub_mode():
            return True
        if os.getenv("SMS_ENABLED", "true").lower() != "true":
            return False
        try:
            SmsService()
            return True
        except Exception:
            return False

    def availability_reason(self) -> str | None:
        if self._stub_mode_requested() and not self._is_non_production():
            return "Stub mode is forbidden outside development/test environments"
        if self._allow_stub_mode():
            return "Stub mode enabled for non-production environment"
        if os.getenv("SMS_ENABLED", "true").lower() != "true":
            return "SMS sending is disabled"
        try:
            SmsService()
        except Exception as exc:
            return str(exc)
        return None

    def send_otp(self, phone_number: str, *, case_id: str, document_type: str) -> SmsOtpDispatchResult:
        challenge_id = str(uuid.uuid4())
        otp_code = f"{random.randint(0, 999999):06d}"
        sent_at = datetime.now(timezone.utc).isoformat()
        if self._stub_mode_requested() and not self._is_non_production():
            raise RuntimeError("WATHIQ_SMS_STUB_MODE is not allowed in production")

        stub_mode = self._allow_stub_mode()

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
    def _runtime_env() -> str:
        explicit = (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or os.getenv("NODE_ENV") or "").strip().lower()
        if explicit:
            return explicit
        if os.getenv("PYTEST_CURRENT_TEST"):
            return "test"
        return "production"

    @staticmethod
    def _is_non_production() -> bool:
        return SmsOtpProvider._runtime_env() in {"development", "dev", "test", "testing", "local"}

    @staticmethod
    def _stub_mode_requested() -> bool:
        forced_stub = (os.getenv("WATHIQ_SMS_STUB_MODE") or "").strip().lower()
        return forced_stub in {"1", "true", "yes"}

    @staticmethod
    def _allow_stub_mode() -> bool:
        return SmsOtpProvider._stub_mode_requested() and SmsOtpProvider._is_non_production()

    @staticmethod
    def _provider_name() -> str:
        return (os.getenv("SMS_PROVIDER") or "taqnyat").strip().lower() or "taqnyat"

    @staticmethod
    def _render_message(*, otp_code: str, case_id: str, document_type: str) -> str:
        return (
            f"WathiqCare verification code: {otp_code}. "
            f"Case {case_id}, document {document_type}. "
            "If you did not request this code, ignore this message."
        )

    def _dispatch_live_sms(self, *, phone_number: str, otp_code: str, case_id: str, document_type: str) -> None:
        service = SmsService()
        result = service.send(
            phone_number,
            self._render_message(
                otp_code=otp_code,
                case_id=case_id,
                document_type=document_type,
            ),
            message_type=SmsMessageType.TRANSACTIONAL,
        )
        if result.get("ok"):
            return

        detail = result.get("data") or result.get("reason") or "unknown error"
        raise RuntimeError(f"SMS delivery failed: {detail}")
