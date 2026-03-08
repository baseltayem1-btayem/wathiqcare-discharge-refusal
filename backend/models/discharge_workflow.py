from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from backend.core.database import Base


class DischargeRefusalWorkflow(Base):
    __tablename__ = "discharge_refusal_workflows"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False, unique=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)

    workflow_type = Column(String, nullable=False, default="discharge_refusal")
    status = Column(String, nullable=False, default="active")
    current_stage = Column(String, nullable=False, default="medical_discharge_decision")

    discharge_decision_at = Column(DateTime, nullable=True)
    refusal_started_at = Column(DateTime, nullable=True)
    initial_communication_at = Column(DateTime, nullable=True)
    support_and_intervention_at = Column(DateTime, nullable=True)
    social_services_referred_at = Column(DateTime, nullable=True)
    refusal_form_generated_at = Column(DateTime, nullable=True)
    financial_notice_generated_at = Column(DateTime, nullable=True)
    escalation_due_at = Column(DateTime, nullable=True)
    escalated_at = Column(DateTime, nullable=True)

    patient_name = Column(String, nullable=True)
    patient_id_number = Column(String, nullable=True)
    medical_record_number = Column(String, nullable=True)
    room_number = Column(String, nullable=True)
    attending_physician = Column(String, nullable=True)
    refusal_reason = Column(Text, nullable=True)
    discussion_summary = Column(Text, nullable=True)
    insurance_coverage_status = Column(String, nullable=True)

    responsible_department = Column(String, nullable=True)
    responsible_person = Column(String, nullable=True)
    next_action = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    case = relationship("DischargeCase", back_populates="workflow")
    documents = relationship(
        "DischargeWorkflowDocument",
        back_populates="workflow",
        cascade="all, delete-orphan",
        order_by="DischargeWorkflowDocument.generated_at.desc()",
    )
    case_documentation = relationship(
        "DischargeWorkflowCaseDocumentation",
        back_populates="workflow",
        uselist=False,
        cascade="all, delete-orphan",
    )
