from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


class EmailAttachmentInput(BaseModel):
    document_id: Optional[str] = None
    file_path: Optional[str] = None
    display_name: Optional[str] = None

    @model_validator(mode="after")
    def validate_source(self) -> "EmailAttachmentInput":
        if not self.document_id and not self.file_path:
            raise ValueError("Either document_id or file_path must be provided")
        return self


class SendEmailRequest(BaseModel):
    to: List[EmailStr] = Field(default_factory=list)
    cc: List[EmailStr] = Field(default_factory=list)
    case_id: Optional[str] = None
    patient_id: Optional[str] = None
    subject: Optional[str] = None
    html_body: Optional[str] = None
    text_body: Optional[str] = None
    template_name: Optional[str] = None
    template_vars: Dict[str, Any] = Field(default_factory=dict)
    attachments: List[EmailAttachmentInput] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_content(self) -> "SendEmailRequest":
        if not self.to:
            raise ValueError("At least one recipient is required")

        has_direct = bool((self.subject or "").strip()) and bool((self.html_body or "").strip() or (self.text_body or "").strip())
        has_template = bool((self.template_name or "").strip())

        if not has_direct and not has_template:
            raise ValueError("Provide either template_name or direct subject/body")
        return self


class SendWorkflowNotificationRequest(BaseModel):
    case_id: str
    to: List[EmailStr] = Field(default_factory=list)
    cc: List[EmailStr] = Field(default_factory=list)
    template_name: str
    template_vars: Dict[str, Any] = Field(default_factory=dict)
    include_latest_case_documents: bool = False
    attachment_document_ids: List[str] = Field(default_factory=list)


class EmailSendResponse(BaseModel):
    log_id: str
    status: str
    provider: str
    subject: str
    recipients: List[str]
    cc: List[str]
    sent_at: Optional[str] = None


class EmailLogResponse(BaseModel):
    id: str
    case_id: Optional[str]
    patient_id: Optional[str]
    recipient_email: str
    cc: Optional[str]
    subject: str
    template_name: Optional[str]
    status: str
    provider: str
    sent_at: Optional[str]
    created_by: str
    error_message: Optional[str]
    attachment_metadata: Optional[str]
    created_at: str
