from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from backend.core.database import Base


class IntegrationRun(Base):
    __tablename__ = "integration_runs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    connector_id = Column(String, ForeignKey("integration_connectors.id"), nullable=False, index=True)
    connector_key = Column(String, nullable=False, index=True)
    connector_name = Column(String, nullable=False)

    run_type = Column(String, nullable=False, default="scheduled")
    status = Column(String, nullable=False, default="queued", index=True)

    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    records_processed = Column(Integer, nullable=False, default=0)
    records_created = Column(Integer, nullable=False, default=0)
    records_updated = Column(Integer, nullable=False, default=0)
    records_failed = Column(Integer, nullable=False, default=0)

    error_summary = Column(Text, nullable=True)
    triggered_by = Column(String, nullable=True)
    details_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    connector = relationship("IntegrationConnector", back_populates="runs")
    items = relationship(
        "IntegrationRunItem",
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="IntegrationRunItem.processed_at.desc()",
    )
    errors = relationship(
        "IntegrationError",
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="IntegrationError.occurred_at.desc()",
    )


class IntegrationRunItem(Base):
    __tablename__ = "integration_run_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String, ForeignKey("integration_runs.id"), nullable=False, index=True)
    connector_key = Column(String, nullable=False, index=True)

    resource_type = Column(String, nullable=False)
    external_id = Column(String, nullable=True)
    status = Column(String, nullable=False, default="success")
    message = Column(Text, nullable=True)
    payload_json = Column(JSON, nullable=True)
    processed_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    run = relationship("IntegrationRun", back_populates="items")


class IntegrationError(Base):
    __tablename__ = "integration_errors"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    connector_id = Column(String, ForeignKey("integration_connectors.id"), nullable=False, index=True)
    run_id = Column(String, ForeignKey("integration_runs.id"), nullable=True, index=True)
    connector_key = Column(String, nullable=False, index=True)
    connector_name = Column(String, nullable=False)

    severity = Column(String, nullable=False, default="error")
    code = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    details = Column(Text, nullable=True)
    occurred_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)

    connector = relationship("IntegrationConnector", back_populates="errors")
    run = relationship("IntegrationRun", back_populates="errors")
