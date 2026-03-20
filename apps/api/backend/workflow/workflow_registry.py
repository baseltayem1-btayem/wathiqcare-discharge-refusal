"""Configurable workflow state registry for discharge-refusal orchestration."""

from __future__ import annotations

from enum import Enum
from typing import Dict, Iterable, Mapping, Set


class WorkflowState(str, Enum):
    CASE_CREATED = "CASE_CREATED"
    DISCHARGE_ORDERED = "DISCHARGE_ORDERED"
    REFUSAL_RECORDED = "REFUSAL_RECORDED"
    SOCIAL_REVIEW = "SOCIAL_REVIEW"
    ESCALATION_TRIGGERED = "ESCALATION_TRIGGERED"
    LEGAL_REVIEW = "LEGAL_REVIEW"
    CASE_CLOSED = "CASE_CLOSED"


DEFAULT_TRANSITIONS: Dict[WorkflowState, Set[WorkflowState]] = {
    WorkflowState.CASE_CREATED: {WorkflowState.DISCHARGE_ORDERED},
    WorkflowState.DISCHARGE_ORDERED: {WorkflowState.REFUSAL_RECORDED, WorkflowState.CASE_CLOSED},
    WorkflowState.REFUSAL_RECORDED: {
        WorkflowState.SOCIAL_REVIEW,
        WorkflowState.ESCALATION_TRIGGERED,
        WorkflowState.CASE_CLOSED,
    },
    WorkflowState.SOCIAL_REVIEW: {
        WorkflowState.ESCALATION_TRIGGERED,
        WorkflowState.CASE_CLOSED,
    },
    WorkflowState.ESCALATION_TRIGGERED: {WorkflowState.LEGAL_REVIEW, WorkflowState.CASE_CLOSED},
    WorkflowState.LEGAL_REVIEW: {WorkflowState.CASE_CLOSED},
    WorkflowState.CASE_CLOSED: set(),
}


class WorkflowRegistry:
    """Registry that validates and resolves discharge-refusal workflow transitions."""

    def __init__(
        self,
        transitions: Mapping[WorkflowState, Iterable[WorkflowState]] | None = None,
        initial_state: WorkflowState = WorkflowState.CASE_CREATED,
    ) -> None:
        source = transitions or DEFAULT_TRANSITIONS
        self._transitions: Dict[WorkflowState, Set[WorkflowState]] = {
            state: set(next_states) for state, next_states in source.items()
        }
        self._initial_state = initial_state

    @property
    def initial_state(self) -> WorkflowState:
        return self._initial_state

    def all_states(self) -> list[WorkflowState]:
        return list(self._transitions.keys())

    def next_states(self, state: WorkflowState) -> Set[WorkflowState]:
        return set(self._transitions.get(state, set()))

    def can_transition(self, current: WorkflowState, target: WorkflowState) -> bool:
        if current == target:
            return True
        return target in self._transitions.get(current, set())

    def ensure_transition(self, current: WorkflowState, target: WorkflowState) -> None:
        if not self.can_transition(current, target):
            allowed = sorted(state.value for state in self.next_states(current))
            raise ValueError(
                f"Invalid workflow transition {current.value} -> {target.value}. Allowed: {allowed}"
            )
