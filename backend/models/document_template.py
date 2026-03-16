from datetime import datetime
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, JSON, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB

from backend.core.database import Base


class DocumentTemplate(Base):
    __tablename__ = "document_templates"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "template_key",
            "language_code",
            "version",
            name="uq_document_templates_tenant_key_lang_version",
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True, index=True)
    template_key = Column(String, nullable=False, index=True)
    language_code = Column(String, nullable=False, index=True)
    template_type = Column(String, nullable=False, index=True)
    version = Column(String, nullable=False, default="1.0", index=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    title = Column(String, nullable=False)
    document_code = Column(String, nullable=True)
    owner_department_code = Column(String, ForeignKey("departments.code"), nullable=True)
    template_body = Column(Text, nullable=True)
    renderer_hint = Column(String, nullable=True)
    metadata_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
