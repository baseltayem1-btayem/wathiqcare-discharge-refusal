class SmsProvider:
    """Abstract base class for SMS provider implementations."""

    def send_sms(self, to: str, message: str) -> dict:
        raise NotImplementedError
