from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from backend.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)

    email = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    department_code = Column(String, ForeignKey("departments.code"), nullable=True)
    is_active = Column(Boolean, default=True)
    hashed_password = Column(String, nullable=True)

    tenant = relationship("Tenant")
