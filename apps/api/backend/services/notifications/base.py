from enum import Enum


class SmsMessageType(str, Enum):
    """CST/CITC message classification for KSA SMS compliance.

    TRANSACTIONAL — OTP, case notifications, legal notices. Sender registered as service.
    PROMOTIONAL    — Marketing, campaigns. Requires separate CST-registered sender ID
                     with "ADV" classification; subject to opt-out rules.
    """

    TRANSACTIONAL = "transactional"
    PROMOTIONAL = "promotional"


class SmsProvider:
    """Abstract base class for SMS provider implementations."""

    def send_sms(self, to: str, message: str, *, message_type: SmsMessageType = SmsMessageType.TRANSACTIONAL) -> dict:
        raise NotImplementedError
