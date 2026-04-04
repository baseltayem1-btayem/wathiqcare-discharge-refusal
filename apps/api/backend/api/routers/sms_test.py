from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.api.deps import require_roles
from backend.services.notifications.sms_service import SmsService

router = APIRouter(prefix="/api/sms", tags=["sms"])


class SmsTestRequest(BaseModel):
    to: str
    message: str = "WathiqCare SMS test"


@router.post("/test")
def test_sms(
    req: SmsTestRequest,
    _: dict = Depends(require_roles("platform_superadmin", "platform_admin")),
):
    """Send a test SMS message. Requires SMS_ENABLED=true and valid credentials."""
    service = SmsService()
    result = service.send(req.to, req.message)

    if not result.get("ok"):
        raise HTTPException(status_code=500, detail=result)

    return result
