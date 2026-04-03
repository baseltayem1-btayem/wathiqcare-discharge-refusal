import os
import logging

from backend.services.notifications.taqnyat_provider import TaqnyatProvider

logger = logging.getLogger(__name__)


class SmsService:
    """Central SMS service — selects provider from SMS_PROVIDER env var."""

    def __init__(self):
        provider = os.getenv("SMS_PROVIDER", "taqnyat").lower()

        if provider == "taqnyat":
            self.provider = TaqnyatProvider()
        else:
            raise ValueError(f"Unsupported SMS provider: {provider}")

    def send(self, to: str, message: str) -> dict:
        if os.getenv("SMS_ENABLED", "true").lower() != "true":
            logger.info("SMS sending is disabled (SMS_ENABLED != true)")
            return {"ok": False, "reason": "SMS disabled"}

        return self.provider.send_sms(to, message)
