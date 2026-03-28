# Canonical workflow constants migrated from backend/workflow/constants.py
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
