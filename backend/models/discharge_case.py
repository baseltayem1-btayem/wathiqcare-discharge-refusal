from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from backend.core.database import Base

class DischargeCase(Base):
    __tablename__ = "discharge_cases"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)

    case_number = Column(String, nullable=True, unique=True)
    patient_name = Column(String, nullable=True)
    mrn = Column(String, nullable=True)
    room_number = Column(String, nullable=True)
    department = Column(String, nullable=True)
    attending_physician_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    attending_physician_name = Column(String, nullable=True)
    current_stage_code = Column(String, nullable=True, default="draft")
    discharge_decision_date = Column(DateTime, nullable=True)
    discharge_plan_summary = Column(Text, nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    refused_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    status = Column(String, default="pending")
    refusal_reason = Column(Text)

    signer_name = Column(String, nullable=True)
    signer_role = Column(String, nullable=True)
    signature_text = Column(Text, nullable=True)
    signed_at = Column(DateTime, nullable=True)

    pdf_file = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Discharge Refusal MVP fields
    type = Column(String, default="discharge_refusal")
    status = Column(String, default="draft")
    escalation_due_2h = Column(DateTime, nullable=True)
    escalation_due_6h = Column(DateTime, nullable=True)
    escalation_due_24h = Column(DateTime, nullable=True)
    escalated_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    patient = relationship("Patient")
    user = relationship("User", foreign_keys=[created_by])
    attending_physician = relationship("User", foreign_keys=[attending_physician_user_id])
    tenant = relationship("Tenant")
    workflow = relationship(
        "DischargeRefusalWorkflow",
        back_populates="case",
        uselist=False,
        cascade="all, delete-orphan",
    )
    workflow_documents = relationship(
        "DischargeWorkflowDocument",
        back_populates="case",
        cascade="all, delete-orphan",
        order_by="DischargeWorkflowDocument.generated_at.desc()",
    )
    workflow_case_documentation = relationship(
        "DischargeWorkflowCaseDocumentation",
        back_populates="case",
        uselist=False,
        cascade="all, delete-orphan",
    )
    workflow_tasks = relationship(
        "WorkflowTask",
        primaryjoin="DischargeCase.id == WorkflowTask.case_id",
        cascade="all, delete-orphan",
    )
    workflow_notifications = relationship(
        "WorkflowNotification",
        primaryjoin="DischargeCase.id == WorkflowNotification.case_id",
        cascade="all, delete-orphan",
    )
    discharge_execution_items = relationship(
        "DischargeExecutionItem",
        primaryjoin="DischargeCase.id == DischargeExecutionItem.case_id",
        cascade="all, delete-orphan",
    )
    workflow_audit_logs = relationship(
        "WorkflowAuditLog",
        primaryjoin="DischargeCase.id == WorkflowAuditLog.case_id",
        cascade="all, delete-orphan",
    )
