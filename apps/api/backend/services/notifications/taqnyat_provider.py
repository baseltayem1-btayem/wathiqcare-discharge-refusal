import logging
import os
import time

import requests

from backend.services.notifications.base import SmsMessageType, SmsProvider

logger = logging.getLogger(__name__)

RETRYABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}
MAX_SMS_SEND_ATTEMPTS = 3


class TaqnyatProvider(SmsProvider):
    """Taqnyat SMS provider (https://api.taqnyat.sa)."""

    @staticmethod
    def normalize_recipient(recipient: str) -> str:
        raw = (recipient or "").strip()
        if not raw:
            raise ValueError("SMS recipient is required")

        normalized = "".join(ch for ch in raw if ch.isdigit() or ch == "+")
        if normalized.startswith("+"):
            normalized = normalized[1:]
        if normalized.startswith("00"):
            normalized = normalized[2:]

        default_country_code = (os.getenv("SMS_DEFAULT_COUNTRY_CODE") or "966").strip()
        if normalized.startswith("0") and default_country_code:
            normalized = f"{default_country_code}{normalized[1:]}"
        elif normalized.startswith("5") and len(normalized) == 9 and default_country_code == "966":
            normalized = f"{default_country_code}{normalized}"

        if not normalized.isdigit():
            raise ValueError("SMS recipient must contain digits only after normalization")
        if len(normalized) < 8 or len(normalized) > 15:
            raise ValueError("SMS recipient must be in international format without '+' or '00'")

        return normalized

    def __init__(self):
        base_url = (os.getenv("SMS_BASE_URL") or "").strip().rstrip("/")
        endpoint = (os.getenv("SMS_MESSAGES_ENDPOINT") or "/v1/messages").strip()
        if not endpoint.startswith("/"):
            endpoint = f"/{endpoint}"

        self.base_url = base_url
        self.messages_path = endpoint
        self.url = f"{base_url}{endpoint}"
        self.token = (os.getenv("SMS_BEARER_TOKEN") or "").strip()
        self.sender = (os.getenv("SMS_SENDER") or "").strip()
        self.initial_backoff_seconds = float((os.getenv("SMS_RETRY_BACKOFF_SECONDS") or "1").strip() or "1")
        # Separate CST-registered promotional sender ID (must be distinct from service sender)
        self.promotional_sender = os.getenv("SMS_PROMOTIONAL_SENDER", "").strip() or None

        if not self.base_url:
            raise ValueError("SMS_BASE_URL is not configured")
        if not self.token:
            raise ValueError("SMS_BEARER_TOKEN is not configured")
        if not self.sender:
            raise ValueError("SMS_SENDER is not configured")

    @staticmethod
    def _mask_recipient(recipient: str) -> str:
        if len(recipient) <= 4:
            return "****"
        return f"{recipient[:3]}****{recipient[-2:]}"

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    def _request(self, *, method: str, path: str, json_payload: dict | None = None, timeout: int = 20) -> dict:
        endpoint = path if path.startswith("/") else f"/{path}"
        url = f"{self.base_url}{endpoint}"

        try:
            response = requests.request(
                method=method,
                url=url,
                json=json_payload,
                headers=self._headers(),
                timeout=timeout,
            )
        except requests.exceptions.Timeout:
            logger.error("Taqnyat request timed out: %s %s", method, endpoint)
            return {"ok": False, "status_code": 408, "data": {"error": "Request timed out"}}
        except requests.exceptions.RequestException as exc:
            logger.error("Taqnyat request failed: %s %s error=%s", method, endpoint, exc)
            return {"ok": False, "status_code": 503, "data": {"error": str(exc)}}

        try:
            data = response.json()
        except Exception:
            data = {"raw": response.text}

        api_status_code = data.get("statusCode") if isinstance(data, dict) else None
        ok = response.ok and (api_status_code in (None, 200, 201))
        return {
            "ok": ok,
            "status_code": response.status_code,
            "data": data,
        }

    def get_system_status(self) -> dict:
        """GET /system/status"""
        logger.info("Checking Taqnyat system status")
        return self._request(method="GET", path="/system/status")

    def get_account_balance(self) -> dict:
        """GET /account/balance"""
        logger.info("Checking Taqnyat account balance")
        return self._request(method="GET", path="/account/balance")

    def get_sender_names(self) -> dict:
        """GET /v1/messages/senders"""
        logger.info("Fetching Taqnyat sender names")
        return self._request(method="GET", path="/v1/messages/senders")

    def send_sms(self, to: str, message: str, *, message_type: SmsMessageType = SmsMessageType.TRANSACTIONAL) -> dict:
        if message_type == SmsMessageType.PROMOTIONAL and not self.promotional_sender:
            logger.error(
                "sms_send_failed provider=taqnyat error_code=MISSING_PROMOTIONAL_SENDER reason=promotional_sender_missing",
            )
            return {
                "ok": False,
                "status_code": 500,
                "data": {
                    "error": "Promotional SMS requires SMS_PROMOTIONAL_SENDER.",
                    "error_code": "MISSING_PROMOTIONAL_SENDER",
                },
            }

        sender = self.promotional_sender if message_type == SmsMessageType.PROMOTIONAL else self.sender
        try:
            normalized_recipient = self.normalize_recipient(to)
        except ValueError as exc:
            logger.warning(
                "sms_send_failed provider=taqnyat error_code=INVALID_PHONE_NUMBER reason=%s",
                str(exc),
            )
            return {
                "ok": False,
                "status_code": 400,
                "data": {
                    "error": str(exc),
                    "error_code": "INVALID_PHONE_NUMBER",
                },
            }

        payload = {
            "recipients": [normalized_recipient],
            "body": message,
            "sender": sender,
        }

        backoff_seconds = max(self.initial_backoff_seconds, 0.1)
        masked_recipient = self._mask_recipient(normalized_recipient)
        last_result: dict | None = None

        for attempt in range(1, MAX_SMS_SEND_ATTEMPTS + 1):
            logger.info(
                "sms_send_requested provider=taqnyat attempt=%s max_attempts=%s recipient=%s sender=%s message_type=%s",
                attempt,
                MAX_SMS_SEND_ATTEMPTS,
                masked_recipient,
                sender,
                message_type.value,
            )

            result = self._request(method="POST", path=self.messages_path, json_payload=payload)
            result["attempt"] = attempt
            result["max_attempts"] = MAX_SMS_SEND_ATTEMPTS
            last_result = result

            if result.get("ok"):
                logger.info(
                    "sms_send_succeeded provider=taqnyat attempt=%s recipient=%s status_code=%s",
                    attempt,
                    masked_recipient,
                    result.get("status_code"),
                )
                return result

            status_code = int(result.get("status_code") or 500)
            retryable = status_code in RETRYABLE_STATUS_CODES
            logger.warning(
                "sms_send_failed provider=taqnyat attempt=%s recipient=%s status_code=%s retryable=%s",
                attempt,
                masked_recipient,
                status_code,
                retryable,
            )

            if retryable and attempt < MAX_SMS_SEND_ATTEMPTS:
                logger.info(
                    "sms_send_retry_scheduled provider=taqnyat next_attempt=%s sleep_seconds=%.2f recipient=%s",
                    attempt + 1,
                    backoff_seconds,
                    masked_recipient,
                )
                time.sleep(backoff_seconds)
                backoff_seconds *= 2

        return last_result or {
            "ok": False,
            "status_code": 503,
            "data": {
                "error": "SMS request failed",
                "error_code": "SMS_REQUEST_FAILED",
            },
            "attempt": MAX_SMS_SEND_ATTEMPTS,
            "max_attempts": MAX_SMS_SEND_ATTEMPTS,
        }
