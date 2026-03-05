import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.main import app
from app.models.user import User
from app.routers.auth import create_access_token, hash_password

SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def create_test_user(db, username, email, password, role):
    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="function")
def admin_user(db):
    return create_test_user(db, "admin", "admin@test.com", "adminpass", "admin")


@pytest.fixture(scope="function")
def doctor_user(db):
    return create_test_user(db, "doctor", "doctor@test.com", "doctorpass", "doctor")


@pytest.fixture(scope="function")
def nurse_user(db):
    return create_test_user(db, "nurse", "nurse@test.com", "nursepass", "nurse")


@pytest.fixture(scope="function")
def legal_user(db):
    return create_test_user(db, "legal", "legal@test.com", "legalpass", "legal_officer")


@pytest.fixture(scope="function")
def admin_token(admin_user):
    return create_access_token({"sub": admin_user.id, "role": admin_user.role})


@pytest.fixture(scope="function")
def doctor_token(doctor_user):
    return create_access_token({"sub": doctor_user.id, "role": doctor_user.role})


@pytest.fixture(scope="function")
def nurse_token(nurse_user):
    return create_access_token({"sub": nurse_user.id, "role": nurse_user.role})


@pytest.fixture(scope="function")
def legal_token(legal_user):
    return create_access_token({"sub": legal_user.id, "role": legal_user.role})


@pytest.fixture(scope="function")
def sample_patient(db, doctor_user):
    from datetime import date

    from app.schemas.patient import PatientCreate
    from app.services.patient_service import create_patient

    patient_data = PatientCreate(
        national_id="1234567890",
        full_name="Ahmed Al-Rashid",
        date_of_birth=date(1985, 3, 15),
        gender="male",
        contact_phone="+966501234567",
        contact_email="ahmed@example.com",
    )
    return create_patient(db, patient_data, doctor_user.id)


@pytest.fixture(scope="function")
def sample_consent(db, sample_patient, doctor_user):
    from app.schemas.consent import ConsentCreate
    from app.services.consent_service import create_consent

    consent_data = ConsentCreate(
        patient_id=sample_patient.id,
        consent_type="treatment",
        icd11_codes=["I10", "E11.9"],
        procedure_description="Blood pressure management",
    )
    return create_consent(db, consent_data, doctor_user.id)
