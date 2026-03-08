from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from backend.core.database import Base


class DischargeWorkflowDocument(Base):
    __tablename__ = "discharge_workflow_documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_id = Column(String, ForeignKey("discharge_refusal_workflows.id"), nullable=False)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    generated_by = Column(String, ForeignKey("users.id"), nullable=False)

    template_key = Column(String, nullable=False)
    document_code = Column(String, nullable=True)
    title = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    html_content = Column(Text, nullable=False)

    generated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    workflow = relationship("DischargeRefusalWorkflow", back_populates="documents")
    case = relationship("DischargeCase", back_populates="workflow_documents")
