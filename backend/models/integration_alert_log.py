from sqlalchemy import Column, String, DateTime
from backend.core.database import Base


class IntegrationAlertLog(Base):
    __tablename__ = "integration_alert_logs"

    id = Column(String, primary_key=True)
    created_at = Column(DateTime)
    alert_type = Column(String, nullable=True)
    alert_key = Column(String, nullable=True)
    connector_key = Column(String, nullable=True)