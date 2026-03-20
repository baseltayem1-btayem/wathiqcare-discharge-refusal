from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class WorkflowActionRequest(BaseModel):
    action: str = Field(..., description="Workflow action key")
    payload: Dict[str, Any] = Field(default_factory=dict)


class WorkflowTemplatePreviewRequest(BaseModel):
    template_key: str = Field(..., description="Template key from workflow template mapping")
    payload: Dict[str, Any] = Field(default_factory=dict)


class WorkflowTemplateGenerateRequest(BaseModel):
    template_key: str = Field(..., description="Template key from workflow template mapping")
    payload: Dict[str, Any] = Field(default_factory=dict)


class WorkflowValidationRequest(BaseModel):
    template_key: Optional[str] = Field(default=None, description="Optional template key for template-specific checks")
    payload: Dict[str, Any] = Field(default_factory=dict)
