from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.models.workflow_task import WorkflowTask
from backend.workflow.constants import TaskStatus


class TaskService:
    def __init__(self, db: Session):
        self.db = db

    def create_task(
        self,
        *,
        case_id: str,
        stage_code: str,
        task_code: str,
        title: str,
        description: Optional[str] = None,
        assigned_user_id: Optional[str] = None,
        assigned_team_code: Optional[str] = None,
        assigned_role_code: Optional[str] = None,
        priority: str = "medium",
        due_at: Optional[datetime] = None,
        parent_task_id: Optional[str] = None,
        metadata_json: Optional[Dict[str, Any]] = None,
    ) -> WorkflowTask:
        task = WorkflowTask(
            case_id=case_id,
            stage_code=stage_code,
            task_code=task_code,
            title=title,
            description=description,
            assigned_user_id=assigned_user_id,
            assigned_team_code=assigned_team_code,
            assigned_role_code=assigned_role_code,
            status=TaskStatus.PENDING,
            priority=priority,
            due_at=due_at,
            parent_task_id=parent_task_id,
            metadata_json=metadata_json,
        )
        self.db.add(task)
        self.db.flush()
        return task

    def complete_task(self, *, task_id: str, actor_user_id: str, comment: Optional[str] = None) -> WorkflowTask:
        task = self.db.query(WorkflowTask).filter(WorkflowTask.id == task_id).first()
        if not task:
            raise ValueError("Task not found")
        if task.status == TaskStatus.COMPLETED:
            return task

        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.utcnow()
        task.completed_by = actor_user_id
        task.updated_at = datetime.utcnow()
        metadata = dict(task.metadata_json or {})
        if comment:
            metadata["completion_comment"] = comment
        task.metadata_json = metadata
        self.db.flush()
        return task

    def get_open_tasks_for_user(self, user_id: str) -> list[WorkflowTask]:
        return (
            self.db.query(WorkflowTask)
            .filter(
                WorkflowTask.assigned_user_id == user_id,
                WorkflowTask.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.OVERDUE]),
            )
            .order_by(WorkflowTask.created_at.desc())
            .all()
        )

    def get_open_tasks_for_team(self, team_code: str) -> list[WorkflowTask]:
        return (
            self.db.query(WorkflowTask)
            .filter(
                WorkflowTask.assigned_team_code == team_code,
                WorkflowTask.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.OVERDUE]),
            )
            .order_by(WorkflowTask.created_at.desc())
            .all()
        )

    def close_open_tasks_for_stage(self, *, case_id: str, stage_code: str, actor_user_id: Optional[str]) -> list[WorkflowTask]:
        open_tasks = (
            self.db.query(WorkflowTask)
            .filter(
                WorkflowTask.case_id == case_id,
                WorkflowTask.stage_code == stage_code,
                WorkflowTask.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.OVERDUE]),
            )
            .all()
        )
        now = datetime.utcnow()
        for task in open_tasks:
            task.status = TaskStatus.COMPLETED
            task.completed_at = now
            task.completed_by = actor_user_id
            task.updated_at = now
        self.db.flush()
        return open_tasks

    def process_overdue_tasks(self) -> list[WorkflowTask]:
        now = datetime.utcnow()
        overdue = (
            self.db.query(WorkflowTask)
            .filter(
                WorkflowTask.due_at.isnot(None),
                WorkflowTask.due_at < now,
                WorkflowTask.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
            )
            .all()
        )
        for task in overdue:
            task.status = TaskStatus.OVERDUE
            task.escalation_level = (task.escalation_level or 0) + 1
            task.updated_at = now
        self.db.flush()
        return overdue
