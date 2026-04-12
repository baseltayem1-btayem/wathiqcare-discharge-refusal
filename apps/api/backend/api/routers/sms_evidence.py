from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.api.deps import require_roles
from backend.core.rbac import log_sms_evidence_access, require_case_access, require_permission
from backend.core.database import SessionLocal
from backend.models.sms_dispatch_record import SmsDispatchRecord

router = APIRouter(prefix="/api/cases", tags=["sms-evidence"])

@router.get("/{case_id}/sms-evidence")
def get_case_sms_evidence(
    case_id: str,
    current_user: dict = Depends(
        require_roles(
            "platform_superadmin",
            "platform_admin",
            "tenant_admin",
            "legal_admin",
            "compliance",
            "quality",
        )
    ),
):
    require_permission(current_user, "sms.evidence.read")
    require_case_access(current_user, case_id)

    db = SessionLocal()
    try:
        records = (
            db.query(SmsDispatchRecord)
            .filter(SmsDispatchRecord.case_id == case_id)
            .order_by(SmsDispatchRecord.requested_at.desc())
            .all()
        )

        log_sms_evidence_access(current_user, case_id)

        return {
            "case_id": case_id,
            "count": len(records),
            "records": [
                {
                    "id": row.id,
                    "caseId": row.case_id,
                    "documentId": row.document_id,
                    "recipientPhoneMasked": row.recipient_phone_masked,
                    "recipientRole": row.recipient_role,
                    "eventType": row.event_type,
                    "messageTemplateKey": row.message_template_key,
                    "messageTemplateVersion": row.message_template_version,
                    "provider": row.provider,
                    "providerMessageId": row.provider_message_id,
                    "providerStatus": row.provider_status,
                    "internalStatus": row.internal_status,
                    "contentHash": row.content_hash,
                    "requestedAt": row.requested_at.isoformat() if row.requested_at else None,
                    "sentAt": row.sent_at.isoformat() if row.sent_at else None,
                    "failedAt": row.failed_at.isoformat() if row.failed_at else None,
                    "failureReason": row.failure_reason,
                    "retryCount": row.retry_count,
                    "metadataJson": row.metadata_json,
                    "createdAt": row.created_at.isoformat() if row.created_at else None,
                    "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
                }
                for row in records
            ],
        }
    finally:
        db.close()
