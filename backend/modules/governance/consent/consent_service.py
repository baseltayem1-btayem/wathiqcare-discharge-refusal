VALID_TRANSITIONS = {
    "DRAFT": {"READY_FOR_REVIEW", "REJECTED"},
    "READY_FOR_REVIEW": {"READY_FOR_SIGNATURE", "REJECTED"},
    "READY_FOR_SIGNATURE": {"SIGNATURE_PENDING", "REJECTED"},
    "SIGNATURE_PENDING": {"SIGNED", "REJECTED"},
    "SIGNED": {"ARCHIVED", "REVOKED", "EXPIRED"},
    "ARCHIVED": set(),
    "REJECTED": set(),
    "REVOKED": set(),
    "EXPIRED": set(),
}


def can_transition(current_status: str, next_status: str) -> bool:
    return next_status in VALID_TRANSITIONS.get(current_status, set())
