from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.forms.medical_legal_forms_library import render_form_by_key
from backend.forms.workflow_templates import WORKFLOW_TEMPLATES
from backend.models.document_template import DocumentTemplate
from backend.services.system_settings_service import SystemSettingsService


SUPPORTED_LANGUAGES = {"ar", "en"}


DEFAULT_TEMPLATE_REGISTRY: List[Dict[str, Any]] = [
    {
        "template_key": "discharge_refusal_form",
        "template_type": "medical",
        "title_en": "Medical Discharge Refusal Form",
        "title_ar": "نموذج رفض الخروج الطبي",
        "document_code": "IMC-PAT-DIS-REF-01",
        "renderer_hint": "discharge_refusal_form",
    },
    {
        "template_key": "financial_responsibility_notice",
        "template_type": "legal",
        "title_en": "Financial Responsibility Notice",
        "title_ar": "إشعار المسؤولية المالية",
        "document_code": "IMC-PAT-DIS-NOT-01",
        "renderer_hint": "financial_responsibility_notice",
    },
    {
        "template_key": "discharge_decision_record",
        "template_type": "medical",
        "title_en": "Medical Discharge Decision Record",
        "title_ar": "سجل قرار الخروج الطبي",
        "document_code": "IMC-PAT-DIS-DEC-01",
        "renderer_hint": "discharge_decision_record",
    },
    {
        "template_key": "informed_consent",
        "template_type": "medical",
        "title_en": "Acknowledgment and Informed Consent",
        "title_ar": "الإقرار والموافقة المستنيرة",
        "document_code": "IMC-PAT-CONS-01",
        "renderer_hint": "informed_consent",
    },
    {
        "template_key": "home_healthcare_agreement",
        "template_type": "operational",
        "title_en": "Home Healthcare Agreement",
        "title_ar": "اتفاقية الرعاية الصحية المنزلية",
        "document_code": "IMC-HHC-PDN-01",
        "renderer_hint": "home_healthcare_agreement",
    },
]


def _version_key(version: str) -> tuple:
    parts = (version or "1.0").split(".")
    key: List[Any] = []
    for part in parts:
        if part.isdigit():
            key.append(int(part))
        else:
            key.append(part)
    return tuple(key)


class _SafeFormatDict(dict):
    def __missing__(self, key: str) -> str:
        return ""


@dataclass
class ResolvedTemplate:
    template: DocumentTemplate
    requested_language: str
    resolved_language: str
    fallback_chain: List[str]

    @property
    def template_key(self) -> str:
        return self.template.template_key

    @property
    def title(self) -> str:
        return self.template.title

    @property
    def document_code(self) -> Optional[str]:
        return self.template.document_code

    @property
    def version(self) -> str:
        return self.template.version


class TemplateLocalizationService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = SystemSettingsService(db)

    def ensure_default_templates(self, *, tenant_id: Optional[str] = None, created_by: Optional[str] = None) -> None:
        for item in DEFAULT_TEMPLATE_REGISTRY:
            for language_code in ("ar", "en"):
                title = item["title_ar"] if language_code == "ar" else item["title_en"]
                exists = (
                    self.db.query(DocumentTemplate)
                    .filter(
                        DocumentTemplate.tenant_id == tenant_id,
                        DocumentTemplate.template_key == item["template_key"],
                        DocumentTemplate.language_code == language_code,
                        DocumentTemplate.version == "1.0",
                    )
                    .first()
                )
                if exists:
                    continue

                self.db.add(
                    DocumentTemplate(
                        tenant_id=tenant_id,
                        template_key=item["template_key"],
                        language_code=language_code,
                        template_type=item["template_type"],
                        version="1.0",
                        is_active=True,
                        title=title,
                        document_code=item["document_code"],
                        renderer_hint=item["renderer_hint"],
                        metadata_json={"seeded": True},
                        created_by=created_by,
                    )
                )
        self.db.flush()

    def list_templates(
        self,
        *,
        tenant_id: Optional[str],
        template_key: Optional[str] = None,
        language_code: Optional[str] = None,
        template_type: Optional[str] = None,
        active_only: bool = True,
    ) -> List[DocumentTemplate]:
        query = self.db.query(DocumentTemplate).filter(
            (DocumentTemplate.tenant_id == tenant_id) | (DocumentTemplate.tenant_id.is_(None))
        )

        if template_key:
            query = query.filter(DocumentTemplate.template_key == template_key)
        if language_code:
            query = query.filter(DocumentTemplate.language_code == language_code)
        if template_type:
            query = query.filter(DocumentTemplate.template_type == template_type)
        if active_only:
            query = query.filter(DocumentTemplate.is_active.is_(True))

        rows = query.order_by(
            DocumentTemplate.template_key.asc(),
            DocumentTemplate.language_code.asc(),
            DocumentTemplate.version.desc(),
        ).all()
        return rows

    def resolve_template(
        self,
        *,
        tenant_id: Optional[str],
        template_key: str,
        requested_language: Optional[str] = None,
    ) -> ResolvedTemplate:
        default_language = str(self.settings.get("default_language", tenant_id=tenant_id, default="ar"))
        requested = (requested_language or default_language or "en").strip().lower()
        if requested not in SUPPORTED_LANGUAGES:
            requested = default_language if default_language in SUPPORTED_LANGUAGES else "en"

        fallback_chain = [requested]
        if default_language not in fallback_chain:
            fallback_chain.append(default_language)
        if "en" not in fallback_chain:
            fallback_chain.append("en")

        for language in fallback_chain:
            tenant_rows = (
                self.db.query(DocumentTemplate)
                .filter(
                    DocumentTemplate.tenant_id == tenant_id,
                    DocumentTemplate.template_key == template_key,
                    DocumentTemplate.language_code == language,
                    DocumentTemplate.is_active.is_(True),
                )
                .all()
            )
            if tenant_rows:
                best = sorted(tenant_rows, key=lambda item: _version_key(item.version), reverse=True)[0]
                return ResolvedTemplate(
                    template=best,
                    requested_language=requested,
                    resolved_language=language,
                    fallback_chain=fallback_chain,
                )

            global_rows = (
                self.db.query(DocumentTemplate)
                .filter(
                    DocumentTemplate.tenant_id.is_(None),
                    DocumentTemplate.template_key == template_key,
                    DocumentTemplate.language_code == language,
                    DocumentTemplate.is_active.is_(True),
                )
                .all()
            )
            if global_rows:
                best = sorted(global_rows, key=lambda item: _version_key(item.version), reverse=True)[0]
                return ResolvedTemplate(
                    template=best,
                    requested_language=requested,
                    resolved_language=language,
                    fallback_chain=fallback_chain,
                )

        raise ValueError(f"No active localized template found for key '{template_key}'")

    def validate_template_availability(
        self,
        *,
        tenant_id: Optional[str],
        template_key: str,
        requested_language: Optional[str],
    ) -> Dict[str, Any]:
        try:
            resolved = self.resolve_template(
                tenant_id=tenant_id,
                template_key=template_key,
                requested_language=requested_language,
            )
            return {
                "available": True,
                "template_key": template_key,
                "requested_language": resolved.requested_language,
                "resolved_language": resolved.resolved_language,
                "version": resolved.version,
                "fallback_chain": resolved.fallback_chain,
            }
        except ValueError as exc:
            return {
                "available": False,
                "template_key": template_key,
                "requested_language": (requested_language or "").strip().lower(),
                "resolved_language": None,
                "version": None,
                "fallback_chain": [],
                "reason": str(exc),
            }

    def render_template(self, *, resolved: ResolvedTemplate, context: Dict[str, str]) -> str:
        template = resolved.template
        key = template.template_key
        language = resolved.resolved_language

        if key == "financial_responsibility_notice" and language == "ar":
            return render_form_by_key("financial_responsibility_notice_ar", context)

        if key in {
            "discharge_refusal_form",
            "financial_responsibility_notice",
            "discharge_decision_record",
            "home_healthcare_agreement",
        }:
            return render_form_by_key(key, context)

        workflow_template = WORKFLOW_TEMPLATES.get(key)
        if workflow_template:
            return workflow_template.renderer(context)

        if template.template_body:
            return template.template_body.format_map(_SafeFormatDict(context))

        raise ValueError(f"Template renderer not configured for '{key}'")
