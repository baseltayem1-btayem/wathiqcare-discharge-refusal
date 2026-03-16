from datetime import datetime
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, JSON, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB

from backend.core.database import Base


class SystemSetting(Base):
    __tablename__ = "system_settings"
    __table_args__ = (
        UniqueConstraint("tenant_id", "setting_key", name="uq_system_settings_tenant_key"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True, index=True)
    setting_scope = Column(String, nullable=False, default="system", index=True)
    setting_key = Column(String, nullable=False, index=True)
    value_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
