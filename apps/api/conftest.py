"""
Centralized API test architecture for backend tests.
Ensures apps/api/ is on sys.path and provides shared DB/session/TestClient fixtures.
"""
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.core.database import Base
from backend.api.main import app
from backend.api.deps import get_db

# Add apps/api/ to the Python path so the `backend` package is importable.
sys.path.insert(0, str(Path(__file__).parent))

# Shared in-memory test engine and sessionmaker
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

@pytest.fixture(scope="function")
def db_session():
	"""Yield a SQLAlchemy session and roll back after test."""
	connection = engine.connect()
	transaction = connection.begin()
	session = TestingSessionLocal(bind=connection)
	try:
		yield session
	finally:
		session.close()
		transaction.rollback()
		connection.close()

def override_get_db():
	db = TestingSessionLocal()
	try:
		yield db
	finally:
		db.close()

@pytest.fixture(scope="function")
def test_client():
	app.dependency_overrides[get_db] = override_get_db
	with TestClient(app) as c:
		yield c
	app.dependency_overrides.clear()
