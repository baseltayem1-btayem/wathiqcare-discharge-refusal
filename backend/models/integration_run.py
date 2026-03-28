# Minimal stub for IntegrationRun and IntegrationError to resolve import errors in tests
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from backend.core.database import Base

class IntegrationRun(Base):
    __tablename__ = "integration_runs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    connector_id = Column(Integer, ForeignKey('integration_connectors.id'))
    connector_key = Column(String)
    connector_name = Column(String)
    run_type = Column(String)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    status = Column(String)

class IntegrationRunItem(Base):
    __tablename__ = "integration_run_items"
    id = Column(String, primary_key=True)


# IntegrationError must be a SQLAlchemy model for test table creation
class IntegrationError(Base):
    __tablename__ = "integration_errors"
    id = Column(String, primary_key=True)
    # Add minimal fields as needed for test compatibility
