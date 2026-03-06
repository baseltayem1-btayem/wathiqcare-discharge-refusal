from backend.core.database import SessionLocal
from backend.models.tenant import Tenant
from backend.models.user import User
from backend.core.security import get_password_hash
import uuid

db = SessionLocal()

try:
    tenant = db.query(Tenant).filter(Tenant.code == "imc").first()
    if not tenant:
        tenant = Tenant(
            id=str(uuid.uuid4()),
            name="International Medical Center",
            code="imc",
            domain="imc.wathiqcare.local",
            is_active=True,
        )
        db.add(tenant)
        db.flush()
        print("Tenant created")

    user = db.query(User).filter(User.email == "admin@imc.local").first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            tenant_id=tenant.id,
            email="admin@imc.local",
            full_name="IMC Admin",
            role="tenant_admin",
            is_active=True,
            hashed_password=get_password_hash("Admin@123"),
        )
        db.add(user)
        print("User created")
    else:
        user.hashed_password = get_password_hash("Admin@123")
        user.role = "tenant_admin"
        user.is_active = True
        print("User updated")

    db.commit()
    print("Seed data inserted successfully")

finally:
    db.close()
