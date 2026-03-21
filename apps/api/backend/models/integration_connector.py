from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from backend.core.database import Base


class IntegrationConnector(Base):
    __tablename__ = "integration_connectors"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    connector_key = Column(String, nullable=False, unique=True, index=True)
    connector_name = Column(String, nullable=False, unique=True)

    connection_url = Column(String, nullable=True)
    auth_type = Column(String, nullable=False, default="none")
    auth_username = Column(String, nullable=True)
    auth_password = Column(String, nullable=True)
    auth_token = Column(String, nullable=True)
    api_key = Column(String, nullable=True)

    enabled = Column(Boolean, nullable=False, default=False)
    sync_interval_minutes = Column(Integer, nullable=False, default=15)
    timeout_seconds = Column(Integer, nullable=False, default=20)
    retry_count = Column(Integer, nullable=False, default=1)
    retry_backoff_seconds = Column(Integer, nullable=False, default=2)

    resource_set_json = Column(JSON, nullable=True)
    metadata_json = Column(JSON, nullable=True)

    last_health_status = Column(String, nullable=True)
    last_health_checked_at = Column(DateTime, nullable=True)
    last_success_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    runs = relationship(
        "IntegrationRun",
        back_populates="connector",
        cascade="all, delete-orphan",
        order_by="IntegrationRun.started_at.desc()",
    )
    errors = relationship(
        "IntegrationError",
        back_populates="connector",
        cascade="all, delete-orphan",
        order_by="IntegrationError.occurred_at.desc()",
    )
