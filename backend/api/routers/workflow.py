from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from backend.api.deps import get_current_user
from backend.core.database import SessionLocal
from backend.models.discharge_case import DischargeCase
from backend.models.workflow_audit_log import WorkflowAuditLog
from backend.models.workflow_notification import WorkflowNotification
from backend.models.workflow_task import WorkflowTask
from backend.schemas.workflow import (
    AuditLogResponse,
    CompleteStageTaskRequest,
    CompleteTaskRequest,
    CreateCaseRequest,
    IssueDischargeOrderRequest,
    NotificationResponse,
    PatientDecisionRequest,
    RequestPatientSignatureRequest,
    WorkflowCaseListResponse,
    WorkflowCaseResponse,
    WorkflowTaskResponse,
    WorkflowTimelineResponse,
)
from backend.services.audit_service import AuditService
from backend.services.notification_service import NotificationService
from backend.services.task_service import TaskService
from backend.services.workflow_engine import WorkflowEngineService
from backend.workflow.constants import StageCode

router = APIRouter(prefix="/api/workflow", tags=["Workflow Engine"])


def _db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _as_case_response(row: DischargeCase) -> WorkflowCaseResponse:
    return WorkflowCaseResponse(
        id=row.id,
        case_number=row.case_number or "",
        patient_id=row.patient_id,
        patient_name=row.patient_name or "",
        mrn=row.mrn or "",
        room_number=row.room_number,
        department=row.department,
        attending_physician_user_id=row.attending_physician_user_id,
        attending_physician_name=row.attending_physician_name,
        current_stage_code=row.current_stage_code or "",
        status=row.status,
        discharge_decision_date=row.discharge_decision_date,
        discharge_plan_summary=row.discharge_plan_summary,
        refusal_reason=row.refusal_reason,
        accepted_at=row.accepted_at,
        refused_at=row.refused_at,
        created_by=row.created_by,
        created_at=row.created_at,
        updated_at=row.updated_at or row.created_at,
    )


def _as_task_response(row: WorkflowTask) -> WorkflowTaskResponse:
    return WorkflowTaskResponse(
        id=row.id,
        case_id=row.case_id,
        stage_code=row.stage_code,
        task_code=row.task_code,
        title=row.title,
        description=row.description,
        assigned_user_id=row.assigned_user_id,
        assigned_team_code=row.assigned_team_code,
        assigned_department_code=row.assigned_department_code,
        assigned_role_code=row.assigned_role_code,
        escalation_department_code=row.escalation_department_code,
        status=row.status,
        priority=row.priority,
        due_at=row.due_at,
        completed_at=row.completed_at,
        escalation_level=row.escalation_level,
        metadata_json=row.metadata_json,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _as_notification_response(row: WorkflowNotification) -> NotificationResponse:
    return NotificationResponse(
        id=row.id,
        case_id=row.case_id,
        task_id=row.task_id,
        recipient_user_id=row.recipient_user_id,
        recipient_email=row.recipient_email,
        recipient_team_code=row.recipient_team_code,
        recipient_department_code=row.recipient_department_code,
        channel=row.channel,
        notification_type=row.notification_type,
        title=row.title,
        body=row.body,
        status=row.status,
        sent_at=row.sent_at,
        read_at=row.read_at,
        error_message=row.error_message,
        metadata_json=row.metadata_json,
        created_at=row.created_at,
    )


def _as_audit_response(row: WorkflowAuditLog) -> AuditLogResponse:
    return AuditLogResponse(
        id=row.id,
        case_id=row.case_id,
        task_id=row.task_id,
        actor_user_id=row.actor_user_id,
        actor_role=row.actor_role,
        actor_department_code=row.actor_department_code,
        actor_ip=row.actor_ip,
        entity_type=row.entity_type,
        entity_id=row.entity_id,
        event_type=row.event_type,
        event_title=row.event_title,
        event_details=row.event_details,
        payload_summary=row.payload_summary,
        previous_hash=row.previous_hash,
        immutable_hash=row.immutable_hash,
        metadata_json=row.metadata_json,
        created_at=row.created_at,
    )


@router.post("/cases", response_model=WorkflowCaseResponse)
def create_case(payload: CreateCaseRequest, current_user=Depends(get_current_user), db=Depends(_db_session)):
    try:
        engine = WorkflowEngineService(db)
        case = engine.create_case(
            tenant_id=current_user["tenant_id"],
            created_by=current_user["id"],
            patient_id=payload.patient_id,
            patient_name=payload.patient_name,
            mrn=payload.mrn,
            room_number=payload.room_number,
            department=payload.department,
            attending_physician_user_id=payload.attending_physician_user_id,
            attending_physician_name=payload.attending_physician_name,
            discharge_plan_summary=payload.discharge_plan_summary,
        )
        db.refresh(case)
        return _as_case_response(case)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/cases", response_model=WorkflowCaseListResponse)
def list_cases(current_user=Depends(get_current_user), db=Depends(_db_session)):
    rows = (
        db.query(DischargeCase)
        .filter(DischargeCase.tenant_id == current_user["tenant_id"])
        .order_by(DischargeCase.created_at.desc())
        .all()
    )
    return WorkflowCaseListResponse(items=[_as_case_response(row) for row in rows])


@router.get("/cases/{case_id}", response_model=WorkflowCaseResponse)
def get_case(case_id: str, current_user=Depends(get_current_user), db=Depends(_db_session)):
    row = (
        db.query(DischargeCase)
        .filter(DischargeCase.id == case_id, DischargeCase.tenant_id == current_user["tenant_id"])
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")
    return _as_case_response(row)


@router.get("/cases/{case_id}/timeline", response_model=WorkflowTimelineResponse)
def get_case_timeline(case_id: str, current_user=Depends(get_current_user), db=Depends(_db_session)):
    events = (
        db.query(WorkflowAuditLog)
        .join(DischargeCase, DischargeCase.id == WorkflowAuditLog.case_id)
        .filter(
            DischargeCase.tenant_id == current_user["tenant_id"],
            WorkflowAuditLog.case_id == case_id,
        )
        .order_by(WorkflowAuditLog.created_at.asc())
        .all()
    )
    return WorkflowTimelineResponse(case_id=case_id, events=[_as_audit_response(item) for item in events])


@router.get("/cases/{case_id}/tasks", response_model=list[WorkflowTaskResponse])
def get_case_tasks(case_id: str, current_user=Depends(get_current_user), db=Depends(_db_session)):
    rows = (
        db.query(WorkflowTask)
        .join(DischargeCase, DischargeCase.id == WorkflowTask.case_id)
        .filter(DischargeCase.tenant_id == current_user["tenant_id"], WorkflowTask.case_id == case_id)
        .order_by(WorkflowTask.created_at.desc())
        .all()
    )
    return [_as_task_response(row) for row in rows]


@router.get("/cases/{case_id}/notifications", response_model=list[NotificationResponse])
def get_case_notifications(case_id: str, current_user=Depends(get_current_user), db=Depends(_db_session)):
    rows = (
        db.query(WorkflowNotification)
        .join(DischargeCase, DischargeCase.id == WorkflowNotification.case_id)
        .filter(DischargeCase.tenant_id == current_user["tenant_id"], WorkflowNotification.case_id == case_id)
        .order_by(WorkflowNotification.created_at.desc())
        .all()
    )
    return [_as_notification_response(row) for row in rows]


@router.post("/cases/{case_id}/issue-discharge-order", response_model=WorkflowCaseResponse)
def issue_discharge_order(
    case_id: str,
    payload: IssueDischargeOrderRequest,
    current_user=Depends(get_current_user),
    db=Depends(_db_session),
):
    try:
        engine = WorkflowEngineService(db)
        case = engine.issue_discharge_order(
            case_id,
            current_user["tenant_id"],
            current_user["id"],
            current_user.get("role"),
            {
                "discharge_decision_date": payload.discharge_decision_date or datetime.utcnow(),
                "discharge_plan_summary": payload.discharge_plan_summary,
                "comment": payload.comment,
            },
        )
        db.refresh(case)
        return _as_case_response(case)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/cases/{case_id}/request-patient-signature", response_model=WorkflowCaseResponse)
def request_patient_signature(
    case_id: str,
    payload: RequestPatientSignatureRequest,
    current_user=Depends(get_current_user),
    db=Depends(_db_session),
):
    try:
        engine = WorkflowEngineService(db)
        case = engine.send_to_patient_for_signature(
            case_id=case_id,
            tenant_id=current_user["tenant_id"],
            actor_user_id=current_user["id"],
            email=payload.email,
            language=payload.language,
            actor_role=current_user.get("role"),
            actor_department_code=current_user.get("department_code"),
        )
        db.refresh(case)
        return _as_case_response(case)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/cases/{case_id}/patient-accepted", response_model=WorkflowCaseResponse)
def patient_accepted(
    case_id: str,
    payload: PatientDecisionRequest,
    current_user=Depends(get_current_user),
    db=Depends(_db_session),
):
    try:
        engine = WorkflowEngineService(db)
        case = engine.mark_patient_accepted(
            case_id,
            current_user["tenant_id"],
            current_user["id"],
            current_user.get("role"),
            payload.response_payload,
        )
        db.refresh(case)
        return _as_case_response(case)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/cases/{case_id}/patient-refused", response_model=WorkflowCaseResponse)
def patient_refused(
    case_id: str,
    payload: PatientDecisionRequest,
    current_user=Depends(get_current_user),
    db=Depends(_db_session),
):
    try:
        engine = WorkflowEngineService(db)
        case = engine.mark_patient_refused(
            case_id,
            current_user["tenant_id"],
            current_user["id"],
            current_user.get("role"),
            payload.response_payload,
        )
        db.refresh(case)
        return _as_case_response(case)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


def _complete_stage(case_id: str, stage_code: str, payload: CompleteStageTaskRequest, current_user, db):
    engine = WorkflowEngineService(db)
    case = engine.complete_stage_task(
        case_id=case_id,
        tenant_id=current_user["tenant_id"],
        stage_code=stage_code,
        actor_user_id=current_user["id"],
        actor_role=current_user.get("role"),
        payload={"task_id": payload.task_id, "comment": payload.comment, **payload.payload},
    )
    db.refresh(case)
    return _as_case_response(case)


@router.post("/cases/{case_id}/complete-patient-relations", response_model=WorkflowCaseResponse)
def complete_patient_relations(case_id: str, payload: CompleteStageTaskRequest, current_user=Depends(get_current_user), db=Depends(_db_session)):
    try:
        return _complete_stage(case_id, StageCode.PATIENT_RELATIONS_REVIEW, payload, current_user, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/cases/{case_id}/complete-social-work", response_model=WorkflowCaseResponse)
def complete_social_work(case_id: str, payload: CompleteStageTaskRequest, current_user=Depends(get_current_user), db=Depends(_db_session)):
    try:
        return _complete_stage(case_id, StageCode.SOCIAL_WORK_REVIEW, payload, current_user, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/cases/{case_id}/complete-finance", response_model=WorkflowCaseResponse)
def complete_finance(case_id: str, payload: CompleteStageTaskRequest, current_user=Depends(get_current_user), db=Depends(_db_session)):
    try:
        return _complete_stage(case_id, StageCode.FINANCE_REVIEW, payload, current_user, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/cases/{case_id}/complete-legal", response_model=WorkflowCaseResponse)
def complete_legal(case_id: str, payload: CompleteStageTaskRequest, current_user=Depends(get_current_user), db=Depends(_db_session)):
    try:
        return _complete_stage(case_id, StageCode.LEGAL_ESCALATION, payload, current_user, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/cases/{case_id}/close", response_model=WorkflowCaseResponse)
def close_case(case_id: str, current_user=Depends(get_current_user), db=Depends(_db_session)):
    try:
        engine = WorkflowEngineService(db)
        case = engine.close_case(case_id, current_user["tenant_id"], current_user["id"], current_user.get("role"))
        db.refresh(case)
        return _as_case_response(case)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/tasks/my", response_model=list[WorkflowTaskResponse])
def my_tasks(current_user=Depends(get_current_user), db=Depends(_db_session)):
    rows = TaskService(db).get_open_tasks_for_user(current_user["id"])
    return [_as_task_response(row) for row in rows]


@router.get("/tasks/team/{team_code}", response_model=list[WorkflowTaskResponse])
def team_tasks(team_code: str, current_user=Depends(get_current_user), db=Depends(_db_session)):
    rows = TaskService(db).get_open_tasks_for_team(team_code)
    return [_as_task_response(row) for row in rows]


@router.get("/tasks/department/{department_code}", response_model=list[WorkflowTaskResponse])
def department_tasks(department_code: str, current_user=Depends(get_current_user), db=Depends(_db_session)):
    _ = current_user
    rows = TaskService(db).get_open_tasks_for_department(department_code)
    return [_as_task_response(row) for row in rows]


@router.post("/tasks/{task_id}/complete", response_model=WorkflowTaskResponse)
def complete_task(task_id: str, payload: CompleteTaskRequest, current_user=Depends(get_current_user), db=Depends(_db_session)):
    try:
        with db.begin():
            row = TaskService(db).complete_task(
                task_id=task_id,
                actor_user_id=current_user["id"],
                comment=payload.comment,
            )
            AuditService(db).log(
                case_id=row.case_id,
                task_id=row.id,
                actor_user_id=current_user["id"],
                actor_role=current_user.get("role"),
                actor_department_code=row.assigned_department_code,
                entity_type="workflow_task",
                entity_id=row.id,
                event_type="task_completed",
                event_title="Task Completed",
                event_details=payload.comment,
                payload_summary=(payload.comment or "task completed")[:500],
            )
        db.refresh(row)
        return _as_task_response(row)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/tasks/process-overdue")
def process_overdue(current_user=Depends(get_current_user), db=Depends(_db_session)):
    with db.begin():
        overdue_rows = TaskService(db).process_overdue_tasks()
        notif = NotificationService(db)
        audit = AuditService(db)
        for row in overdue_rows:
            notif.create_in_app_notification(
                case_id=row.case_id,
                task_id=row.id,
                recipient_user_id=row.assigned_user_id,
                recipient_team_code=row.assigned_team_code,
                recipient_department_code=row.assigned_department_code,
                notification_type="task_overdue",
                title="Task overdue",
                body=f"Task {row.title} is overdue.",
                metadata_json={"escalation_level": row.escalation_level},
            )
            if row.escalation_level >= 2 and row.assigned_role_code:
                notif.notify_case_escalated(
                    case_id=row.case_id,
                    recipient_team_code=row.assigned_role_code,
                    recipient_department_code=row.escalation_department_code,
                    body=f"Overdue task escalated: {row.title}",
                )
            audit.log(
                case_id=row.case_id,
                task_id=row.id,
                actor_user_id=current_user["id"],
                actor_role=current_user.get("role"),
                actor_department_code=row.assigned_department_code,
                entity_type="workflow_task",
                entity_id=row.id,
                event_type="task_overdue",
                event_title="Task Overdue",
                event_details=f"Task {row.id} marked overdue",
                payload_summary=f"task={row.id};escalation_level={row.escalation_level}",
                metadata_json={"escalation_level": row.escalation_level},
            )
    return {"processed": len(overdue_rows)}


@router.get("/notifications/my", response_model=list[NotificationResponse])
def my_notifications(current_user=Depends(get_current_user), db=Depends(_db_session)):
    role = current_user.get("role")
    rows = NotificationService(db).list_notifications_for_user(
        user_id=current_user["id"],
        team_code=role,
        department_code=current_user.get("department_code"),
    )
    return [_as_notification_response(row) for row in rows]


@router.post("/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(notification_id: str, current_user=Depends(get_current_user), db=Depends(_db_session)):
    try:
        with db.begin():
            row = NotificationService(db).mark_notification_read(notification_id=notification_id)
        db.refresh(row)
        return _as_notification_response(row)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
