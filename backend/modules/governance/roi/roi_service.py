ROI_TRANSITIONS = {
    "DRAFT": {"IDENTITY_PENDING"},
    "IDENTITY_PENDING": {"READY_FOR_REVIEW", "REJECTED"},
    "READY_FOR_REVIEW": {"APPROVED", "REJECTED"},
    "APPROVED": {"RELEASED", "REJECTED"},
    "RELEASED": {"ARCHIVED"},
    "REJECTED": set(),
    "ARCHIVED": set(),
}


def can_transition(current_status: str, next_status: str) -> bool:
    return next_status in ROI_TRANSITIONS.get(current_status, set())
