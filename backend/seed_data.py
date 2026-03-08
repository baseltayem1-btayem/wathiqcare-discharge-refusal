from backend.core.database import SessionLocal
from backend.models.tenant import Tenant
from backend.models.user import User
from backend.core.security import get_password_hash
import uuid

db = SessionLocal()


def ensure_tenant(code: str, name: str, domain: str) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.code == code).first()
    if tenant:
        return tenant

    tenant = Tenant(
        id=str(uuid.uuid4()),
        name=name,
        code=code,
        domain=domain,
        is_active=True,
    )
    db.add(tenant)
    db.flush()
    print(f"Tenant created: {code}")
    return tenant


def upsert_user(
    *,
    tenant_id: str,
    email: str,
    full_name: str,
    role: str,
    password: str,
) -> None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            email=email,
            full_name=full_name,
            role=role,
            is_active=True,
            hashed_password=get_password_hash(password),
        )
        db.add(user)
        print(f"User created: {email}")
        return

    user.tenant_id = tenant_id
    user.full_name = full_name
    user.role = role
    user.is_active = True
    user.hashed_password = get_password_hash(password)
    print(f"User updated: {email}")

try:
    imc_tenant = ensure_tenant(
        code="imc",
        name="International Medical Center",
        domain="imc.wathiqcare.local",
    )
    upsert_user(
        tenant_id=imc_tenant.id,
        email="admin@imc.local",
        full_name="IMC Admin",
        role="tenant_admin",
        password="Admin@123",
    )

    wathiqcare_tenant = ensure_tenant(
        code="wathiqcare",
        name="WathiqCare",
        domain="wathiqcare.online",
    )
    upsert_user(
        tenant_id=wathiqcare_tenant.id,
        email="admin@wathiqcare.online",
        full_name="WathiqCare Admin",
        role="tenant_admin",
        password="ChangeMe123!",
    )

    db.commit()
    print("Seed data inserted successfully")

finally:
    db.close()
