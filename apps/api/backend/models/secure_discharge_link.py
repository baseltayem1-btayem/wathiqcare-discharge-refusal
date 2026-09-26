from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from datetime import datetime
import uuid
from backend.core.database import Base


class SecureDischargeLink(Base):
    """
    A single-use tokenised URL delivered by email (and later SMS) that gives a
    family member or patient-representative read-only access to a discharge
    refusal form without requiring a WathiqCare account.

    Security contract
    -----------------
    * ``token_hash`` stores HMAC-SHA256(raw_token, PUBLIC_LINK_TOKEN_PEPPER).
      The raw token lives only in the URL; it is NEVER persisted.
    * ``accessed_at`` is set on the first successful validation.  Subsequent
      access attempts are still allowed until ``expires_at`` or ``revoked_at``.
    * ``revoked_at`` hard-blocks the link without deleting the audit trail.
    """

    __tablename__ = "secure_discharge_links"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)

    recipient_email = Column(String, nullable=False)
    token_hash = Column(String, nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)

    # delivery channel + status
    sent_via = Column(String, nullable=False, default="email")  # 'email' | 'sms'
    delivery_status = Column(String, nullable=False, default="pending")
    # pending | sent | failed | not_configured

    # lifecycle timestamps
    accessed_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)

    # public decision capture
    decision_type = Column(String, nullable=True)
    decision_name = Column(String, nullable=True)
    decision_submitted_at = Column(DateTime, nullable=True)
    decision_ip_address = Column(String, nullable=True)
    decision_user_agent = Column(Text, nullable=True)
    refusal_acknowledged_at = Column(DateTime, nullable=True)

    # identity verification (OTP) for public secure-link decisions
    otp_hash = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    otp_attempts = Column(String, nullable=True)  # stored as integer string
    otp_locked_until = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
