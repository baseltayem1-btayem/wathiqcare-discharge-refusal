"""
audit_logger.py
Immutable, hash-chained audit logging for WathiqCare workflows.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Iterable, List, Optional


class UserRole(str, Enum):
    DOCTOR = "DOCTOR"
    NURSE = "NURSE"
    LEGAL_OFFICER = "LEGAL_OFFICER"
    ADMIN = "ADMIN"


@dataclass(frozen=True)
class AuditEntry:
    entry_id: str
    timestamp: str
    actor_id: str
    actor_role: str
    event_category: str
    event_action: str
    resource_id: str
    resource_type: str
    outcome: str
    details: Optional[str]
    previous_hash: str
    entry_hash: str


class AuditLogger:
    def __init__(self) -> None:
        self._entries: List[AuditEntry] = []

    def log(
        self,
        actor_id: str,
        actor_role: UserRole | str,
        event_category: str,
        event_action: str,
        resource_id: str,
        resource_type: str,
        outcome: str = "SUCCESS",
        details: Optional[str] = None,
    ) -> AuditEntry:
        normalized_role = self._normalize_role(actor_role)
        previous_hash = self._entries[-1].entry_hash if self._entries else "GENESIS"
        timestamp = datetime.now(timezone.utc).isoformat()

        entry_id = str(uuid.uuid4())
        hash_payload = {
            "entry_id": entry_id,
            "timestamp": timestamp,
            "actor_id": actor_id,
            "actor_role": normalized_role,
            "event_category": event_category,
            "event_action": event_action,
            "resource_id": resource_id,
            "resource_type": resource_type,
            "outcome": outcome,
            "details": details,
            "previous_hash": previous_hash,
        }

        entry_hash = self._compute_hash(hash_payload)
        entry = AuditEntry(
            entry_id=entry_id,
            timestamp=timestamp,
            actor_id=actor_id,
            actor_role=normalized_role,
            event_category=event_category,
            event_action=event_action,
            resource_id=resource_id,
            resource_type=resource_type,
            outcome=outcome,
            details=details,
            previous_hash=previous_hash,
            entry_hash=entry_hash,
        )

        self._entries.append(entry)
        return entry

    def get_entries(
        self,
        requester_role: UserRole | str,
        *,
        event_category: Optional[str] = None,
        resource_id: Optional[str] = None,
    ) -> List[AuditEntry]:
        normalized_role = self._normalize_role(requester_role)
        self._ensure_read_permission(normalized_role, event_category)

        allowed_categories = self._allowed_categories(normalized_role)

        filtered = self._entries
        if event_category:
            filtered = [entry for entry in filtered if entry.event_category == event_category]
        elif normalized_role != UserRole.ADMIN.value:
            filtered = [entry for entry in filtered if entry.event_category in allowed_categories]

        if resource_id:
            filtered = [entry for entry in filtered if entry.resource_id == resource_id]

        return filtered

    def entry_count(self) -> int:
        return len(self._entries)

    def verify_chain(self) -> bool:
        previous_hash = "GENESIS"

        for entry in self._entries:
            if entry.previous_hash != previous_hash:
                return False

            hash_payload = {
                "entry_id": entry.entry_id,
                "timestamp": entry.timestamp,
                "actor_id": entry.actor_id,
                "actor_role": entry.actor_role,
                "event_category": entry.event_category,
                "event_action": entry.event_action,
                "resource_id": entry.resource_id,
                "resource_type": entry.resource_type,
                "outcome": entry.outcome,
                "details": entry.details,
                "previous_hash": entry.previous_hash,
            }
            expected = self._compute_hash(hash_payload)
            if expected != entry.entry_hash:
                return False

            previous_hash = entry.entry_hash

        return True

    def to_dicts(self) -> List[dict]:
        return [asdict(entry) for entry in self._entries]

    @staticmethod
    def _compute_hash(payload: dict) -> str:
        serialized = json.dumps(payload, sort_keys=True, ensure_ascii=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    @staticmethod
    def _normalize_role(role: UserRole | str) -> str:
        if isinstance(role, UserRole):
            return role.value
        normalized = str(role).strip().upper()
        if normalized not in {item.value for item in UserRole}:
            raise ValueError(f"Unsupported user role: {role}")
        return normalized

    @staticmethod
    def _allowed_categories(role: str) -> Iterable[str]:
        if role == UserRole.ADMIN.value:
            return {
                "SYSTEM",
                "DISCHARGE_ORDER",
                "REFUSAL_RECORD",
                "REFUSAL_FORM",
                "REFUSAL_DOCUMENTATION",
                "LEGAL_CASE",
                "ESCALATION",
                "ICD11_VALIDATION",
            }

        if role == UserRole.DOCTOR.value:
            return {"DISCHARGE_ORDER", "REFUSAL_RECORD", "ICD11_VALIDATION"}

        if role == UserRole.NURSE.value:
            return {"REFUSAL_RECORD", "REFUSAL_FORM"}

        if role == UserRole.LEGAL_OFFICER.value:
            return {"LEGAL_CASE", "ESCALATION", "REFUSAL_DOCUMENTATION"}

        return set()

    def _ensure_read_permission(self, role: str, event_category: Optional[str]) -> None:
        if role == UserRole.ADMIN.value:
            return

        if event_category is None:
            return

        allowed = set(self._allowed_categories(role))
        if event_category not in allowed:
            raise PermissionError(f"Role '{role}' cannot access event category '{event_category}'")
