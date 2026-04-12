from __future__ import annotations

from backend.services.notifications.sms_evidence_service import (
    generate_sms_content_hash,
    mask_phone_number,
    persist_sms_evidence,
)


class _FakeSession:
    def __init__(self):
        self.added = []
        self.committed = False
        self.closed = False
        self.rolled_back = False

    def add(self, item):
        self.added.append(item)

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


def test_generate_sms_content_hash_is_stable():
    h1 = generate_sms_content_hash("Legal notice 123")
    h2 = generate_sms_content_hash("Legal notice 123")
    h3 = generate_sms_content_hash("Different body")

    assert h1 == h2
    assert h1 != h3
    assert len(h1) == 64


def test_mask_phone_number_masks_pii():
    assert mask_phone_number("+966500000000") == "966****00"
    assert mask_phone_number("0500") == "****"
    assert mask_phone_number("abc") == "****"


def test_persist_sms_evidence_success_creates_record(monkeypatch):
    monkeypatch.setenv("SMS_EVIDENCE_ENABLED", "true")

    fake_db = _FakeSession()
    monkeypatch.setattr("backend.services.notifications.sms_evidence_service.SessionLocal", lambda: fake_db)

    persist_sms_evidence(
        to="+966500000000",
        message="Case update message",
        result={
            "ok": True,
            "status_code": 201,
            "attempt": 2,
            "max_attempts": 3,
            "data": {"messageId": "msg-123"},
        },
        provider="taqnyat",
        event_type="case_update",
        case_id="case-1",
        document_id="doc-1",
        recipient_role="patient",
        message_template_key="case_update_sms",
        message_template_version="v1",
        metadata_json={"origin": "unit-test"},
    )

    assert fake_db.committed is True
    assert fake_db.closed is True
    assert len(fake_db.added) == 1

    record = fake_db.added[0]
    assert record.case_id == "case-1"
    assert record.document_id == "doc-1"
    assert record.event_type == "case_update"
    assert record.provider == "taqnyat"
    assert record.provider_message_id == "msg-123"
    assert record.provider_status == "201"
    assert record.internal_status == "succeeded"
    assert record.retry_count == 1
    assert record.failure_reason is None
    assert record.sent_at is not None
    assert record.failed_at is None
    assert record.content_hash == generate_sms_content_hash("Case update message")
    assert record.recipient_phone_masked == "966****00"


def test_persist_sms_evidence_failure_creates_masked_record(monkeypatch):
    monkeypatch.setenv("SMS_EVIDENCE_ENABLED", "true")

    fake_db = _FakeSession()
    monkeypatch.setattr("backend.services.notifications.sms_evidence_service.SessionLocal", lambda: fake_db)

    persist_sms_evidence(
        to="0500000000",
        message="OTP 123456",
        result={
            "ok": False,
            "status_code": 503,
            "attempt": 3,
            "max_attempts": 3,
            "data": {"error": "provider unavailable"},
        },
        provider="taqnyat",
        event_type="otp_send",
    )

    assert fake_db.committed is True
    assert len(fake_db.added) == 1

    record = fake_db.added[0]
    assert record.internal_status == "failed"
    assert record.provider_status == "503"
    assert record.retry_count == 2
    assert record.sent_at is None
    assert record.failed_at is not None
    assert record.failure_reason == "provider unavailable"
    # Ensure only masked value is persisted, not full recipient.
    assert record.recipient_phone_masked == "050****00"
