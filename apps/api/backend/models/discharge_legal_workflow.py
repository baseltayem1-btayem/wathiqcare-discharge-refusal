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

    __table_args__ = (
        Index("idx_discharge_legal_templates_key", "template_key"),
        Index("idx_discharge_legal_templates_published", "is_published"),
    )


class DischargeDecisionEvent(Base):
    __tablename__ = "discharge_decision_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    mrn = Column(String, nullable=True)
    encounter_number = Column(String, nullable=True)
    admission_number = Column(String, nullable=True)
    discharge_order_number = Column(String, nullable=True)
    physician_id = Column(String, ForeignKey("users.id"), nullable=True)
    physician_name = Column(String, nullable=True)
    department_unit = Column(String, nullable=True)
    diagnosis_summary = Column(Text, nullable=True)
    clinical_summary_source_ref = Column(String, nullable=True)
    decision_timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    source_system = Column(String, nullable=False, default="manual")
    sync_mode = Column(String, nullable=False, default="manual")
    legal_state = Column(String, nullable=False, default="DRAFT")
    notification_state = Column(String, nullable=False, default="NOT_GENERATED")
    patient_response_state = Column(String, nullable=False, default="PENDING")
    signature_state = Column(String, nullable=False, default="PENDING")
    escalation_state = Column(String, nullable=False, default="NONE")
    final_package_state = Column(String, nullable=False, default="PENDING")
    status = Column(String, nullable=False, default="active")
    version = Column(String, nullable=False, default="1")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    state_history = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list)
    metadata_json = Column("metadata", JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_discharge_decision_events_tenant_case", "tenant_id", "case_id"),
        Index("idx_discharge_decision_events_legal_state", "legal_state"),
    )


class DischargeDecisionDocument(Base):
    __tablename__ = "discharge_decision_documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    event_id = Column(String, ForeignKey("discharge_decision_events.id"), nullable=False)
    language = Column(String, nullable=False, default="ar")
    document_version = Column(String, nullable=False, default="1.0.0")
    hospital_header_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    patient_section_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    medical_section_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    legal_statement_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    notification_section_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    response_section_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    signature_section_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    legal_footer_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    rendered_html = Column(Text, nullable=True)
    pdf_url = Column(String, nullable=True)
    verification_code = Column(String, nullable=True)
    document_hash = Column(String, nullable=True)
    status = Column(String, nullable=False, default="draft")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_discharge_decision_documents_case", "tenant_id", "case_id"),
        Index("idx_discharge_decision_documents_event", "event_id"),
    )


class PatientNoticePresentation(Base):
    __tablename__ = "patient_notice_presentations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    event_id = Column(String, ForeignKey("discharge_decision_events.id"), nullable=False)
    mode = Column(String, nullable=False, default="tablet")
    language = Column(String, nullable=False, default="ar")
    notice_method = Column(String, nullable=False, default="in_person")
    presenter_name = Column(String, nullable=True)
    presenter_role = Column(String, nullable=True)
    identity_verified = Column(Boolean, nullable=False, default=False)
    interpreter_used = Column(Boolean, nullable=False, default=False)
    interpreter_name = Column(String, nullable=True)
    opened_at = Column(DateTime, nullable=True)
    first_viewed_at = Column(DateTime, nullable=True)
    viewed_duration_seconds = Column(Float, nullable=True)
    action_taken_at = Column(DateTime, nullable=True)
    device_info_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    session_reference = Column(String, nullable=True)
    # Proof-of-presentation: what document was shown and to whom
    document_type = Column(String, nullable=True)  # master_document / financial_ack / etc.
    document_instance_id = Column(String, nullable=True)
    presented_to_type = Column(String, nullable=True)  # patient / guardian / authorized_representative
    presented_to_name = Column(String, nullable=True)
    presented_to_id_type = Column(String, nullable=True)  # national_id / iqama / passport
    presented_to_id_number = Column(String, nullable=True)
    acknowledged_view = Column(Boolean, nullable=False, default=False)
    witness_name = Column(String, nullable=True)
    status = Column(String, nullable=False, default="presented")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("idx_patient_notice_presentations_case", "tenant_id", "case_id"),)


class PatientResponse(Base):
    __tablename__ = "patient_responses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    event_id = Column(String, ForeignKey("discharge_decision_events.id"), nullable=False)
    response_type = Column(String, nullable=False)
    refusal_reason = Column(String, nullable=True)
    refusal_narrative = Column(Text, nullable=True)
    inability_reason = Column(String, nullable=True)
    requires_witness = Column(Boolean, nullable=False, default=False)
    legally_sensitive = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="recorded")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("idx_patient_responses_case", "tenant_id", "case_id"),)


class SignerIdentity(Base):
    __tablename__ = "signer_identities"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    response_id = Column(String, ForeignKey("patient_responses.id"), nullable=True)
    full_name = Column(String, nullable=False)
    signer_type = Column(String, nullable=False)
    relationship_to_patient = Column(String, nullable=True)
    id_type = Column(String, nullable=True)
    id_number = Column(String, nullable=True)
    mobile_number = Column(String, nullable=True)
    language_used = Column(String, nullable=True)
    witness_required = Column(Boolean, nullable=False, default=False)
    staff_present_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    # Extended identity fields for legal-binding strength
    arabic_full_name = Column(String, nullable=True)  # Full name in Arabic script
    nationality = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    legal_capacity_indicator = Column(String, nullable=True)  # competent / minor / guardian_required / incompetent
    consent_confirmation_text_version = Column(String, nullable=True)  # version of consent text acknowledged
    status = Column(String, nullable=False, default="active")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("idx_signer_identities_case", "tenant_id", "case_id"),)


class SignatureArtifact(Base):
    __tablename__ = "signature_artifacts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    signer_identity_id = Column(String, ForeignKey("signer_identities.id"), nullable=False)
    document_ref = Column(String, nullable=True)
    signature_payload = Column(Text, nullable=False)
    signature_hash = Column(String, nullable=False)
    signed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    # Signature binding metadata
    document_version = Column(String, nullable=False, default="1.0.0")
    source_mode = Column(String, nullable=False, default="tablet")  # tablet / paper_scan / remote / witnessed_verbal
    witness_id = Column(String, ForeignKey("signer_identities.id"), nullable=True)
    status = Column(String, nullable=False, default="captured")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index("idx_signature_artifacts_case", "tenant_id", "case_id"),)


class HomeHealthcareAgreementTemplate(Base):
    __tablename__ = "home_healthcare_agreement_templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False)
    language = Column(String, nullable=False, default="ar")
    fixed_clauses_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list)
    options_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    status = Column(String, nullable=False, default="active")
    version = Column(String, nullable=False, default="1")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class HomeHealthcareAgreementInstance(Base):
    __tablename__ = "home_healthcare_agreement_instances"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    template_id = Column(String, ForeignKey("home_healthcare_agreement_templates.id"), nullable=True)
    agreement_payload_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    rendered_html = Column(Text, nullable=True)
    pdf_url = Column(String, nullable=True)
    status = Column(String, nullable=False, default="draft")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("idx_home_healthcare_agreement_instances_case", "tenant_id", "case_id"),)


class MedicalEquipmentLeaseTemplate(Base):
    __tablename__ = "medical_equipment_lease_templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False)
    language = Column(String, nullable=False, default="ar")
    fixed_clauses_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list)
    options_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    status = Column(String, nullable=False, default="active")
    version = Column(String, nullable=False, default="1")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MedicalEquipmentLeaseInstance(Base):
    __tablename__ = "medical_equipment_lease_instances"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    template_id = Column(String, ForeignKey("medical_equipment_lease_templates.id"), nullable=True)
    lease_payload_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    rendered_html = Column(Text, nullable=True)
    pdf_url = Column(String, nullable=True)
    status = Column(String, nullable=False, default="draft")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("idx_medical_equipment_lease_instances_case", "tenant_id", "case_id"),)


class FinancialLiabilityAcknowledgmentTemplate(Base):
    __tablename__ = "financial_liability_acknowledgment_templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False)
    language = Column(String, nullable=False, default="ar")
    fixed_clauses_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list)
    options_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    status = Column(String, nullable=False, default="active")
    version = Column(String, nullable=False, default="1")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FinancialLiabilityAcknowledgmentInstance(Base):
    __tablename__ = "financial_liability_acknowledgment_instances"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    event_id = Column(String, ForeignKey("discharge_decision_events.id"), nullable=True)
    template_id = Column(String, ForeignKey("financial_liability_acknowledgment_templates.id"), nullable=True)
    acknowledgment_payload_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    rendered_html = Column(Text, nullable=True)
    pdf_url = Column(String, nullable=True)
    status = Column(String, nullable=False, default="draft")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("idx_financial_liability_ack_instances_case", "tenant_id", "case_id"),)


class PromissoryNoteTemplate(Base):
    __tablename__ = "promissory_note_templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False)
    language = Column(String, nullable=False, default="ar")
    fixed_clauses_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list)
    options_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    status = Column(String, nullable=False, default="active")
    version = Column(String, nullable=False, default="1")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PromissoryNoteInstance(Base):
    __tablename__ = "promissory_note_instances"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    template_id = Column(String, ForeignKey("promissory_note_templates.id"), nullable=True)
    linked_financial_ack_id = Column(String, ForeignKey("financial_liability_acknowledgment_instances.id"), nullable=True)
    amount_numeric = Column(Float, nullable=False)
    amount_text_ar = Column(Text, nullable=False)
    promissory_payload_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    rendered_html = Column(Text, nullable=True)
    pdf_url = Column(String, nullable=True)
    verification_code = Column(String, nullable=True)
    document_hash = Column(String, nullable=True)
    status = Column(String, nullable=False, default="draft")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("idx_promissory_note_instances_case", "tenant_id", "case_id"),)


class LegalUndertakingTemplate(Base):
    __tablename__ = "legal_undertaking_templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False)
    language = Column(String, nullable=False, default="ar")
    fixed_clauses_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list)
    status = Column(String, nullable=False, default="active")
    version = Column(String, nullable=False, default="1")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LegalUndertakingInstance(Base):
    __tablename__ = "legal_undertaking_instances"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    template_id = Column(String, ForeignKey("legal_undertaking_templates.id"), nullable=True)
    undertaking_payload_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    rendered_html = Column(Text, nullable=True)
    pdf_url = Column(String, nullable=True)
    status = Column(String, nullable=False, default="draft")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("idx_legal_undertaking_instances_case", "tenant_id", "case_id"),)


class EvidencePackage(Base):
    __tablename__ = "evidence_packages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    package_reference = Column(String, nullable=False, unique=True)
    generated_by = Column(String, ForeignKey("users.id"), nullable=True)
    generated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    bundle_url = Column(String, nullable=True)
    package_index_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    verification_metadata_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    status = Column(String, nullable=False, default="generated")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("idx_evidence_packages_case", "tenant_id", "case_id"),)


class EscalationEvent(Base):
    __tablename__ = "escalation_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    event_id = Column(String, ForeignKey("discharge_decision_events.id"), nullable=True)
    escalation_level = Column(String, nullable=False)
    due_at = Column(DateTime, nullable=True)
    escalated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    target_role = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="open")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("idx_escalation_events_case", "tenant_id", "case_id"),)
