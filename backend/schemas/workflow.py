from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class CreateCaseRequest(BaseModel):
    patient_id: str
    patient_name: str
    mrn: str
    room_number: Optional[str] = None
    department: Optional[str] = None
    attending_physician_user_id: Optional[str] = None
    attending_physician_name: Optional[str] = None
    discharge_plan_summary: Optional[str] = None


class IssueDischargeOrderRequest(BaseModel):
    discharge_decision_date: Optional[datetime] = None
    discharge_plan_summary: str = ""
    comment: Optional[str] = None


class RequestPatientSignatureRequest(BaseModel):
    email: str
    language: str = "en"


class PatientDecisionRequest(BaseModel):
    response_payload: Dict[str, Any] = Field(default_factory=dict)


class CompleteStageTaskRequest(BaseModel):
    task_id: Optional[str] = None
    comment: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class CompleteTaskRequest(BaseModel):
    comment: Optional[str] = None


class WorkflowCaseResponse(BaseModel):
    id: str
    case_number: str
    patient_id: str
    patient_name: str
    mrn: str
    room_number: Optional[str]
    department: Optional[str]
    attending_physician_user_id: Optional[str]
    attending_physician_name: Optional[str]
    current_stage_code: str
    status: str
    discharge_decision_date: Optional[datetime]
    discharge_plan_summary: Optional[str]
    refusal_reason: Optional[str]
    accepted_at: Optional[datetime]
    refused_at: Optional[datetime]
    created_by: str
    created_at: datetime
    updated_at: datetime


class WorkflowTaskResponse(BaseModel):
    id: str
    case_id: str
    stage_code: str
    task_code: str
    title: str
    description: Optional[str]
    assigned_user_id: Optional[str]
    assigned_team_code: Optional[str]
    assigned_department_code: Optional[str]
    assigned_role_code: Optional[str]
    escalation_department_code: Optional[str]
    status: str
    priority: str
    due_at: Optional[datetime]
    completed_at: Optional[datetime]
    escalation_level: int
    metadata_json: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime


class NotificationResponse(BaseModel):
    id: str
    case_id: Optional[str]
    task_id: Optional[str]
    recipient_user_id: Optional[str]
    recipient_email: Optional[str]
    recipient_team_code: Optional[str]
    recipient_department_code: Optional[str]
    channel: str
    notification_type: str
    title: str
    body: str
    status: str
    sent_at: Optional[datetime]
    read_at: Optional[datetime]
    error_message: Optional[str]
    metadata_json: Optional[Dict[str, Any]]
    created_at: datetime


class AuditLogResponse(BaseModel):
    id: str
    case_id: Optional[str]
    task_id: Optional[str]
    actor_user_id: Optional[str]
    actor_role: Optional[str]
    actor_department_code: Optional[str]
    actor_ip: Optional[str]
    entity_type: str
    entity_id: Optional[str]
    event_type: str
    event_title: str
    event_details: Optional[str]
    payload_summary: Optional[str]
    previous_hash: Optional[str]
    immutable_hash: Optional[str]
    metadata_json: Optional[Dict[str, Any]]
    created_at: datetime


class WorkflowTimelineResponse(BaseModel):
    case_id: str
    events: List[AuditLogResponse]


class WorkflowCaseListResponse(BaseModel):
    items: List[WorkflowCaseResponse]
