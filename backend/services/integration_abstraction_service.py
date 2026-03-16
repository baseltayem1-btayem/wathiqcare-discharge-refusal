from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.integration.emr_connector import InMemoryEMRConnector
from backend.models.integration_config import IntegrationConfig


@dataclass
class IntegrationExecutionResult:
    success: bool
    integration_key: str
    status: str
    response_payload: Dict[str, Any]
    attempted_at: str


class IExternalIntegrationService(ABC):
    @abstractmethod
    def execute(self, *, config: IntegrationConfig, operation: str, payload: Dict[str, Any]) -> IntegrationExecutionResult:
        pass


class NoopExternalIntegrationService(IExternalIntegrationService):
    def execute(self, *, config: IntegrationConfig, operation: str, payload: Dict[str, Any]) -> IntegrationExecutionResult:
        return IntegrationExecutionResult(
            success=True,
            integration_key=config.integration_key,
            status="noop",
            response_payload={
                "operation": operation,
                "payload": payload,
                "message": "No-op integration adapter executed",
            },
            attempted_at=datetime.utcnow().isoformat(),
        )


class EmrHisIntegrationService(IExternalIntegrationService):
    def __init__(self) -> None:
        self._connector = InMemoryEMRConnector()

    def execute(self, *, config: IntegrationConfig, operation: str, payload: Dict[str, Any]) -> IntegrationExecutionResult:
        if operation == "fetch_patient":
            mrn = str(payload.get("mrn") or payload.get("patient_id") or "")
            patient = self._connector.fetch_patient(mrn)
            if not patient:
                patient = {
                    "id": mrn,
                    "mrn": mrn,
                    "name": f"Patient {mrn}",
                    "birthDate": "1985-01-01",
                    "gender": "unknown",
                }
                self._connector.seed_patient(patient)
            return IntegrationExecutionResult(
                success=True,
                integration_key=config.integration_key,
                status="ok",
                response_payload={"patient": patient},
                attempted_at=datetime.utcnow().isoformat(),
            )

        return IntegrationExecutionResult(
            success=True,
            integration_key=config.integration_key,
            status="unsupported_operation",
            response_payload={
                "message": f"Operation '{operation}' is not implemented in EMR adapter",
            },
            attempted_at=datetime.utcnow().isoformat(),
        )


class IntegrationConfigService:
    def __init__(self, db: Session):
        self.db = db

    def list_configs(self, *, tenant_id: str) -> list[IntegrationConfig]:
        return (
            self.db.query(IntegrationConfig)
            .filter(IntegrationConfig.tenant_id == tenant_id)
            .order_by(IntegrationConfig.integration_key.asc())
            .all()
        )

    def upsert_config(
        self,
        *,
        tenant_id: str,
        integration_key: str,
        integration_type: str,
        endpoint_url: str,
        auth_type: str,
        status: str,
        secret_reference: Optional[str] = None,
        retry_policy_json: Optional[Dict[str, Any]] = None,
        timeout_seconds: int = 30,
        headers_json: Optional[Dict[str, Any]] = None,
        provider_name: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> IntegrationConfig:
        row = (
            self.db.query(IntegrationConfig)
            .filter(
                IntegrationConfig.tenant_id == tenant_id,
                IntegrationConfig.integration_key == integration_key,
            )
            .first()
        )
        if not row:
            row = IntegrationConfig(
                tenant_id=tenant_id,
                integration_key=integration_key,
            )
            self.db.add(row)

        row.integration_type = integration_type
        row.endpoint_url = endpoint_url
        row.auth_type = auth_type
        row.status = status
        row.secret_reference = secret_reference
        row.retry_policy_json = retry_policy_json
        row.timeout_seconds = timeout_seconds
        row.headers_json = headers_json
        row.provider_name = provider_name
        row.created_by = created_by
        self.db.flush()
        return row


class IntegrationDispatcher:
    def __init__(self, db: Session):
        self.db = db
        self.config_service = IntegrationConfigService(db)
        self._adapters: Dict[str, IExternalIntegrationService] = {
            "emr_his": EmrHisIntegrationService(),
            "hl7": NoopExternalIntegrationService(),
            "fhir": NoopExternalIntegrationService(),
            "insurance": NoopExternalIntegrationService(),
            "government_reporting": NoopExternalIntegrationService(),
            "e_signature": NoopExternalIntegrationService(),
            "payment_billing": NoopExternalIntegrationService(),
            "notification_gateway": NoopExternalIntegrationService(),
        }

    def register_adapter(self, integration_type: str, adapter: IExternalIntegrationService) -> None:
        self._adapters[integration_type] = adapter

    def dispatch(
        self,
        *,
        tenant_id: str,
        integration_key: str,
        operation: str,
        payload: Dict[str, Any],
    ) -> IntegrationExecutionResult:
        config = (
            self.db.query(IntegrationConfig)
            .filter(
                IntegrationConfig.tenant_id == tenant_id,
                IntegrationConfig.integration_key == integration_key,
            )
            .first()
        )
        if not config:
            raise ValueError(f"Integration config '{integration_key}' is not defined")
        if config.status.lower() not in {"active", "enabled"}:
            raise ValueError(f"Integration '{integration_key}' is not active")

        adapter = self._adapters.get(config.integration_type)
        if not adapter:
            raise ValueError(f"No adapter registered for integration type '{config.integration_type}'")

        return adapter.execute(config=config, operation=operation, payload=payload)
