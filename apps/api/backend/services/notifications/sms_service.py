import os
import logging
from datetime import datetime
from typing import Any

from backend.services.notifications.base import SmsMessageType
from backend.services.notifications.sms_evidence_service import persist_sms_evidence
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

    def send(
        self,
        to: str,
        message: str,
        *,
        message_type: SmsMessageType = SmsMessageType.TRANSACTIONAL,
        case_id: str | None = None,
        document_id: str | None = None,
        recipient_role: str | None = None,
        event_type: str = "sms_send",
        message_template_key: str | None = None,
        message_template_version: str | None = None,
        metadata_json: dict[str, Any] | None = None,
    ) -> dict:
        requested_at = datetime.utcnow()
        logger.info(
            "sms_send_requested provider=%s message_type=%s",
            type(self.provider).__name__.replace("Provider", "").lower(),
            message_type.value,
        )

        if os.getenv("SMS_ENABLED", "true").lower() != "true":
            logger.warning("sms_send_failed provider=taqnyat error_code=SMS_DISABLED reason=sms_disabled")
            result = {
                "ok": False,
                "status_code": 503,
                "data": {
                    "error": "SMS sending is disabled",
                    "error_code": "SMS_DISABLED",
                },
            }
            persist_sms_evidence(
                to=to,
                message=message,
                result=result,
                provider="taqnyat",
                event_type=event_type,
                case_id=case_id,
                document_id=document_id,
                recipient_role=recipient_role,
                message_template_key=message_template_key,
                message_template_version=message_template_version,
                requested_at=requested_at,
                metadata_json=metadata_json,
            )
            return result

        try:
            result = self.provider.send_sms(to, message, message_type=message_type)
        except ValueError as exc:
            logger.warning("sms_send_failed provider=taqnyat error_code=SMS_INVALID_INPUT reason=%s", str(exc))
            result = {
                "ok": False,
                "status_code": 400,
                "data": {
                    "error": str(exc),
                    "error_code": "SMS_INVALID_INPUT",
                },
            }
            persist_sms_evidence(
                to=to,
                message=message,
                result=result,
                provider="taqnyat",
                event_type=event_type,
                case_id=case_id,
                document_id=document_id,
                recipient_role=recipient_role,
                message_template_key=message_template_key,
                message_template_version=message_template_version,
                requested_at=requested_at,
                metadata_json=metadata_json,
            )
            return result
        except Exception as exc:
            logger.error("sms_send_failed provider=taqnyat error_code=SMS_PROVIDER_EXCEPTION reason=%s", str(exc))
            result = {
                "ok": False,
                "status_code": 503,
                "data": {
                    "error": "SMS provider request failed",
                    "error_code": "SMS_PROVIDER_EXCEPTION",
                },
            }
            persist_sms_evidence(
                to=to,
                message=message,
                result=result,
                provider="taqnyat",
                event_type=event_type,
                case_id=case_id,
                document_id=document_id,
                recipient_role=recipient_role,
                message_template_key=message_template_key,
                message_template_version=message_template_version,
                requested_at=requested_at,
                metadata_json=metadata_json,
            )
            return result

        if result.get("ok"):
            logger.info("sms_send_succeeded provider=taqnyat status_code=%s", result.get("status_code"))
        else:
            logger.warning(
                "sms_send_failed provider=taqnyat status_code=%s error=%s",
                result.get("status_code"),
                (result.get("data") or {}).get("error") if isinstance(result.get("data"), dict) else result.get("data"),
            )

        persist_sms_evidence(
            to=to,
            message=message,
            result=result,
            provider="taqnyat",
            event_type=event_type,
            case_id=case_id,
            document_id=document_id,
            recipient_role=recipient_role,
            message_template_key=message_template_key,
            message_template_version=message_template_version,
            requested_at=requested_at,
            metadata_json=metadata_json,
        )
        return result

    def get_system_status(self) -> dict:
        return self.provider.get_system_status()

    def get_account_balance(self) -> dict:
        return self.provider.get_account_balance()

    def get_sender_names(self) -> dict:
        return self.provider.get_sender_names()
