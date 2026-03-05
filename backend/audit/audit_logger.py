"""
audit_logger.py
---------------
Immutable audit log and PDPL-compliant logging for the WathiqCare Discharge
Refusal Module.

Responsibilities:
- Immutable, append-only audit trail for every significant system event
- PDPL (Saudi Personal Data Protection Law) compliant logging
  (no sensitive PII in free-text fields; structured, traceable entries)
- Role-based access control enforcement (Doctor, Nurse, Legal Officer, Admin)
"""

from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional


# ---------------------------------------------------------------------------
# Role definitions
# ---------------------------------------------------------------------------

class UserRole(str, Enum):
    DOCTOR = "DOCTOR"
    NURSE = "NURSE"
    LEGAL_OFFICER = "LEGAL_OFFICER"
    ADMIN = "ADMIN"


# Mapping of roles to the audit event categories they are permitted to query.
_ROLE_READ_PERMISSIONS: dict[UserRole, set[str]] = {
    UserRole.DOCTOR: {"DISCHARGE_ORDER", "REFUSAL_RECORD", "ICD11_VALIDATION"},
    UserRole.NURSE: {"REFUSAL_RECORD", "REFUSAL_FORM"},
    UserRole.LEGAL_OFFICER: {
        "REFUSAL_RECORD",
        "LEGAL_CASE",
        "ESCALATION",
        "REFUSAL_FORM",
        "REFUSAL_DOCUMENTATION",
    },
    UserRole.ADMIN: {
        "DISCHARGE_ORDER",
        "REFUSAL_RECORD",
        "ICD11_VALIDATION",
        "REFUSAL_FORM",
        "LEGAL_CASE",
        "ESCALATION",
        "REFUSAL_DOCUMENTATION",
        "AUDIT_ACCESS",
        "SYSTEM",
    },
}


# ---------------------------------------------------------------------------
# Audit entry
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class AuditEntry:
    """
    An immutable audit log entry.

    ``frozen=True`` prevents accidental modification after creation.
    Each entry is linked to the previous one via ``previous_hash`` to form
    a tamper-evident chain.
    """

    entry_id: str
    timestamp: str           # ISO-8601 UTC
    actor_id: str            # User / system component that performed the action
    actor_role: str          # UserRole value
    event_category: str      # High-level category (e.g. "DISCHARGE_ORDER")
    event_action: str        # Specific action (e.g. "CREATE", "ESCALATE")
    resource_id: str         # ID of the affected resource
    resource_type: str       # Type of resource (e.g. "DischargeOrder")
    outcome: str             # "SUCCESS" or "FAILURE"
    previous_hash: str       # SHA-256 hash of the previous entry (chain link)
    entry_hash: str          # SHA-256 hash of this entry's canonical form


def _compute_entry_hash(
    entry_id: str,
    timestamp: str,
    actor_id: str,
    actor_role: str,
    event_category: str,
    event_action: str,
    resource_id: str,
    resource_type: str,
    outcome: str,
    previous_hash: str,
) -> str:
    canonical = json.dumps(
        {
            "entry_id": entry_id,
            "timestamp": timestamp,
            "actor_id": actor_id,
            "actor_role": actor_role,
            "event_category": event_category,
            "event_action": event_action,
            "resource_id": resource_id,
            "resource_type": resource_type,
            "outcome": outcome,
            "previous_hash": previous_hash,
        },
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Audit logger
# ---------------------------------------------------------------------------

class AuditLogger:
    """
    Append-only audit logger with hash-chaining for tamper evidence.

    PDPL compliance notes:
    - No free-text PII is stored in log entries; only opaque identifiers.
    - Every entry is linked via SHA-256 hashes forming a verifiable chain.
    - Role-based read access is enforced by :meth:`get_entries`.

    Usage::

        logger = AuditLogger()
        logger.log(
            actor_id="DR-042",
            actor_role=UserRole.DOCTOR,
            event_category="DISCHARGE_ORDER",
            event_action="CREATE",
            resource_id="ord-123",
            resource_type="DischargeOrder",
        )
    """

    def __init__(self) -> None:
        self._entries: List[AuditEntry] = []
        self._last_hash: str = "GENESIS"  # sentinel for the first entry

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def log(
        self,
        actor_id: str,
        actor_role: UserRole,
        event_category: str,
        event_action: str,
        resource_id: str,
        resource_type: str,
        outcome: str = "SUCCESS",
    ) -> AuditEntry:
        """Append an immutable audit entry to the log."""
        entry_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        entry_hash = _compute_entry_hash(
            entry_id=entry_id,
            timestamp=timestamp,
            actor_id=actor_id,
            actor_role=actor_role.value,
            event_category=event_category,
            event_action=event_action,
            resource_id=resource_id,
            resource_type=resource_type,
            outcome=outcome,
            previous_hash=self._last_hash,
        )
        entry = AuditEntry(
            entry_id=entry_id,
            timestamp=timestamp,
            actor_id=actor_id,
            actor_role=actor_role.value,
            event_category=event_category,
            event_action=event_action,
            resource_id=resource_id,
            resource_type=resource_type,
            outcome=outcome,
            previous_hash=self._last_hash,
            entry_hash=entry_hash,
        )
        self._entries.append(entry)
        self._last_hash = entry_hash
        return entry

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get_entries(
        self,
        requesting_role: UserRole,
        event_category: Optional[str] = None,
        actor_id: Optional[str] = None,
        resource_id: Optional[str] = None,
    ) -> List[AuditEntry]:
        """
        Return audit entries filtered by the caller's role permissions.

        Raises :class:`PermissionError` if the role has no read access to
        the requested category.
        """
        allowed_categories = _ROLE_READ_PERMISSIONS.get(requesting_role, set())

        if event_category and event_category not in allowed_categories:
            raise PermissionError(
                f"Role {requesting_role.value} is not permitted to read "
                f"audit entries in category '{event_category}'."
            )

        results = [
            e
            for e in self._entries
            if e.event_category in allowed_categories
        ]

        if event_category:
            results = [e for e in results if e.event_category == event_category]
        if actor_id:
            results = [e for e in results if e.actor_id == actor_id]
        if resource_id:
            results = [e for e in results if e.resource_id == resource_id]

        return results

    # ------------------------------------------------------------------
    # Verification
    # ------------------------------------------------------------------

    def verify_chain(self) -> bool:
        """
        Verify the integrity of the entire audit log chain.

        Returns ``True`` if all hashes are consistent; ``False`` if any
        entry has been tampered with.
        """
        previous_hash = "GENESIS"
        for entry in self._entries:
            if entry.previous_hash != previous_hash:
                return False
            expected_hash = _compute_entry_hash(
                entry_id=entry.entry_id,
                timestamp=entry.timestamp,
                actor_id=entry.actor_id,
                actor_role=entry.actor_role,
                event_category=entry.event_category,
                event_action=entry.event_action,
                resource_id=entry.resource_id,
                resource_type=entry.resource_type,
                outcome=entry.outcome,
                previous_hash=entry.previous_hash,
            )
            if entry.entry_hash != expected_hash:
                return False
            previous_hash = entry.entry_hash
        return True

    def entry_count(self) -> int:
        """Return the total number of audit entries."""
        return len(self._entries)
