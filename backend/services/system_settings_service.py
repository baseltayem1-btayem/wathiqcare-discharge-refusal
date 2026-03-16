from __future__ import annotations

from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.models.system_setting import SystemSetting


DEFAULT_SYSTEM_SETTINGS: Dict[str, Any] = {
    "default_language": "ar",
    "supported_languages": ["ar", "en"],
    "escalation_thresholds": {
        "legal_hours": 24,
        "compliance_hours": 24,
    },
    "department_routing_rules": {},
    "financial_guarantee_rules": {
        "required_for_refusal_after_hours": 24,
        "allowed_types": [
            "promissory_note",
            "deposit",
            "insurance_guarantee",
            "bank_guarantee",
            "corporate_undertaking",
        ],
    },
    "compliance_notification_rules": {
        "notify_on_legal_document_generation": True,
        "notify_on_financial_guarantee_creation": True,
    },
    "document_version_defaults": {
        "default_version": "1.0",
    },
    "audit_retention": {
        "retention_days": 3650,
    },
}


class SystemSettingsService:
    def __init__(self, db: Session):
        self.db = db

    def ensure_defaults(self, tenant_id: Optional[str] = None) -> None:
        for key, value in DEFAULT_SYSTEM_SETTINGS.items():
            existing = (
                self.db.query(SystemSetting)
                .filter(
                    SystemSetting.tenant_id == tenant_id,
                    SystemSetting.setting_key == key,
                )
                .first()
            )
            if existing:
                continue
            self.db.add(
                SystemSetting(
                    tenant_id=tenant_id,
                    setting_scope="tenant" if tenant_id else "system",
                    setting_key=key,
                    value_json=value,
                    description=f"Default setting for {key}",
                    is_active=True,
                )
            )
        self.db.flush()

    def get(self, key: str, *, tenant_id: Optional[str] = None, default: Any = None) -> Any:
        if tenant_id:
            tenant_value = (
                self.db.query(SystemSetting)
                .filter(
                    SystemSetting.tenant_id == tenant_id,
                    SystemSetting.setting_key == key,
                    SystemSetting.is_active.is_(True),
                )
                .first()
            )
            if tenant_value is not None:
                return tenant_value.value_json

        system_value = (
            self.db.query(SystemSetting)
            .filter(
                SystemSetting.tenant_id.is_(None),
                SystemSetting.setting_key == key,
                SystemSetting.is_active.is_(True),
            )
            .first()
        )
        if system_value is not None:
            return system_value.value_json

        if key in DEFAULT_SYSTEM_SETTINGS:
            return DEFAULT_SYSTEM_SETTINGS[key]
        return default

    def set(
        self,
        key: str,
        value: Any,
        *,
        tenant_id: Optional[str] = None,
        description: Optional[str] = None,
    ) -> SystemSetting:
        row = (
            self.db.query(SystemSetting)
            .filter(
                SystemSetting.tenant_id == tenant_id,
                SystemSetting.setting_key == key,
            )
            .first()
        )

        if not row:
            row = SystemSetting(
                tenant_id=tenant_id,
                setting_scope="tenant" if tenant_id else "system",
                setting_key=key,
            )
            self.db.add(row)

        row.value_json = value
        row.description = description or row.description
        row.is_active = True
        self.db.flush()
        return row

    def list_settings(self, *, tenant_id: Optional[str] = None) -> list[SystemSetting]:
        rows = (
            self.db.query(SystemSetting)
            .filter(SystemSetting.tenant_id == tenant_id)
            .order_by(SystemSetting.setting_key.asc())
            .all()
        )
        return rows
