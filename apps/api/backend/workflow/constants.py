from __future__ import annotations

from datetime import timedelta


class StageCode:
    NURSE_DRAFT = "nurse_draft"
    PENDING_PHYSICIAN_ORDER = "pending_physician_order"
    PENDING_PATIENT_SIGNATURE = "pending_patient_signature"
    ACCEPTED_DISCHARGE_EXECUTION = "accepted_discharge_execution"
    PATIENT_RELATIONS_REVIEW = "patient_relations_review"
    SOCIAL_WORK_REVIEW = "social_work_review"
    FINANCE_REVIEW = "finance_review"
    LEGAL_ESCALATION = "legal_escalation"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class CaseStatus:
    ACTIVE = "active"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class TaskStatus:
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"


class TaskPriority:
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class NotificationChannel:
    IN_APP = "in_app"
    EMAIL = "email"


class NotificationStatus:
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    READ = "read"


class EventCode:
    CASE_CREATED = "case_created"
    DISCHARGE_ORDER_ISSUED = "discharge_order_issued"
    PATIENT_SIGNATURE_REQUESTED = "patient_signature_requested"
    PATIENT_ACCEPTED = "patient_accepted"
    PATIENT_REFUSED = "patient_refused"
    STAGE_TASK_COMPLETED = "stage_task_completed"
    STAGE_CHANGED = "stage_changed"
    CASE_ESCALATED = "case_escalated"
    TASK_OVERDUE = "task_overdue"
    CASE_CLOSED = "case_closed"


class ActionCode:
    CREATE_CASE = "create_case"
    ISSUE_DISCHARGE_ORDER = "issue_discharge_order"
    PATIENT_ACCEPTS = "patient_accepts"
    PATIENT_REFUSES = "patient_refuses"
    COMPLETE_PATIENT_RELATIONS = "complete_patient_relations"
    COMPLETE_SOCIAL_WORK = "complete_social_work"
    COMPLETE_FINANCE = "complete_finance"
    CLOSE_CASE = "close_case"
    CLOSE_LEGAL_ESCALATION = "close_legal_escalation"


DEFAULT_SLA_BY_STAGE = {
    StageCode.PENDING_PHYSICIAN_ORDER: timedelta(hours=6),
    StageCode.PENDING_PATIENT_SIGNATURE: timedelta(hours=8),
    StageCode.ACCEPTED_DISCHARGE_EXECUTION: timedelta(hours=24),
    StageCode.PATIENT_RELATIONS_REVIEW: timedelta(hours=6),
    StageCode.SOCIAL_WORK_REVIEW: timedelta(hours=8),
    StageCode.FINANCE_REVIEW: timedelta(hours=8),
    StageCode.LEGAL_ESCALATION: timedelta(hours=12),
}


DEFAULT_TEAM_BY_STAGE = {
    StageCode.PENDING_PHYSICIAN_ORDER: "physician",
    StageCode.PENDING_PATIENT_SIGNATURE: "nursing",
    StageCode.ACCEPTED_DISCHARGE_EXECUTION: "discharge_coordination",
    StageCode.PATIENT_RELATIONS_REVIEW: "patient_relations",
    StageCode.SOCIAL_WORK_REVIEW: "social_work",
    StageCode.FINANCE_REVIEW: "finance",
    StageCode.LEGAL_ESCALATION: "legal",
}


DEFAULT_ROLE_BY_STAGE = {
    StageCode.PENDING_PHYSICIAN_ORDER: "doctor",
    StageCode.PENDING_PATIENT_SIGNATURE: "nursing",
    StageCode.ACCEPTED_DISCHARGE_EXECUTION: "case_manager",
    StageCode.PATIENT_RELATIONS_REVIEW: "patient_affairs",
    StageCode.SOCIAL_WORK_REVIEW: "social_services",
    StageCode.FINANCE_REVIEW: "finance",
    StageCode.LEGAL_ESCALATION: "legal_admin",
}
