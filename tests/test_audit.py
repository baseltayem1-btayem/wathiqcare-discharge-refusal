from app.services.audit_service import log_event, verify_chain


def test_log_event_creates_entry(db, admin_user):
    log = log_event(db, "test_event", "user", admin_user.id, admin_user.id, {"key": "value"})
    assert log.id is not None
    assert log.event_type == "test_event"
    assert log.entry_hash != ""


def test_audit_chain_first_entry(db, admin_user):
    log = log_event(db, "first_event", "user", admin_user.id, admin_user.id, {})
    assert log.prev_hash == ""


def test_audit_chain_chained(db, admin_user):
    log1 = log_event(db, "event1", "user", admin_user.id, admin_user.id, {"a": 1})
    log2 = log_event(db, "event2", "user", admin_user.id, admin_user.id, {"b": 2})
    assert log2.prev_hash == log1.entry_hash


def test_verify_chain_valid(db, admin_user):
    log_event(db, "event1", "user", admin_user.id, admin_user.id, {"a": 1})
    log_event(db, "event2", "user", admin_user.id, admin_user.id, {"b": 2})
    assert verify_chain(db) is True


def test_verify_chain_tampered(db, admin_user):
    from app.models.audit import AuditLog

    log_event(db, "event1", "user", admin_user.id, admin_user.id, {"a": 1})
    log = db.query(AuditLog).first()
    log.entry_hash = "tampered_hash"
    db.commit()
    assert verify_chain(db) is False


def test_get_audit_logs(client, admin_token, sample_patient):
    response = client.get("/audit/logs", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_verify_audit_chain_endpoint(client, admin_token):
    response = client.get("/audit/verify", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert "chain_valid" in response.json()


def test_audit_log_requires_legal_or_admin(client, doctor_token):
    response = client.get("/audit/logs", headers={"Authorization": f"Bearer {doctor_token}"})
    assert response.status_code == 403
