
#
from __future__ import annotations


from datetime import date, datetime
import uuid
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    JSON,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from backend.core.database import Base
# LegalEvent model for legal orchestration event system
class LegalEvent(Base):
    __tablename__ = "legal_events"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, nullable=False)
    case_id = Column(String, nullable=False)
    legal_state = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    payload = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Real SQLAlchemy model for SignerIdentity
class SignerIdentity(Base):
    __tablename__ = "signer_identities"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    arabic_full_name = Column(String, nullable=True)
    nationality = Column(String, nullable=True)
    legal_capacity_indicator = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Real SQLAlchemy model for SignatureArtifact
class SignatureArtifact(Base):
    __tablename__ = "signature_artifacts"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, nullable=False)
    source_mode = Column(String, nullable=True)
    document_version = Column(String, nullable=True)
    signature_payload = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

from datetime import date, datetime
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    JSON,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from backend.core.database import Base


class DischargeEncounter(Base):
    __tablename__ = "encounters"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    external_encounter_id = Column(String, nullable=True, unique=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    mrn = Column(String, nullable=True)
    discharge_order_issued_at = Column(DateTime, nullable=True)
    status = Column(String, nullable=False, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient")


class DischargeSession(Base):
    __tablename__ = "discharge_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    encounter_id = Column(String, ForeignKey("encounters.id"), nullable=False)
    token_hash = Column(String, nullable=False, unique=True)
    token_expires_at = Column(DateTime, nullable=False)
    access_status = Column(String, nullable=False, default="pending")
    workflow_status = Column(String, nullable=False, default="session_created")
    routing_flags = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    initiated_by_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    source_system = Column(String, nullable=False, default="internal")
    opened_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    one_time_access = Column(Boolean, nullable=False, default=False)
    otp_enabled = Column(Boolean, nullable=False, default=False)
    verified_at = Column(DateTime, nullable=True)
    payment_required = Column(Boolean, nullable=False, default=False)
    payment_amount = Column(Float, nullable=False, default=0.0)
    payment_currency = Column(String, nullable=False, default="SAR")
    workflow_sequence = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list)
    public_metadata = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient")
    encounter = relationship("DischargeEncounter")
    documents = relationship("DischargeDocument", back_populates="session", cascade="all, delete-orphan")
    signatures = relationship("DischargeSignature", back_populates="session", cascade="all, delete-orphan")
    audit_logs = relationship("DischargeSessionAuditLog", back_populates="session", cascade="all, delete-orphan")
    notifications = relationship("DischargeNotification", back_populates="session", cascade="all, delete-orphan")
    payments = relationship("DischargePayment", back_populates="session", cascade="all, delete-orphan")
    equipment_items = relationship("DischargeEquipmentItem", back_populates="session", cascade="all, delete-orphan")
    home_care_plans = relationship("DischargeHomeCarePlan", back_populates="session", cascade="all, delete-orphan")
    refusal_liabilities = relationship("DischargeRefusalLiability", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_discharge_sessions_patient_id", "patient_id"),
        Index("idx_discharge_sessions_encounter_id", "encounter_id"),
        Index("idx_discharge_sessions_token_hash", "token_hash"),
        Index("idx_discharge_sessions_workflow_status", "workflow_status"),
    )


class DischargeDocument(Base):
    __tablename__ = "discharge_documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("discharge_sessions.id"), nullable=True)
    document_type = Column(String, nullable=False)
    document_version = Column(String, nullable=False, default="1.0.0")
    language = Column(String, nullable=False, default="ar")
    content_snapshot = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    rendered_html = Column(Text, nullable=True)
    pdf_url = Column(String, nullable=True)
    pdf_hash_sha256 = Column(String, nullable=True)
    status = Column(String, nullable=False, default="draft")
    signed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    session = relationship("DischargeSession", back_populates="documents")

    __table_args__ = (Index("idx_discharge_documents_session_id", "session_id"),)


class DischargeSignature(Base):
    __tablename__ = "signatures"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("discharge_sessions.id"), nullable=False)
    document_id = Column(String, ForeignKey("discharge_documents.id"), nullable=True)
    signer_name = Column(String, nullable=False)
    signer_role = Column(String, nullable=False)
    signature_storage_url = Column(String, nullable=True)
    signature_hash = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    device_fingerprint = Column(String, nullable=True)
    signed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DischargeSession", back_populates="signatures")

    __table_args__ = (Index("idx_signatures_session_id", "session_id"),)


class DischargeSessionAuditLog(Base):
    __tablename__ = "discharge_session_audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("discharge_sessions.id"), nullable=False)
    event_type = Column(String, nullable=False)
    event_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    actor_type = Column(String, nullable=False, default="system")
    actor_id = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    event_metadata = Column("metadata", JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DischargeSession", back_populates="audit_logs")

    __table_args__ = (
        Index("idx_discharge_session_audit_logs_session_id", "session_id"),
        Index("idx_discharge_session_audit_logs_event_type", "event_type"),
    )


class DischargeNotification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("discharge_sessions.id"), nullable=False)
    channel = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    recipient = Column(String, nullable=False)
    template_key = Column(String, nullable=False)
    message_body = Column(Text, nullable=False)
    provider_message_id = Column(String, nullable=True)
    delivery_status = Column(String, nullable=False, default="queued")
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    failure_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DischargeSession", back_populates="notifications")

    __table_args__ = (
        Index("idx_notifications_session_id", "session_id"),
        Index("idx_notifications_delivery_status", "delivery_status"),
    )


class DischargePayment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("discharge_sessions.id"), nullable=False)
    payment_purpose = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, nullable=False, default="SAR")
    status = Column(String, nullable=False, default="pending")
    provider_reference = Column(String, nullable=True)
    checkout_url = Column(String, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    payment_metadata = Column("metadata", JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    session = relationship("DischargeSession", back_populates="payments")

    __table_args__ = (Index("idx_payments_session_id", "session_id"),)


class DischargeEquipmentItem(Base):
    __tablename__ = "equipment_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("discharge_sessions.id"), nullable=False)
    item_name = Column(String, nullable=False)
    item_code = Column(String, nullable=True)
    quantity = Column(Float, nullable=False, default=1.0)
    training_required = Column(Boolean, nullable=False, default=False)
    return_required = Column(Boolean, nullable=False, default=False)
    deposit_required = Column(Boolean, nullable=False, default=False)
    deposit_amount = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DischargeSession", back_populates="equipment_items")

    __table_args__ = (Index("idx_equipment_items_session_id", "session_id"),)


class DischargeHomeCarePlan(Base):
    __tablename__ = "home_care_plans"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("discharge_sessions.id"), nullable=False)
    provider_name = Column(String, nullable=False)
    service_summary = Column(Text, nullable=False)
    start_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DischargeSession", back_populates="home_care_plans")

    __table_args__ = (Index("idx_home_care_plans_session_id", "session_id"),)


class DischargeRefusalLiability(Base):
    __tablename__ = "refusal_liabilities"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("discharge_sessions.id"), nullable=False)
    estimated_cost = Column(Float, nullable=True)
    liability_terms = Column(Text, nullable=False)
    requires_payment = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DischargeSession", back_populates="refusal_liabilities")

    __table_args__ = (Index("idx_refusal_liabilities_session_id", "session_id"),)


class DischargeLegalTemplate(Base):
    __tablename__ = "discharge_legal_templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    template_key = Column(String, nullable=False)
    title = Column(String, nullable=False)
    language = Column(String, nullable=False, default="ar")
    version = Column(String, nullable=False, default="1.0.0")
    body = Column(Text, nullable=False)
    is_published = Column(Boolean, nullable=False, default=True)
    status = Column(String, nullable=False, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PatientNoticePresentation(Base):
    __tablename__ = "patient_notice_presentations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, nullable=False)
    presented_to_type = Column(String, nullable=True)
    presented_to_name = Column(String, nullable=True)
    presented_to_id_type = Column(String, nullable=True)
    presented_to_id_number = Column(String, nullable=True)
    acknowledged_view = Column(Boolean, nullable=True)
    witness_name = Column(String, nullable=True)
    document_type = Column(String, nullable=True)
    viewed_duration_seconds = Column(String, nullable=True)
    interpreter_used = Column(Boolean, nullable=True)
    mode = Column(String, nullable=True)
    language = Column(String, nullable=True)
    notice_method = Column(String, nullable=True)
    identity_verified = Column(Boolean, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Keep __all__ for explicit export
__all__ = [
    "PatientNoticePresentation",
]
