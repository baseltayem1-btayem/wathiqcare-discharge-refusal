from sqlalchemy import Column, String, Date, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from backend.core.database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)

    mrn = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    date_of_birth = Column(Date, nullable=True)

    tenant = relationship("Tenant")
