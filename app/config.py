import os
from pathlib import Path

import yaml
from pydantic_settings import BaseSettings, SettingsConfigDict

CONFIG_DIR = Path(__file__).parent.parent / "config"


def load_yaml(filename: str) -> dict:
    path = CONFIG_DIR / filename
    if path.exists():
        with open(path) as f:
            return yaml.safe_load(f) or {}
    return {}


_settings_yaml = load_yaml("settings.yaml")
_rules_yaml = load_yaml("rules.yaml")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="WATHIQCARE_")

    app_name: str = _settings_yaml.get("app", {}).get("name", "WathiqCare")
    app_version: str = _settings_yaml.get("app", {}).get("version", "1.0.0")
    debug: bool = _settings_yaml.get("app", {}).get("debug", False)
    database_url: str = _settings_yaml.get("database", {}).get("url", "sqlite:///./wathiqcare.db")
    secret_key: str = os.getenv(
        "SECRET_KEY",
        _settings_yaml.get("auth", {}).get(
            "secret_key", "CHANGE_ME_INSECURE_DEFAULT_DO_NOT_USE_IN_PRODUCTION"
        ),
    )
    algorithm: str = _settings_yaml.get("auth", {}).get("algorithm", "HS256")
    access_token_expire_minutes: int = _settings_yaml.get("auth", {}).get(
        "access_token_expire_minutes", 30
    )
    fhir_server_url: str = _settings_yaml.get("fhir", {}).get(
        "server_url", "http://fhir.example.com/R4"
    )
    fhir_api_key: str = _settings_yaml.get("fhir", {}).get("api_key", "")


settings = Settings()
rules = _rules_yaml
