def test_create_escalation(client, sample_consent, doctor_token):
    response = client.post(
        "/escalations",
        json={"consent_id": sample_consent.id, "reason": "Patient refused critical treatment"},
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["consent_id"] == sample_consent.id
    assert len(data["required_actions"]) > 0


def test_escalation_not_found(client, doctor_token):
    response = client.post(
        "/escalations",
        json={"consent_id": "nonexistent-id", "reason": "Test reason"},
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert response.status_code == 404


def test_get_escalation_actions(client, sample_consent, doctor_token):
    client.post(
        "/escalations",
        json={"consent_id": sample_consent.id, "reason": "Test"},
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    response = client.get(
        f"/escalations/{sample_consent.id}/actions",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert response.status_code == 200
    assert "actions" in response.json()


def test_nurse_cannot_escalate(client, sample_consent, nurse_token):
    response = client.post(
        "/escalations",
        json={"consent_id": sample_consent.id, "reason": "Test"},
        headers={"Authorization": f"Bearer {nurse_token}"},
    )
    assert response.status_code == 403


def test_should_escalate_refused_consent(db, sample_consent):
    from app.schemas.consent import ConsentUpdate
    from app.services.consent_service import update_consent_status
    from app.services.escalation_service import should_escalate

    update_consent_status(
        db,
        sample_consent.id,
        ConsentUpdate(status="refused"),
        sample_consent.consented_by,
    )
    db.refresh(sample_consent)
    assert should_escalate(sample_consent, sample_consent.icd11_codes or []) is True
