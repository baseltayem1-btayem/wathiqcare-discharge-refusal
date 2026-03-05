"""
escalation_engine.py
--------------------
Legal escalation engine for the WathiqCare Discharge Refusal Module.

Responsibilities:
- Automatically generate a legal case file when a patient refuses discharge
- Manage a structured escalation timeline (24 h → 48 h → 72 h)
- Notify the legal department at each escalation milestone
- Produce refusal documentation packages
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Callable, List, Optional


class EscalationTier(str, Enum):
    INITIAL = "INITIAL"        # case file generated
    TIER_24H = "TIER_24H"      # 24-hour follow-up
    TIER_48H = "TIER_48H"      # 48-hour escalation
    TIER_72H = "TIER_72H"      # 72-hour final escalation
    RESOLVED = "RESOLVED"
    WITHDRAWN = "WITHDRAWN"


@dataclass
class LegalCaseFile:
    """Legal case file generated when a patient refuses discharge."""

    case_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str = ""
    refusal_id: str = ""
    patient_id: str = ""
    physician_id: str = ""
    opened_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    tier: EscalationTier = EscalationTier.INITIAL
    tier_history: List[dict] = field(default_factory=list)
    legal_officer_id: Optional[str] = None
    resolution_notes: str = ""
    documents: List[str] = field(default_factory=list)  # document reference IDs


@dataclass
class NotificationEvent:
    """Represents a single notification dispatched to the legal department."""

    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    case_id: str = ""
    tier: EscalationTier = EscalationTier.INITIAL
    recipient: str = ""
    message: str = ""
    sent_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Escalation timeline configuration
# ---------------------------------------------------------------------------
_TIER_DELAYS: dict[EscalationTier, timedelta] = {
    EscalationTier.TIER_24H: timedelta(hours=24),
    EscalationTier.TIER_48H: timedelta(hours=48),
    EscalationTier.TIER_72H: timedelta(hours=72),
}


class EscalationEngine:
    """
    Manages the legal escalation lifecycle for discharge-refusal cases.

    Parameters
    ----------
    notify_callback:
        Optional callable invoked whenever a notification is dispatched.
        Receives a :class:`NotificationEvent` as its sole argument.  Useful
        for injecting email / messaging integrations during testing or in
        production.

    Usage::

        engine = EscalationEngine()
        case = engine.open_case(
            order_id="ord-123",
            refusal_id="ref-456",
            patient_id="P-001",
            physician_id="DR-042",
        )
        engine.escalate(case.case_id, EscalationTier.TIER_24H)
    """

    def __init__(
        self,
        notify_callback: Optional[Callable[[NotificationEvent], None]] = None,
    ) -> None:
        self._cases: dict[str, LegalCaseFile] = {}
        self._notifications: list[NotificationEvent] = []
        self._notify_callback = notify_callback

    # ------------------------------------------------------------------
    # Case management
    # ------------------------------------------------------------------

    def open_case(
        self,
        order_id: str,
        refusal_id: str,
        patient_id: str,
        physician_id: str,
        legal_officer_id: Optional[str] = None,
    ) -> LegalCaseFile:
        """Create and register a new legal case file."""
        case = LegalCaseFile(
            order_id=order_id,
            refusal_id=refusal_id,
            patient_id=patient_id,
            physician_id=physician_id,
            legal_officer_id=legal_officer_id,
        )
        case.tier_history.append(
            {"tier": EscalationTier.INITIAL, "at": case.opened_at.isoformat()}
        )
        self._cases[case.case_id] = case
        self._dispatch_notification(
            case,
            tier=EscalationTier.INITIAL,
            message=(
                f"Legal case {case.case_id} opened for patient {patient_id}. "
                "Discharge refused. Initial documentation required."
            ),
        )
        return case

    def get_case(self, case_id: str) -> LegalCaseFile:
        """Return the legal case file with the given ID."""
        try:
            return self._cases[case_id]
        except KeyError:
            raise KeyError(f"Legal case not found: {case_id}") from None

    def escalate(self, case_id: str, tier: EscalationTier) -> LegalCaseFile:
        """
        Advance a case to the given escalation tier.

        Only forward escalation is permitted (INITIAL → 24h → 48h → 72h).
        """
        case = self.get_case(case_id)
        _tier_order = list(EscalationTier)
        if _tier_order.index(tier) <= _tier_order.index(case.tier):
            raise ValueError(
                f"Cannot escalate from {case.tier} to {tier}: "
                "only forward escalation is allowed."
            )
        case.tier = tier
        case.tier_history.append(
            {"tier": tier, "at": datetime.now(timezone.utc).isoformat()}
        )
        delay = _TIER_DELAYS.get(tier)
        deadline = (
            (datetime.now(timezone.utc) + delay).isoformat() if delay else "N/A"
        )
        self._dispatch_notification(
            case,
            tier=tier,
            message=(
                f"Case {case_id} escalated to {tier.value}. "
                f"Legal action deadline: {deadline}."
            ),
        )
        return case

    def resolve_case(
        self, case_id: str, resolution_notes: str = ""
    ) -> LegalCaseFile:
        """Mark a case as resolved."""
        case = self.get_case(case_id)
        case.tier = EscalationTier.RESOLVED
        case.resolution_notes = resolution_notes
        case.tier_history.append(
            {"tier": EscalationTier.RESOLVED, "at": datetime.now(timezone.utc).isoformat()}
        )
        return case

    def withdraw_case(self, case_id: str) -> LegalCaseFile:
        """Mark a case as withdrawn (patient accepts discharge)."""
        case = self.get_case(case_id)
        case.tier = EscalationTier.WITHDRAWN
        case.tier_history.append(
            {"tier": EscalationTier.WITHDRAWN, "at": datetime.now(timezone.utc).isoformat()}
        )
        return case

    # ------------------------------------------------------------------
    # Documentation
    # ------------------------------------------------------------------

    def attach_document(self, case_id: str, document_ref: str) -> LegalCaseFile:
        """Attach a document reference ID to a legal case file."""
        case = self.get_case(case_id)
        case.documents.append(document_ref)
        return case

    def generate_refusal_documentation(self, case_id: str) -> dict:
        """
        Produce a structured refusal documentation package for the given case.

        Returns a dictionary suitable for serialisation to JSON / PDF.
        """
        case = self.get_case(case_id)
        return {
            "document_type": "DISCHARGE_REFUSAL_PACKAGE",
            "case_id": case.case_id,
            "order_id": case.order_id,
            "refusal_id": case.refusal_id,
            "patient_id": case.patient_id,
            "physician_id": case.physician_id,
            "opened_at": case.opened_at.isoformat(),
            "current_tier": case.tier.value,
            "tier_history": case.tier_history,
            "documents": case.documents,
            "resolution_notes": case.resolution_notes,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    # ------------------------------------------------------------------
    # Notifications
    # ------------------------------------------------------------------

    def get_notifications(self, case_id: Optional[str] = None) -> list[NotificationEvent]:
        """Return all notifications, optionally filtered by case ID."""
        if case_id:
            return [n for n in self._notifications if n.case_id == case_id]
        return list(self._notifications)

    def _dispatch_notification(
        self,
        case: LegalCaseFile,
        tier: EscalationTier,
        message: str,
    ) -> None:
        recipient = case.legal_officer_id or "legal-department"
        event = NotificationEvent(
            case_id=case.case_id,
            tier=tier,
            recipient=recipient,
            message=message,
        )
        self._notifications.append(event)
        if self._notify_callback:
            self._notify_callback(event)
