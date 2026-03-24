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

    # Legal identity fields — required for court-ready document generation
    logo_url = Column(String, nullable=True)           # URL or base64 data URI
    moh_license = Column(String, nullable=True)        # Ministry of Health license number
    cr_number = Column(String, nullable=True)          # Commercial Registration number
    city = Column(String, nullable=True)
    address = Column(String, nullable=True)
    po_box = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
