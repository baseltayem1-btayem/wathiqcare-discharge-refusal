# Minimal stub for IntegrationConnector to resolve import errors in tests
from sqlalchemy import Column, String, DateTime, Integer, Boolean
from backend.core.database import Base

class IntegrationConnector(Base):
    __tablename__ = "integration_connectors"
    id = Column(Integer, primary_key=True, autoincrement=True)
    connector_key = Column(String, unique=True)
    connector_name = Column(String)
    enabled = Column(Boolean)
    connection_url = Column(String)
    auth_type = Column(String)
    sync_interval_minutes = Column(Integer)
    timeout_seconds = Column(Integer)
    retry_count = Column(Integer)
    retry_backoff_seconds = Column(Integer)
    last_success_at = Column(DateTime)
    created_at = Column(DateTime)
