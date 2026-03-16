from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, JSON, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB

from backend.core.database import Base


class IntegrationConfig(Base):
    __tablename__ = "integration_configs"
    __table_args__ = (
        UniqueConstraint("tenant_id", "integration_key", name="uq_integration_configs_tenant_key"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    integration_key = Column(String, nullable=False, index=True)
    integration_type = Column(String, nullable=False, index=True)
    provider_name = Column(String, nullable=True)
    endpoint_url = Column(String, nullable=False)
    auth_type = Column(String, nullable=False, default="none")
    secret_reference = Column(String, nullable=True)
    status = Column(String, nullable=False, default="disabled", index=True)
    retry_policy_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    timeout_seconds = Column(Integer, nullable=False, default=30)
    headers_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
