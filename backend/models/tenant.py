from sqlalchemy import Column, String, Boolean
import uuid
from backend.core.database import Base

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    domain = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    moh_license = Column(String, nullable=True)
    cr_number = Column(String, nullable=True)
