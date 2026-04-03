import os
import logging
import requests

from backend.services.notifications.base import SmsProvider

logger = logging.getLogger(__name__)


class TaqnyatProvider(SmsProvider):
    """Taqnyat SMS provider (https://api.taqnyat.sa)."""

    def __init__(self):
        self.url = os.getenv("SMS_BASE_URL", "").rstrip("/")
        self.token = os.getenv("SMS_BEARER_TOKEN", "")
        self.sender = os.getenv("SMS_SENDER", "IMC")

        if not self.url:
            raise ValueError("SMS_BASE_URL is not configured")
        if not self.token:
            raise ValueError("SMS_BEARER_TOKEN is not configured")

    def send_sms(self, to: str, message: str) -> dict:
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

        payload = {
            "recipients": [to],
            "body": message,
            "sender": self.sender,
        }

        # Log intent without exposing token
        logger.info(
            "Sending SMS via Taqnyat to=%s sender=%s url=%s",
            to,
            self.sender,
            self.url,
        )

        try:
            response = requests.post(
                self.url,
                json=payload,
                headers=headers,
                timeout=20,
            )
        except requests.exceptions.Timeout:
            logger.error("Taqnyat SMS request timed out for to=%s", to)
            return {"ok": False, "status_code": 408, "data": {"error": "Request timed out"}}
        except requests.exceptions.RequestException as exc:
            logger.error("Taqnyat SMS request failed for to=%s: %s", to, exc)
            return {"ok": False, "status_code": 503, "data": {"error": str(exc)}}

        try:
            data = response.json()
        except Exception:
            data = {"raw": response.text}

        if not response.ok:
            logger.warning(
                "Taqnyat SMS delivery failed: status=%s to=%s",
                response.status_code,
                to,
            )
        else:
            logger.info("Taqnyat SMS delivered successfully to=%s", to)

        return {
            "ok": response.ok,
            "status_code": response.status_code,
            "data": data,
        }
