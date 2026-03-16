from __future__ import annotations

from typing import Dict, Optional

from sqlalchemy.orm import Session

from backend.models.department import Department
from backend.services.system_settings_service import SystemSettingsService
from backend.workflow.constants import StageCode


DEFAULT_DEPARTMENTS = [
    {"code": "medical", "name_en": "Medical", "name_ar": "الطبي"},
    {"code": "nursing", "name_en": "Nursing", "name_ar": "التمريض"},
    {"code": "finance", "name_en": "Finance", "name_ar": "المالية"},
    {"code": "social_services", "name_en": "Social Services", "name_ar": "الخدمات الاجتماعية"},
    {"code": "legal_affairs", "name_en": "Legal Affairs", "name_ar": "الشؤون القانونية"},
    {"code": "compliance", "name_en": "Compliance", "name_ar": "الامتثال"},
    {"code": "patient_relations", "name_en": "Patient Relations", "name_ar": "علاقات المرضى"},
    {"code": "administration", "name_en": "Administration", "name_ar": "الإدارة"},
    {"code": "home_healthcare", "name_en": "Home Healthcare", "name_ar": "الرعاية الصحية المنزلية"},
    {"code": "case_management", "name_en": "Case Management", "name_ar": "إدارة الحالات"},
]


DEFAULT_STAGE_DEPARTMENT_MAP: Dict[str, str] = {
    StageCode.NURSE_DRAFT: "nursing",
    StageCode.PENDING_PHYSICIAN_ORDER: "medical",
    StageCode.PENDING_PATIENT_SIGNATURE: "nursing",
    StageCode.ACCEPTED_DISCHARGE_EXECUTION: "case_management",
    StageCode.PATIENT_RELATIONS_REVIEW: "patient_relations",
    StageCode.SOCIAL_WORK_REVIEW: "social_services",
    StageCode.FINANCE_REVIEW: "finance",
    StageCode.LEGAL_ESCALATION: "legal_affairs",
}


class DepartmentService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = SystemSettingsService(db)

    def ensure_defaults(self) -> None:
        for item in DEFAULT_DEPARTMENTS:
            exists = self.db.query(Department).filter(Department.code == item["code"]).first()
            if exists:
                exists.name_en = item["name_en"]
                exists.name_ar = item["name_ar"]
                exists.is_active = True
                continue
            self.db.add(
                Department(
                    code=item["code"],
                    name_en=item["name_en"],
                    name_ar=item["name_ar"],
                    is_active=True,
                )
            )
        self.db.flush()

    def list_departments(self, *, active_only: bool = True) -> list[Department]:
        query = self.db.query(Department)
        if active_only:
            query = query.filter(Department.is_active.is_(True))
        return query.order_by(Department.name_en.asc()).all()

    def resolve_stage_department(
        self,
        *,
        stage_code: str,
        tenant_id: Optional[str] = None,
    ) -> Optional[str]:
        routing_rules = self.settings.get("department_routing_rules", tenant_id=tenant_id, default={})
        if isinstance(routing_rules, dict):
            configured = routing_rules.get(stage_code)
            if configured:
                return str(configured)

        return DEFAULT_STAGE_DEPARTMENT_MAP.get(stage_code)
