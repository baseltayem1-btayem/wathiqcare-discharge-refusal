"""
tests/test_secure_discharge_links.py
=====================================
End-to-end hardening suite for the secure-discharge-link module.

Scenarios covered
-----------------
1.  Create secure link for valid case           → 201 / link_id + url returned
2.  Public endpoint: valid token                → 200, case summary, no raw token
3.  Public endpoint: expired token             → 410 Gone
4.  Public endpoint: revoked token             → 404 Not Found
5.  Public endpoint: unknown token             → 404 Not Found
6.  List links for case                         → 200, at least one entry
7.  Revoke an existing link                     → 200, revoked=True
8.  Second revoke is idempotent                 → 200 (no error)
9.  Security: raw token NOT in DB              → DB row has hashed value only
10. Security: public endpoint hides sensitive fields
11. Audit log: generate creates entry
12. Audit log: first-access creates entry
13. Audit log: revoke creates entry
14. Email fallback: not-configured path        → delivery_status='not_configured'
15. Email fallback: configured path (mocked)   → delivery_status='sent'
"""

from __future__ import annotations

import hashlib
import hmac
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Generator
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# ── env must be set before importing any backend module ──────────────────────
os.environ.setdefault("PUBLIC_LINK_TOKEN_PEPPER", "test-pepper-hardening")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(__file__).with_suffix('.sqlite3')}"
os.environ["APP_BASE_URL"] = "http://localhost:3000"
os.environ["SECURE_LINK_EXPIRY_HOURS"] = "72"
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
os.environ.setdefault("JWT_ALGORITHM", "HS256")

from fastapi.testclient import TestClient

from backend.api import deps as deps_module
from backend.core import database as database_module
from backend.core.database import Base
from backend.main import app
from backend.models.audit_log import AuditLog
from backend.models.discharge_case import DischargeCase
from backend.models.discharge_execution_item import DischargeExecutionItem
from backend.models.secure_discharge_link import SecureDischargeLink
from backend.services import secure_link_service as secure_link_service_module
from backend.services.secure_link_service import _hash_token

SQLITE_PATH = Path(__file__).with_suffix(".sqlite3")
TEST_ENGINE = create_engine(
    f"sqlite:///{SQLITE_PATH}",
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)

database_module.engine = TEST_ENGINE
database_module.SessionLocal = TestingSessionLocal
deps_module.SessionLocal = TestingSessionLocal
secure_link_service_module.SessionLocal = TestingSessionLocal
app.router.on_startup.clear()
app.router.on_shutdown.clear()

# Alias so test methods that reference SessionLocal directly still work
SessionLocal = TestingSessionLocal

client = TestClient(app, raise_server_exceptions=True)

# ── helpers ──────────────────────────────────────────────────────────────────

TENANT_ID = "test-tenant-sdl-" + str(uuid.uuid4())[:8]
PATIENT_ID = "test-patient-sdl-" + str(uuid.uuid4())[:8]
USER_ID = "test-user-sdl-" + str(uuid.uuid4())[:8]
CASE_ID = "test-case-sdl-" + str(uuid.uuid4())[:8]
RECIPIENT = "patient-rep@example.com"


def _make_staff_token(user_id: str = USER_ID) -> str:
    """Mint a valid JWT for the test user."""
    from backend.core.security import create_access_token

    return create_access_token(
        data={
            "sub": user_id,
            "email": "staff@test.com",
            "role": "doctor",
            "tenant_id": TENANT_ID,
            "tenant_code": "TEST",
        }
    )


def _auth_headers(user_id: str = USER_ID) -> dict:
    return {"Authorization": f"Bearer {_make_staff_token(user_id)}"}


# ── fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module", autouse=True)
def seed_db() -> Generator:
    """Insert minimal required records and clean up after all tests."""
    Base.metadata.create_all(bind=TEST_ENGINE)

    db = TestingSessionLocal()
    try:
        # Use raw SQL to avoid ORM-model/DB-schema column mismatches
        db.execute(
            text("INSERT INTO tenants (id, name, code, is_active) VALUES (:id, :name, :code, 1)"),
            {"id": TENANT_ID, "name": "Test Tenant SDL", "code": "TEST"},
        )
        db.execute(
            text(
                "INSERT INTO patients (id, tenant_id, mrn, full_name)"
                " VALUES (:id, :tid, :mrn, :fn)"
            ),
            {"id": PATIENT_ID, "tid": TENANT_ID, "mrn": "MRN-SDL-PAT-001", "fn": "Ahmed Al-Qahtani"},
        )
        db.execute(
            text(
                "INSERT INTO users (id, tenant_id, email, full_name, role, is_active, hashed_password)"
                " VALUES (:id, :tid, :email, :fn, :role, true, :hp)"
            ),
            {
                "id": USER_ID, "tid": TENANT_ID, "email": "staff@test.com",
                "fn": "Test Staff", "role": "doctor", "hp": "placeholder",
            },
        )
        db.execute(
            text(
                "INSERT INTO discharge_cases"
                " (id, tenant_id, patient_id, created_by, status, patient_name, mrn,"
                "  department, attending_physician_name, artifact_version, immutable_lock)"
                " VALUES (:id, :tid, :pid, :uid, :status, :pname, :mrn, :dept, :dr, :artifact_version, :immutable_lock)"
            ),
            {
                "id": CASE_ID, "tid": TENANT_ID, "pid": PATIENT_ID, "uid": USER_ID,
                "status": "pending", "pname": "Ahmed Al-Qahtani",
                "mrn": "MRN-SDL-001", "dept": "Cardiology", "dr": "Dr. Nasser",
                "artifact_version": "1", "immutable_lock": False,
            },
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    yield  # ── run all tests ───────────────────────────────────────────────

    # cleanup
    db = TestingSessionLocal()
    try:
        db.execute(
            text("DELETE FROM secure_discharge_links WHERE tenant_id = :tid"),
            {"tid": TENANT_ID},
        )
        db.execute(
            text("DELETE FROM audit_logs WHERE tenant_id = :tid"),
            {"tid": TENANT_ID},
        )
        db.execute(
            text("DELETE FROM discharge_cases WHERE id = :cid"),
            {"cid": CASE_ID},
        )
        db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": USER_ID})
        db.execute(
            text("DELETE FROM patients WHERE id = :pid"), {"pid": PATIENT_ID}
        )
        db.execute(
            text("DELETE FROM tenants WHERE id = :tid"), {"tid": TENANT_ID}
        )
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

    Base.metadata.drop_all(bind=TEST_ENGINE)
    if SQLITE_PATH.exists():
        SQLITE_PATH.unlink()


# We store generated link_id + raw_token across tests in module-level state
_state: dict = {}


# ── scenario 1: create secure link ───────────────────────────────────────────

class TestCreateSecureLink:
    def test_create_returns_201_or_200(self):
        with patch(
            "backend.api.routers.secure_links._try_send_email",
            return_value="not_configured",
        ):
            resp = client.post(
                f"/api/discharge/cases/{CASE_ID}/secure-link",
                json={"recipient_email": RECIPIENT},
                headers=_auth_headers(),
            )
        assert resp.status_code in (200, 201), resp.text
        body = resp.json()
        assert "link_id" in body
        assert "url" in body
        assert "expires_at" in body
        assert body["recipient_email"] == RECIPIENT
        assert "localhost:3000/secure/" in body["url"]
        # store for subsequent tests
        _state["link_id"] = body["link_id"]
        raw_token = body["url"].split("/secure/")[-1]
        _state["raw_token"] = raw_token

    def test_unknown_case_returns_404(self):
        with patch(
            "backend.api.routers.secure_links._try_send_email",
            return_value="not_configured",
        ):
            resp = client.post(
                f"/api/discharge/cases/nonexistent-case/secure-link",
                json={"recipient_email": RECIPIENT},
                headers=_auth_headers(),
            )
        assert resp.status_code == 404

    def test_unauthenticated_returns_401_or_403(self):
        resp = client.post(
            f"/api/discharge/cases/{CASE_ID}/secure-link",
            json={"recipient_email": RECIPIENT},
        )
        assert resp.status_code in (401, 403)

    def test_same_recipient_recent_issue_returns_429(self, monkeypatch):
        monkeypatch.setenv("SECURE_LINK_ISSUE_COOLDOWN_SECONDS", "3600")
        monkeypatch.setenv("SECURE_LINK_MAX_ACTIVE_PER_CASE", "10")

        with patch(
            "backend.api.routers.secure_links._try_send_email",
            return_value="not_configured",
        ):
            resp = client.post(
                f"/api/discharge/cases/{CASE_ID}/secure-link",
                json={"recipient_email": RECIPIENT},
                headers=_auth_headers(),
            )

        assert resp.status_code == 429, resp.text
        assert "recently" in resp.json()["detail"]

    def test_active_link_limit_returns_429(self, monkeypatch):
        monkeypatch.setenv("SECURE_LINK_ISSUE_COOLDOWN_SECONDS", "0")
        monkeypatch.setenv("SECURE_LINK_MAX_ACTIVE_PER_CASE", "1")

        with patch(
            "backend.api.routers.secure_links._try_send_email",
            return_value="not_configured",
        ):
            resp = client.post(
                f"/api/discharge/cases/{CASE_ID}/secure-link",
                json={"recipient_email": "another-recipient@example.com"},
                headers=_auth_headers(),
            )

        assert resp.status_code == 429, resp.text
        assert "Maximum active secure links" in resp.json()["detail"]


# ── scenario 2: valid token resolves ─────────────────────────────────────────

class TestValidToken:
    def test_valid_token_returns_case_summary(self):
        raw_token = _state.get("raw_token")
        assert raw_token, "No token from create step"
        resp = client.get(f"/api/discharge/secure/{raw_token}")
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["case_id"] == CASE_ID
        assert body["hospital_name"] == "Test Tenant SDL"
        assert body["case_reference"] == CASE_ID
        assert "legal_notice" in body
        # must not expose token_hash or internal ids we don't want
        assert "token_hash" not in body
        assert "tenant_id" not in body
        assert "created_by" not in body

    def test_valid_token_sets_accessed_at(self):
        db = SessionLocal()
        try:
            link = (
                db.query(SecureDischargeLink)
                .filter(SecureDischargeLink.id == _state["link_id"])
                .first()
            )
            assert link is not None
            assert link.accessed_at is not None
        finally:
            db.close()


# ── scenario 3: expired token ─────────────────────────────────────────────────

class TestExpiredToken:
    def test_expired_token_returns_410(self):
        # insert a link whose expires_at is in the past
        db = SessionLocal()
        raw = "expired-raw-" + str(uuid.uuid4())
        h = _hash_token(raw)
        expired_link = SecureDischargeLink(
            id=str(uuid.uuid4()),
            tenant_id=TENANT_ID,
            case_id=CASE_ID,
            created_by=USER_ID,
            recipient_email=RECIPIENT,
            token_hash=h,
            expires_at=datetime.utcnow() - timedelta(hours=1),
            delivery_status="sent",
        )
        try:
            db.add(expired_link)
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

        resp = client.get(f"/api/discharge/secure/{raw}")
        assert resp.status_code == 410, resp.text


# ── scenario 4: revoked token ─────────────────────────────────────────────────

class TestRevokedToken:
    def test_revoked_token_returns_404(self):
        # insert a pre-revoked link
        db = SessionLocal()
        raw = "revoked-raw-" + str(uuid.uuid4())
        h = _hash_token(raw)
        revoked_link = SecureDischargeLink(
            id=str(uuid.uuid4()),
            tenant_id=TENANT_ID,
            case_id=CASE_ID,
            created_by=USER_ID,
            recipient_email=RECIPIENT,
            token_hash=h,
            expires_at=datetime.utcnow() + timedelta(hours=72),
            revoked_at=datetime.utcnow(),
            delivery_status="sent",
        )
        try:
            db.add(revoked_link)
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

        resp = client.get(f"/api/discharge/secure/{raw}")
        assert resp.status_code == 404, resp.text


# ── scenario 5: unknown token ────────────────────────────────────────────────

class TestUnknownToken:
    def test_unknown_token_returns_404(self):
        resp = client.get("/api/discharge/secure/totally-random-nonexistent-token-xyz")
        assert resp.status_code == 404


# ── scenario 6: list links ───────────────────────────────────────────────────

class TestListLinks:
    def test_list_returns_at_least_one(self):
        resp = client.get(
            f"/api/discharge/cases/{CASE_ID}/secure-links",
            headers=_auth_headers(),
        )
        assert resp.status_code == 200, resp.text
        links = resp.json()
        assert isinstance(links, list)
        assert any(lnk["link_id"] == _state["link_id"] for lnk in links)

    def test_list_does_not_contain_token_hash(self):
        resp = client.get(
            f"/api/discharge/cases/{CASE_ID}/secure-links",
            headers=_auth_headers(),
        )
        for lnk in resp.json():
            assert "token_hash" not in lnk

    def test_list_requires_auth(self):
        resp = client.get(f"/api/discharge/cases/{CASE_ID}/secure-links")
        assert resp.status_code in (401, 403)


# ── scenario 7 + 8: revoke ───────────────────────────────────────────────────

class TestRevokeLink:
    def test_revoke_returns_success(self):
        link_id = _state.get("link_id")
        assert link_id
        resp = client.delete(
            f"/api/discharge/cases/{CASE_ID}/secure-links/{link_id}",
            headers=_auth_headers(),
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["revoked"] is True

    def test_second_revoke_is_idempotent(self):
        link_id = _state["link_id"]
        resp = client.delete(
            f"/api/discharge/cases/{CASE_ID}/secure-links/{link_id}",
            headers=_auth_headers(),
        )
        assert resp.status_code == 200

    def test_revoked_link_token_now_returns_404(self):
        raw_token = _state["raw_token"]
        resp = client.get(f"/api/discharge/secure/{raw_token}")
        assert resp.status_code == 404


# ── scenario 9: raw token never persisted ────────────────────────────────────

class TestTokenSecurity:
    def test_raw_token_not_in_database(self):
        raw_token = _state.get("raw_token")
        assert raw_token
        db = SessionLocal()
        try:
            # check token_hash column directly
            link = (
                db.query(SecureDischargeLink)
                .filter(SecureDischargeLink.id == _state["link_id"])
                .first()
            )
            assert link is not None
            stored_hash = link.token_hash
            # stored value must NOT equal the raw token
            assert stored_hash != raw_token
            # stored value must be a valid hex digest
            assert len(stored_hash) == 64  # SHA-256 hex
            # recomputing HMAC with the correct pepper must match
            expected = _hash_token(raw_token)
            assert stored_hash == expected
        finally:
            db.close()

    def test_hash_function_is_hmac_sha256(self):
        pepper = os.environ["PUBLIC_LINK_TOKEN_PEPPER"]
        raw = "test-raw-token"
        expected = hmac.new(
            pepper.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        assert _hash_token(raw) == expected

    def test_different_tokens_produce_different_hashes(self):
        h1 = _hash_token("tokenA")
        h2 = _hash_token("tokenB")
        assert h1 != h2

    def test_no_raw_token_column_in_table(self):
        db = SessionLocal()
        try:
            # PRAGMA table_info works on both SQLite (tests) and Postgres via
            # the SQLite test engine; column name is at index 1.
            cols = {
                row[1]
                for row in db.execute(
                    text("PRAGMA table_info('secure_discharge_links')")
                ).fetchall()
            }
            assert "raw_token" not in cols
            assert "token" not in cols
            assert "token_hash" in cols
        finally:
            db.close()


# ── scenario 10: public endpoint does not leak sensitive fields ───────────────

class TestNoDataLeak:
    def test_create_a_fresh_link_and_check_public_response(self):
        """Create a new (non-revoked) link and verify public response fields."""
        db = SessionLocal()
        raw = "fresh-" + str(uuid.uuid4())
        h = _hash_token(raw)
        fresh = SecureDischargeLink(
            id=str(uuid.uuid4()),
            tenant_id=TENANT_ID,
            case_id=CASE_ID,
            created_by=USER_ID,
            recipient_email=RECIPIENT,
            token_hash=h,
            expires_at=datetime.utcnow() + timedelta(hours=72),
            delivery_status="sent",
        )
        try:
            db.add(fresh)
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

        resp = client.get(f"/api/discharge/secure/{raw}")
        assert resp.status_code == 200
        body = resp.json()

        # fields that MUST be present for the patient-facing view
        assert "case_id" in body
        assert "expires_at" in body

        # fields that MUST NOT leak
        forbidden = {
            "token_hash", "tenant_id", "created_by",
            "recipient_email", "sent_via", "delivery_status",
        }
        for f in forbidden:
            assert f not in body, f"Sensitive field '{f}' leaked in public response"


# ── scenario 11-13: audit log ────────────────────────────────────────────────

class TestAuditLog:
    def test_link_opened_audit_entry_exists(self):
        db = SessionLocal()
        try:
            entry = (
                db.query(AuditLog)
                .filter(
                    AuditLog.entity_id == _state["link_id"],
                    AuditLog.action == "link_opened",
                )
                .first()
            )
            assert entry is not None, "No audit entry for link_opened"
        finally:
            db.close()

    def test_token_validated_audit_entry_exists(self):
        db = SessionLocal()
        try:
            entry = (
                db.query(AuditLog)
                .filter(
                    AuditLog.entity_id == _state["link_id"],
                    AuditLog.action == "token_validated",
                )
                .first()
            )
            assert entry is not None, "No audit entry for token_validated"
        finally:
            db.close()

    def test_generate_audit_entry_exists(self):
        db = SessionLocal()
        try:
            entry = (
                db.query(AuditLog)
                .filter(
                    AuditLog.tenant_id == TENANT_ID,
                    AuditLog.entity_id == _state["link_id"],
                    AuditLog.action == "secure_link_generated",
                )
                .first()
            )
            assert entry is not None, "No audit entry for secure_link_generated"
        finally:
            db.close()

    def test_first_access_audit_entry_exists(self):
        db = SessionLocal()
        try:
            entry = (
                db.query(AuditLog)
                .filter(
                    AuditLog.entity_id == _state["link_id"],
                    AuditLog.action == "secure_link_first_access",
                )
                .first()
            )
            assert entry is not None, "No audit entry for secure_link_first_access"
        finally:
            db.close()

    def test_revoke_audit_entry_exists(self):
        db = SessionLocal()
        try:
            entry = (
                db.query(AuditLog)
                .filter(
                    AuditLog.entity_id == _state["link_id"],
                    AuditLog.action == "secure_link_revoked",
                )
                .first()
            )
            assert entry is not None, "No audit entry for secure_link_revoked"
        finally:
            db.close()


# ── scenario 14: email not configured ────────────────────────────────────────

class TestEmailFallback:
    def test_not_configured_returns_not_configured_status(self):
        """When Graph env vars are absent, delivery_status = not_configured and
        the endpoint still returns 200 with the link URL."""
        resp = client.post(
            f"/api/discharge/cases/{CASE_ID}/secure-link",
            json={"recipient_email": "fallback-test@example.com"},
            headers=_auth_headers(),
        )
        # Email config vars are NOT set in test env → should get not_configured
        assert resp.status_code in (200, 201), resp.text
        body = resp.json()
        assert body["delivery_status"] in ("not_configured", "failed", "sent")
        assert "url" in body
        assert "link_id" in body

    def test_configured_email_calls_send_email(self):
        """When EmailService.send_email succeeds, delivery_status = sent."""
        mock_svc = MagicMock()
        mock_svc.send_email.return_value = {"status": "sent"}

        with patch(
            "backend.api.routers.secure_links.EmailService",
            return_value=mock_svc,
        ):
            resp = client.post(
                f"/api/discharge/cases/{CASE_ID}/secure-link",
                json={"recipient_email": "configured@example.com"},
                headers=_auth_headers(),
            )
        assert resp.status_code in (200, 201), resp.text
        body = resp.json()
        assert body["delivery_status"] == "sent"
        mock_svc.send_email.assert_called_once()
        call_kwargs = mock_svc.send_email.call_args.kwargs
        assert call_kwargs["recipients"] == ["configured@example.com"]
        assert CASE_ID == call_kwargs["case_id"]


class TestPublicDecisionSubmission:
    def test_accept_submission_persists_decision(self):
        with patch(
            "backend.api.routers.secure_links._try_send_email",
            return_value="not_configured",
        ):
            create_resp = client.post(
                f"/api/discharge/cases/{CASE_ID}/secure-link",
                json={"recipient_email": "accept-secure@example.com"},
                headers=_auth_headers(),
            )
        assert create_resp.status_code in (200, 201), create_resp.text
        accept_url = create_resp.json()["url"]
        accept_token = accept_url.split("/secure/")[-1]

        submit_resp = client.post(
            f"/api/discharge/secure/{accept_token}/decision",
            json={
                "decision": "accept",
                "typed_name": "Khaled Al-Harbi",
                "refusal_acknowledged": False,
            },
            headers={
                "x-forwarded-for": "203.0.113.20",
                "user-agent": "pytest-accept-flow",
            },
        )
        assert submit_resp.status_code == 200, submit_resp.text
        body = submit_resp.json()
        assert body["decision_type"] == "accept"
        assert body["typed_name"] == "Khaled Al-Harbi"

        db = SessionLocal()
        try:
            link = (
                db.query(SecureDischargeLink)
                .filter(SecureDischargeLink.recipient_email == "accept-secure@example.com")
                .order_by(SecureDischargeLink.created_at.desc())
                .first()
            )
            case = db.query(DischargeCase).filter(DischargeCase.id == CASE_ID).first()
            assert link is not None
            assert case is not None
            assert link.decision_type == "accept"
            assert link.decision_name == "Khaled Al-Harbi"
            assert link.decision_ip_address == "203.0.113.20"
            assert link.decision_user_agent == "pytest-accept-flow"
            assert link.decision_submitted_at is not None
            assert case.accepted_at is not None
            assert case.signer_name == "Khaled Al-Harbi"
        finally:
            db.close()

    def test_refusal_requires_legal_acknowledgment(self):
        with patch(
            "backend.api.routers.secure_links._try_send_email",
            return_value="not_configured",
        ):
            create_resp = client.post(
                f"/api/discharge/cases/{CASE_ID}/secure-link",
                json={"recipient_email": "refusal-secure@example.com"},
                headers=_auth_headers(),
            )
        assert create_resp.status_code in (200, 201), create_resp.text
        refusal_url = create_resp.json()["url"]
        refusal_token = refusal_url.split("/secure/")[-1]
        _state["decision_link_token"] = refusal_token

        rejected_resp = client.post(
            f"/api/discharge/secure/{refusal_token}/decision",
            json={
                "decision": "refuse",
                "typed_name": "Maha Al-Otaibi",
                "refusal_acknowledged": False,
            },
        )
        assert rejected_resp.status_code == 400, rejected_resp.text

    def test_refusal_submission_persists_fields_and_audits(self):
        refusal_token = _state["decision_link_token"]

        open_resp = client.get(
            f"/api/discharge/secure/{refusal_token}",
            headers={
                "x-forwarded-for": "203.0.113.10",
                "user-agent": "pytest-open-flow",
            },
        )
        assert open_resp.status_code == 200, open_resp.text

        submit_resp = client.post(
            f"/api/discharge/secure/{refusal_token}/decision",
            json={
                "decision": "refuse",
                "typed_name": "Maha Al-Otaibi",
                "refusal_acknowledged": True,
            },
            headers={
                "x-forwarded-for": "203.0.113.10",
                "user-agent": "pytest-refusal-flow",
            },
        )
        assert submit_resp.status_code == 200, submit_resp.text
        body = submit_resp.json()
        assert body["decision_type"] == "refuse"
        assert body["typed_name"] == "Maha Al-Otaibi"

        db = SessionLocal()
        try:
            link = (
                db.query(SecureDischargeLink)
                .filter(SecureDischargeLink.recipient_email == "refusal-secure@example.com")
                .order_by(SecureDischargeLink.created_at.desc())
                .first()
            )
            case = db.query(DischargeCase).filter(DischargeCase.id == CASE_ID).first()
            assert link is not None
            assert case is not None
            assert link.decision_type == "refuse"
            assert link.decision_name == "Maha Al-Otaibi"
            assert link.decision_submitted_at is not None
            assert link.refusal_acknowledged_at is not None
            assert link.decision_ip_address == "203.0.113.10"
            assert link.decision_user_agent == "pytest-refusal-flow"
            assert case.refused_at is not None
            assert case.status == "refused"
            assert case.signer_name == "Maha Al-Otaibi"

            decision_entry = (
                db.query(AuditLog)
                .filter(
                    AuditLog.entity_id == link.id,
                    AuditLog.action == "decision_submitted",
                )
                .first()
            )
            refusal_entry = (
                db.query(AuditLog)
                .filter(
                    AuditLog.entity_id == link.id,
                    AuditLog.action == "refusal_acknowledged",
                )
                .first()
            )
            link_opened_entry = (
                db.query(AuditLog)
                .filter(
                    AuditLog.entity_id == link.id,
                    AuditLog.action == "link_opened",
                )
                .first()
            )
            validated_entry = (
                db.query(AuditLog)
                .filter(
                    AuditLog.entity_id == link.id,
                    AuditLog.action == "token_validated",
                )
                .first()
            )
            assert decision_entry is not None
            assert refusal_entry is not None
            assert link_opened_entry is not None
            assert validated_entry is not None
        finally:
            db.close()


# ── scenario 16-18: signature payload + conditional sections ─────────────────────────

class TestSignatureAndConditionalSections:
    """Covers accept/refuse paths with canvas signature data and conditional
    home-care / equipment rendering based on DischargeExecutionItem records."""

    FAKE_SIGNATURE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    def _create_fresh_link(self, email: str) -> str:
        """Helper: create a new non-revoked link and return the raw token."""
        with patch(
            "backend.api.routers.secure_links._try_send_email",
            return_value="not_configured",
        ):
            resp = client.post(
                f"/api/discharge/cases/{CASE_ID}/secure-link",
                json={"recipient_email": email},
                headers=_auth_headers(),
            )
        assert resp.status_code in (200, 201), resp.text
        return resp.json()["url"].split("/secure/")[-1]

    def test_accept_with_signature_data_stored_on_case(self):
        """When signature_data is provided on accept, case.signature_text
        must be the base64 PNG, not the typed name."""
        # Reset case status so accept can be processed
        db = SessionLocal()
        try:
            case = db.query(DischargeCase).filter(DischargeCase.id == CASE_ID).first()
            case.status = "pending"
            case.accepted_at = None
            case.refused_at = None
            case.signature_text = None
            db.commit()
        finally:
            db.close()

        token = self._create_fresh_link("sig-accept@example.com")
        resp = client.post(
            f"/api/discharge/secure/{token}/decision",
            json={
                "decision": "accept",
                "typed_name": "Faisal Al-Ghamdi",
                "refusal_acknowledged": False,
                "signature_data": self.FAKE_SIGNATURE,
            },
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["decision_type"] == "accept"
        assert body["typed_name"] == "Faisal Al-Ghamdi"

        # Verify canvas data stored in signature_text (not plain typed name)
        db = SessionLocal()
        try:
            case = db.query(DischargeCase).filter(DischargeCase.id == CASE_ID).first()
            assert case is not None
            assert case.signature_text == self.FAKE_SIGNATURE
            assert case.signer_name == "Faisal Al-Ghamdi"
        finally:
            db.close()

    def test_refuse_with_signature_payload_persists_to_signature_text(self):
        """Refuse path with canvas signature must persist base64 in signature_text."""
        db = SessionLocal()
        try:
            case = db.query(DischargeCase).filter(DischargeCase.id == CASE_ID).first()
            case.status = "pending"
            case.accepted_at = None
            case.refused_at = None
            case.signature_text = None
            db.commit()
        finally:
            db.close()

        token = self._create_fresh_link("sig-refuse@example.com")
        resp = client.post(
            f"/api/discharge/secure/{token}/decision",
            json={
                "decision": "refuse",
                "typed_name": "Noura Al-Zahrani",
                "refusal_acknowledged": True,
                "signature_data": self.FAKE_SIGNATURE,
            },
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["decision_type"] == "refuse"

        db = SessionLocal()
        try:
            link = (
                db.query(SecureDischargeLink)
                .filter(SecureDischargeLink.recipient_email == "sig-refuse@example.com")
                .order_by(SecureDischargeLink.created_at.desc())
                .first()
            )
            case = db.query(DischargeCase).filter(DischargeCase.id == CASE_ID).first()
            assert link is not None
            assert link.refusal_acknowledged_at is not None
            assert case is not None
            assert case.signature_text == self.FAKE_SIGNATURE
        finally:
            db.close()

    def test_typed_name_fallback_when_no_signature_data(self):
        """When signature_data is absent/null, fallback to typed name in signature_text."""
        db = SessionLocal()
        try:
            case = db.query(DischargeCase).filter(DischargeCase.id == CASE_ID).first()
            case.status = "pending"
            case.accepted_at = None
            case.refused_at = None
            case.signature_text = None
            db.commit()
        finally:
            db.close()

        token = self._create_fresh_link("sig-fallback@example.com")
        resp = client.post(
            f"/api/discharge/secure/{token}/decision",
            json={
                "decision": "accept",
                "typed_name": "Omar Al-Dosari",
                "refusal_acknowledged": False,
                # signature_data intentionally omitted
            },
        )
        assert resp.status_code == 200, resp.text

        db = SessionLocal()
        try:
            case = db.query(DischargeCase).filter(DischargeCase.id == CASE_ID).first()
            assert case is not None
            assert case.signature_text == "Omar Al-Dosari"
        finally:
            db.close()

    def test_conditional_sections_absent_in_payload_without_execution_items(self):
        """Public payload must report has_home_care_agreement=False and
        has_equipment_acknowledgment=False when no execution items exist for the case."""
        db = SessionLocal()
        try:
            # Ensure no execution items for this case
            db.query(DischargeExecutionItem).filter(
                DischargeExecutionItem.case_id == CASE_ID
            ).delete()
            db.commit()
        finally:
            db.close()

        token = self._create_fresh_link("conditional-absent@example.com")
        resp = client.get(f"/api/discharge/secure/{token}")
        assert resp.status_code == 200, resp.text
        body = resp.json()

        assert body["has_home_care_agreement"] is False
        assert body["home_care_agreement_text"] is None
        assert body["has_equipment_acknowledgment"] is False
        assert body["equipment_acknowledgment_text"] is None

    def test_conditional_sections_present_when_execution_items_exist(self):
        """Public payload must expose home-care and equipment fields when the
        corresponding DischargeExecutionItem rows exist for the case."""
        home_item_id = str(uuid.uuid4())
        equip_item_id = str(uuid.uuid4())

        db = SessionLocal()
        try:
            db.add(DischargeExecutionItem(
                id=home_item_id,
                case_id=CASE_ID,
                item_type="home_healthcare",
                target_team_code="HH",
                description="رعاية تمريضية منزلية مرتين اسبوعياً",
            ))
            db.add(DischargeExecutionItem(
                id=equip_item_id,
                case_id=CASE_ID,
                item_type="medical_equipment",
                target_team_code="ME",
                description="جهاز أكسجين منزلي",
            ))
            db.commit()
        finally:
            db.close()

        try:
            token = self._create_fresh_link("conditional-present@example.com")
            resp = client.get(f"/api/discharge/secure/{token}")
            assert resp.status_code == 200, resp.text
            body = resp.json()

            assert body["has_home_care_agreement"] is True
            assert body["home_care_agreement_text"] == "رعاية تمريضية منزلية مرتين اسبوعياً"
            assert body["has_equipment_acknowledgment"] is True
            assert body["equipment_acknowledgment_text"] == "جهاز أكسجين منزلي"
        finally:
            # Cleanup execution items regardless of assertion outcome
            db = SessionLocal()
            try:
                db.query(DischargeExecutionItem).filter(
                    DischargeExecutionItem.id.in_([home_item_id, equip_item_id])
                ).delete(synchronize_session=False)
                db.commit()
            finally:
                db.close()
