import os
import logging

from backend.services.notifications.base import SmsMessageType
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

    def send(self, to: str, message: str, *, message_type: SmsMessageType = SmsMessageType.TRANSACTIONAL) -> dict:
        if os.getenv("SMS_ENABLED", "true").lower() != "true":
            logger.info("SMS sending is disabled (SMS_ENABLED != true)")
            return {"ok": False, "reason": "SMS disabled"}

        return self.provider.send_sms(to, message, message_type=message_type)

    def get_system_status(self) -> dict:
        return self.provider.get_system_status()

    def get_account_balance(self) -> dict:
        return self.provider.get_account_balance()

    def get_sender_names(self) -> dict:
        return self.provider.get_sender_names()
