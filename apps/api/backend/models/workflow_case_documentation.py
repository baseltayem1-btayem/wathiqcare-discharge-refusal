from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from backend.core.database import Base


class DischargeWorkflowCaseDocumentation(Base):
    __tablename__ = "discharge_workflow_case_documentation"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_id = Column(String, ForeignKey("discharge_refusal_workflows.id"), nullable=False, unique=True)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)

    decision_recorded_at = Column(DateTime, nullable=True)
    discussion_summary = Column(Text, nullable=True)
    refusal_reasons = Column(Text, nullable=True)
    forms_issued = Column(Text, nullable=True)
    social_administrative_interventions = Column(Text, nullable=True)

    last_validated_at = Column(DateTime, nullable=True)
    last_validation_status = Column(String, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    workflow = relationship("DischargeRefusalWorkflow", back_populates="case_documentation")
    case = relationship("DischargeCase", back_populates="workflow_case_documentation")
