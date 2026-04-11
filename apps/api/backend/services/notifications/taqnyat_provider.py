import logging
import os

import requests

from backend.services.notifications.base import SmsMessageType, SmsProvider

logger = logging.getLogger(__name__)


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
        base_url = (os.getenv("SMS_BASE_URL") or "https://api.taqnyat.sa").rstrip("/")
        endpoint = (os.getenv("SMS_MESSAGES_ENDPOINT") or "/v1/messages").strip()
        if not endpoint.startswith("/"):
            endpoint = f"/{endpoint}"

        self.base_url = base_url
        self.messages_path = endpoint
        self.url = f"{base_url}{endpoint}"
        self.token = os.getenv("SMS_BEARER_TOKEN", "")
        self.sender = os.getenv("SMS_SENDER", "IMC")
        # Separate CST-registered promotional sender ID (must be distinct from service sender)
        self.promotional_sender = os.getenv("SMS_PROMOTIONAL_SENDER", "").strip() or None

        if not self.token:
            raise ValueError("SMS_BEARER_TOKEN is not configured")

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
            raise ValueError(
                "Promotional SMS requires SMS_PROMOTIONAL_SENDER to be configured with a CST-registered "
                "ADV sender ID. Cannot use the transactional sender ID for promotional messages."
            )

        sender = self.promotional_sender if message_type == SmsMessageType.PROMOTIONAL else self.sender
        normalized_recipient = self.normalize_recipient(to)
        payload = {
            "recipients": [normalized_recipient],
            "body": message,
            "sender": sender,
        }

        # Log intent without exposing token
        logger.info(
            "Sending SMS via Taqnyat to=%s sender=%s url=%s",
            normalized_recipient,
            sender,
            self.url,
        )

        result = self._request(method="POST", path=self.messages_path, json_payload=payload)
        http_ok = bool(result.get("ok"))

        if not http_ok:
            logger.warning(
                "Taqnyat SMS delivery failed: status=%s to=%s",
                result.get("status_code"),
                normalized_recipient,
            )
        else:
            logger.info("Taqnyat SMS delivered successfully to=%s", normalized_recipient)
        return result
