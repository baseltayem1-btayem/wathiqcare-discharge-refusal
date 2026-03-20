from __future__ import annotations

import io
from urllib.error import HTTPError

from backend.core.email_service import EmailDeliveryError, EmailServiceConfig, MicrosoftGraphClient


def _config() -> EmailServiceConfig:
    return EmailServiceConfig(
        tenant_id="08b4493f-d1e2-4c61-b46f-d652ad477fa6",
        client_id="d25f4d4d-51bf-4be8-b4fd-ce8744434eef",
        client_secret="secret",
        sender_email="admin@wathiqcare.med.sa",
    )


def test_acquire_access_token_uses_cache(monkeypatch):
    client = MicrosoftGraphClient(_config())
    calls = {"count": 0}

    def fake_post_form(url: str, form_data: dict[str, str]):
        calls["count"] += 1
        return {"access_token": "token-1", "expires_in": 3600}

    monkeypatch.setattr(client, "_post_form", fake_post_form)

    token1 = client.acquire_access_token()
    token2 = client.acquire_access_token()

    assert token1 == "token-1"
    assert token2 == "token-1"
    assert calls["count"] == 1


def test_acquire_access_token_retries_on_transient_http_error(monkeypatch):
    client = MicrosoftGraphClient(_config())
    attempts = {"count": 0}
    sleeps: list[int] = []

    class FakeResponse:
        def __init__(self, body: str):
            self._body = body.encode("utf-8")

        def read(self):
            return self._body

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    def fake_urlopen(req, timeout=0):
        attempts["count"] += 1
        if attempts["count"] == 1:
            raise HTTPError(
                url=req.full_url,
                code=503,
                msg="Service Unavailable",
                hdrs=None,
                fp=io.BytesIO(b"temporary"),
            )
        return FakeResponse('{"access_token":"token-2","expires_in":3600}')

    monkeypatch.setattr("backend.core.email_service.urllib_request.urlopen", fake_urlopen)
    monkeypatch.setattr("backend.core.email_service.time.sleep", lambda seconds: sleeps.append(seconds))

    token = client.acquire_access_token(force_refresh=True)

    assert token == "token-2"
    assert attempts["count"] == 2
    assert sleeps == [1]


def test_email_diagnostics_reports_missing_configuration(monkeypatch):
    for name in [
        "MICROSOFT_TENANT_ID",
        "MICROSOFT_CLIENT_ID",
        "MICROSOFT_CLIENT_SECRET",
        "MICROSOFT_SENDER_EMAIL",
    ]:
        monkeypatch.delenv(name, raising=False)

    diagnostics = EmailServiceConfig.diagnostics()

    assert diagnostics.available is False
    assert diagnostics.provider == "microsoft_graph"
    assert diagnostics.preferred_channel is None
    assert diagnostics.configured_channels == []

    graph = diagnostics.diagnostics[0]
    assert graph.name == "microsoft_graph"
    assert graph.available is False
    assert graph.configured is False
    assert graph.missing == [
        "MICROSOFT_TENANT_ID",
        "MICROSOFT_CLIENT_ID",
        "MICROSOFT_CLIENT_SECRET",
        "MICROSOFT_SENDER_EMAIL",
    ]
    assert graph.invalid == []
    assert "Missing Microsoft Graph email configuration" in (graph.reason or "")


def test_email_diagnostics_reports_invalid_authorized_values(monkeypatch):
    monkeypatch.setenv("MICROSOFT_TENANT_ID", "wrong-tenant")
    monkeypatch.setenv("MICROSOFT_CLIENT_ID", "wrong-client")
    monkeypatch.setenv("MICROSOFT_CLIENT_SECRET", "secret")
    monkeypatch.setenv("MICROSOFT_SENDER_EMAIL", "wrong@wathiqcare.med.sa")

    diagnostics = EmailServiceConfig.diagnostics()

    assert diagnostics.available is False
    assert diagnostics.configured_channels == ["microsoft_graph"]

    graph = diagnostics.diagnostics[0]
    assert graph.configured is True
    assert graph.missing == []
    assert graph.invalid == [
        "MICROSOFT_TENANT_ID",
        "MICROSOFT_CLIENT_ID",
        "MICROSOFT_SENDER_EMAIL",
    ]
    assert graph.sender_email == "wrong@wathiqcare.med.sa"
    assert "not authorized" in (graph.reason or "")


def test_send_mail_refreshes_token_once_on_401(monkeypatch):
    client = MicrosoftGraphClient(_config())
    acquire_calls: list[bool] = []
    sent_tokens: list[str] = []

    def fake_acquire_access_token(*, force_refresh: bool = False) -> str:
        acquire_calls.append(force_refresh)
        return "token-new" if force_refresh else "token-old"

    def fake_post_json(url: str, payload: dict, headers: dict[str, str]) -> None:
        sent_tokens.append(headers.get("Authorization", ""))
        if headers.get("Authorization") == "Bearer token-old":
            raise EmailDeliveryError("HTTP 401: token expired")

    monkeypatch.setattr(client, "acquire_access_token", fake_acquire_access_token)
    monkeypatch.setattr(client, "_post_json", fake_post_json)

    client.send_mail(
        subject="Test",
        html_body="<p>Hello</p>",
        text_body="Hello",
        recipients=["user@example.com"],
        cc=[],
        attachments=[],
    )

    assert acquire_calls == [False, True]
    assert sent_tokens == ["Bearer token-old", "Bearer token-new"]
