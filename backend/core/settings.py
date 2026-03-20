from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class DatabaseSettings:
    provider: str
    host: str
    port: str
    name: str
    user: str
    password: str
    odbc_driver: str
    encrypt: str
    trust_server_certificate: str


def _normalized_provider(raw_provider: str | None) -> str:
    provider = (raw_provider or "postgresql").strip().lower()
    if provider in {"postgres", "postgresql"}:
        return "postgresql"
    if provider in {"mssql", "sqlserver", "sql_server"}:
        return "sqlserver"
    raise ValueError("Unsupported DB_PROVIDER. Expected 'postgresql' or 'sqlserver'.")


def load_database_settings() -> DatabaseSettings:
    provider = _normalized_provider(os.getenv("DB_PROVIDER"))

    default_port = "1433" if provider == "sqlserver" else "5432"
    return DatabaseSettings(
        provider=provider,
        host=(os.getenv("DB_HOST") or "localhost").strip(),
        port=(os.getenv("DB_PORT") or default_port).strip(),
        name=(os.getenv("DB_NAME") or "").strip(),
        user=(os.getenv("DB_USER") or "").strip(),
        password=os.getenv("DB_PASSWORD") or "",
        odbc_driver=(
            os.getenv("DB_DRIVER")
            or os.getenv("DB_ODBC_DRIVER")
            or "ODBC Driver 18 for SQL Server"
        ).strip(),
        encrypt=(os.getenv("DB_ENCRYPT") or "yes").strip(),
        trust_server_certificate=(
            os.getenv("DB_TRUST_CERT")
            or os.getenv("DB_TRUST_SERVER_CERTIFICATE")
            or "yes"
        ).strip(),
    )


def build_database_url() -> str:
    explicit_url = (os.getenv("DATABASE_URL") or "").strip()
    if explicit_url:
        return explicit_url

    settings = load_database_settings()

    if not settings.name or not settings.user:
        raise ValueError("Database configuration is incomplete. Set DATABASE_URL or DB_* variables.")

    user = quote_plus(settings.user)
    password = quote_plus(settings.password)

    if settings.provider == "postgresql":
        return f"postgresql+psycopg2://{user}:{password}@{settings.host}:{settings.port}/{settings.name}"

    driver = quote_plus(settings.odbc_driver)
    return (
        f"mssql+pyodbc://{user}:{password}@{settings.host}:{settings.port}/{settings.name}"
        f"?driver={driver}&Encrypt={settings.encrypt}&TrustServerCertificate={settings.trust_server_certificate}"
    )
