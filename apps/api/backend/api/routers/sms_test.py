from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.api.deps import require_roles
from backend.services.notifications.sms_service import SmsService

router = APIRouter(prefix="/api/sms", tags=["sms"])


class SmsTestRequest(BaseModel):
    to: str
    message: str = "WathiqCare SMS test"


def _raise_if_failed(result: dict, operation: str) -> None:
    if result.get("ok"):
        return

    status_code = int(result.get("status_code") or 502)
    if status_code < 400:
        status_code = 502

    raise HTTPException(
        status_code=status_code,
        detail={
            "operation": operation,
            "provider": "taqnyat",
            "result": result,
        },
    )


@router.post("/test")
def test_sms(
    req: SmsTestRequest,
    _: dict = Depends(require_roles("platform_superadmin", "platform_admin")),
):
    """Send a test SMS message. Requires SMS_ENABLED=true and valid credentials."""
    service = SmsService()
    result = service.send(req.to, req.message)

    _raise_if_failed(result, "send_sms")

    return result


@router.get("/status")
def get_sms_status(
    _: dict = Depends(require_roles("platform_superadmin", "platform_admin")),
):
    """Get Taqnyat system status (/system/status)."""
    service = SmsService()
    result = service.get_system_status()

    _raise_if_failed(result, "system_status")

    return result


@router.get("/balance")
def get_sms_balance(
    _: dict = Depends(require_roles("platform_superadmin", "platform_admin")),
):
    """Get Taqnyat account balance (/account/balance)."""
    service = SmsService()
    result = service.get_account_balance()

    _raise_if_failed(result, "account_balance")

    return result


@router.get("/senders")
def get_sms_senders(
    _: dict = Depends(require_roles("platform_superadmin", "platform_admin")),
):
    """Get Taqnyat approved sender names (/v1/messages/senders)."""
    service = SmsService()
    result = service.get_sender_names()

    _raise_if_failed(result, "sender_names")

    return result
