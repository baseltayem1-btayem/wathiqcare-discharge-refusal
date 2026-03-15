from __future__ import annotations

import base64
import json
import mimetypes
import os
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence
from urllib import parse as urllib_parse
from urllib import request as urllib_request
from urllib.error import HTTPError, URLError

from backend.core.database import SessionLocal
from backend.core.email_templates import render_template
from backend.models.discharge_case import DischargeCase
from backend.models.email_log import EmailLog
from backend.models.workflow_document import DischargeWorkflowDocument

MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024
ALLOWED_ATTACHMENT_EXTENSIONS = {".pdf", ".txt", ".html", ".csv", ".json", ".docx"}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
EXPECTED_MICROSOFT_TENANT_ID = "08b4493f-d1e2-4c61-b46f-d652ad477fa6"
EXPECTED_MICROSOFT_CLIENT_ID = "d25f4d4d-51bf-4be8-b4fd-ce8744434eef"
EXPECTED_MICROSOFT_SENDER_EMAIL = "admin@wathiqcare.med.sa"


@dataclass(frozen=True)
class EmailServiceConfig:
    tenant_id: str
    client_id: str
    client_secret: str
    sender_email: str

    @staticmethod
    def from_env() -> "EmailServiceConfig":
        tenant_id = os.getenv("MICROSOFT_TENANT_ID", "").strip()
        client_id = os.getenv("MICROSOFT_CLIENT_ID", "").strip()
        client_secret = os.getenv("MICROSOFT_CLIENT_SECRET", "").strip()
        sender_email = os.getenv("MICROSOFT_SENDER_EMAIL", "").strip().lower()

        missing = [
            key
            for key, value in [
                ("MICROSOFT_TENANT_ID", tenant_id),
                ("MICROSOFT_CLIENT_ID", client_id),
                ("MICROSOFT_CLIENT_SECRET", client_secret),
                ("MICROSOFT_SENDER_EMAIL", sender_email),
            ]
            if not value
        ]
        if missing:
            raise ValueError(f"Missing Microsoft Graph email configuration: {', '.join(missing)}")

        if tenant_id != EXPECTED_MICROSOFT_TENANT_ID:
            raise ValueError("MICROSOFT_TENANT_ID is not authorized for this deployment")

        if client_id != EXPECTED_MICROSOFT_CLIENT_ID:
            raise ValueError("MICROSOFT_CLIENT_ID is not authorized for this deployment")

        if sender_email != EXPECTED_MICROSOFT_SENDER_EMAIL:
            raise ValueError("MICROSOFT_SENDER_EMAIL must be admin@wathiqcare.med.sa")

        return EmailServiceConfig(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret,
            sender_email=sender_email,
        )


class MicrosoftGraphClient:
    def __init__(self, config: EmailServiceConfig):
        self.config = config

    @staticmethod
    def _post_form(url: str, form_data: Dict[str, str]) -> Dict[str, Any]:
        encoded = urllib_parse.urlencode(form_data).encode("utf-8")
        req = urllib_request.Request(url, data=encoded, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")

        try:
            with urllib_request.urlopen(req, timeout=30) as response:
                body = response.read().decode("utf-8")
                return json.loads(body or "{}")
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore") if hasattr(exc, "read") else str(exc)
            raise ValueError(f"HTTP {exc.code}: {detail}") from exc
        except URLError as exc:
            raise ValueError(f"Network error: {exc}") from exc

    @staticmethod
    def _post_json(url: str, payload: Dict[str, Any], headers: Dict[str, str]) -> None:
        raw = json.dumps(payload).encode("utf-8")
        req = urllib_request.Request(url, data=raw, method="POST")
        for key, value in headers.items():
            req.add_header(key, value)

        try:
            with urllib_request.urlopen(req, timeout=30):
                return
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore") if hasattr(exc, "read") else str(exc)
            raise ValueError(f"HTTP {exc.code}: {detail}") from exc
        except URLError as exc:
            raise ValueError(f"Network error: {exc}") from exc

    def acquire_access_token(self) -> str:
        token_url = f"https://login.microsoftonline.com/{self.config.tenant_id}/oauth2/v2.0/token"
        payload = self._post_form(
            token_url,
            {
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "scope": "https://graph.microsoft.com/.default",
                "grant_type": "client_credentials",
            },
        )
        access_token = payload.get("access_token")
        if not access_token:
            raise ValueError("Microsoft Graph token response missing access_token")
        return str(access_token)

    def send_mail(
        self,
        *,
        subject: str,
        html_body: str,
        text_body: str,
        recipients: Sequence[str],
        cc: Sequence[str],
        attachments: Sequence[Dict[str, Any]],
    ) -> None:
        token = self.acquire_access_token()
        graph_url = f"https://graph.microsoft.com/v1.0/users/{self.config.sender_email}/sendMail"

        message_payload: Dict[str, Any] = {
            "subject": subject,
            "body": {
                "contentType": "HTML",
                "content": html_body or text_body,
            },
            "toRecipients": [{"emailAddress": {"address": email}} for email in recipients],
        }

        if cc:
            message_payload["ccRecipients"] = [
                {"emailAddress": {"address": email}} for email in cc
            ]

        if attachments:
            message_payload["attachments"] = attachments

        self._post_json(
            graph_url,
            {"message": message_payload, "saveToSentItems": True},
            {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )


class EmailService:
    def __init__(self):
        self.config = EmailServiceConfig.from_env()
        self.client = MicrosoftGraphClient(self.config)

    @staticmethod
    def _normalize_recipients(emails: Sequence[str]) -> List[str]:
        normalized: List[str] = []
        for raw in emails:
            email = (raw or "").strip().lower()
            if not email:
                continue
            if not EMAIL_RE.match(email):
                raise ValueError(f"Invalid recipient email: {raw}")
            if email not in normalized:
                normalized.append(email)
        return normalized

    @staticmethod
    def _resolve_path(raw_path: str) -> Path:
        path = Path(raw_path)
        if not path.is_absolute():
            path = (Path.cwd() / path).resolve()
        return path

    def _build_attachment_from_path(self, *, source_path: Path, display_name: Optional[str]) -> Dict[str, Any]:
        if not source_path.exists() or not source_path.is_file():
            raise ValueError(f"Attachment not found: {source_path}")

        suffix = source_path.suffix.lower()
        if suffix not in ALLOWED_ATTACHMENT_EXTENSIONS:
            raise ValueError(f"Unsupported attachment type: {suffix}")

        size_bytes = source_path.stat().st_size
        if size_bytes > MAX_ATTACHMENT_SIZE_BYTES:
            raise ValueError(f"Attachment too large: {source_path.name}")

        mime_type, _ = mimetypes.guess_type(source_path.name)
        content_type = mime_type or "application/octet-stream"
        name = (display_name or source_path.name).strip() or source_path.name

        raw_bytes = source_path.read_bytes()
        content_bytes = base64.b64encode(raw_bytes).decode("utf-8")

        return {
            "@odata.type": "#microsoft.graph.fileAttachment",
            "name": name,
            "contentType": content_type,
            "contentBytes": content_bytes,
            "size": size_bytes,
            "source_path": str(source_path),
        }

    def _resolve_attachments(
        self,
        *,
        tenant_id: str,
        case_id: Optional[str],
        attachments: Sequence[Dict[str, Any]],
        attachment_document_ids: Sequence[str],
    ) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        db = SessionLocal()
        try:
            graph_attachments: List[Dict[str, Any]] = []
            metadata: List[Dict[str, Any]] = []

            all_document_ids = [item.get("document_id") for item in attachments if item.get("document_id")]
            all_document_ids.extend([doc_id for doc_id in attachment_document_ids if doc_id])

            for document_id in all_document_ids:
                document = (
                    db.query(DischargeWorkflowDocument)
                    .filter(
                        DischargeWorkflowDocument.id == str(document_id),
                        DischargeWorkflowDocument.tenant_id == tenant_id,
                    )
                    .first()
                )
                if not document:
                    raise ValueError(f"Attachment document not found: {document_id}")
                if case_id and document.case_id != case_id:
                    raise ValueError("Attachment document does not belong to the specified case")

                attachment = self._build_attachment_from_path(
                    source_path=self._resolve_path(document.file_path),
                    display_name=document.file_name,
                )
                graph_attachments.append(attachment)
                metadata.append(
                    {
                        "document_id": document.id,
                        "file_name": attachment["name"],
                        "content_type": attachment["contentType"],
                        "size": attachment["size"],
                    }
                )

            for item in attachments:
                if not item.get("file_path"):
                    continue
                attachment = self._build_attachment_from_path(
                    source_path=self._resolve_path(str(item["file_path"])),
                    display_name=item.get("display_name"),
                )
                graph_attachments.append(attachment)
                metadata.append(
                    {
                        "file_name": attachment["name"],
                        "content_type": attachment["contentType"],
                        "size": attachment["size"],
                        "source_path": attachment["source_path"],
                    }
                )

            clean_attachments = [
                {
                    "@odata.type": item["@odata.type"],
                    "name": item["name"],
                    "contentType": item["contentType"],
                    "contentBytes": item["contentBytes"],
                }
                for item in graph_attachments
            ]
            return clean_attachments, metadata
        finally:
            db.close()

    def _resolve_case_context(self, tenant_id: str, case_id: Optional[str]) -> Dict[str, str]:
        if not case_id:
            return {}

        db = SessionLocal()
        try:
            case = (
                db.query(DischargeCase)
                .filter(DischargeCase.id == case_id, DischargeCase.tenant_id == tenant_id)
                .first()
            )
            if not case:
                raise ValueError("Case not found")

            patient_name = case.patient.full_name if case.patient else ""
            return {
                "case_id": case.id,
                "patient_name": patient_name,
                "patient_id": case.patient_id or "",
            }
        finally:
            db.close()

    def _create_log(
        self,
        *,
        tenant_id: str,
        case_id: Optional[str],
        patient_id: Optional[str],
        recipient_email: List[str],
        cc: List[str],
        subject: str,
        template_name: Optional[str],
        status: str,
        created_by: str,
        error_message: Optional[str],
        attachments_meta: List[Dict[str, Any]],
        sent_at: Optional[datetime],
    ) -> EmailLog:
        db = SessionLocal()
        try:
            log = EmailLog(
                tenant_id=tenant_id,
                case_id=case_id,
                patient_id=patient_id,
                recipient_email=",".join(recipient_email),
                cc=",".join(cc) if cc else None,
                subject=subject,
                template_name=template_name,
                status=status,
                provider="microsoft_graph",
                sent_at=sent_at,
                created_by=created_by,
                error_message=error_message,
                attachment_metadata=json.dumps(attachments_meta, ensure_ascii=False),
            )
            db.add(log)
            db.commit()
            db.refresh(log)
            db.expunge(log)
            return log
        finally:
            db.close()

    def send_email(
        self,
        *,
        tenant_id: str,
        created_by: str,
        recipients: Sequence[str],
        cc: Sequence[str],
        case_id: Optional[str],
        patient_id: Optional[str],
        subject: Optional[str],
        html_body: Optional[str],
        text_body: Optional[str],
        template_name: Optional[str],
        template_vars: Optional[Dict[str, Any]],
        attachments: Sequence[Dict[str, Any]],
        attachment_document_ids: Sequence[str],
    ) -> Dict[str, Any]:
        to = self._normalize_recipients(recipients)
        cc_list = self._normalize_recipients(cc)
        if not to:
            raise ValueError("At least one recipient is required")

        context = self._resolve_case_context(tenant_id, case_id)
        merged_vars = {**context, **(template_vars or {})}

        if template_name:
            template = render_template(template_name, merged_vars)
            resolved_subject = template.subject
            resolved_html = template.html_body
            resolved_text = template.text_body
        else:
            resolved_subject = (subject or "").strip()
            resolved_html = (html_body or "").strip()
            resolved_text = (text_body or "").strip()
            if not resolved_subject or not (resolved_html or resolved_text):
                raise ValueError("subject and body are required when template_name is not provided")

        graph_attachments, attachment_meta = self._resolve_attachments(
            tenant_id=tenant_id,
            case_id=case_id,
            attachments=attachments,
            attachment_document_ids=attachment_document_ids,
        )

        try:
            self.client.send_mail(
                subject=resolved_subject,
                html_body=resolved_html,
                text_body=resolved_text,
                recipients=to,
                cc=cc_list,
                attachments=graph_attachments,
            )
            sent_at = datetime.utcnow()
            log = self._create_log(
                tenant_id=tenant_id,
                case_id=case_id,
                patient_id=patient_id or context.get("patient_id") or None,
                recipient_email=to,
                cc=cc_list,
                subject=resolved_subject,
                template_name=template_name,
                status="sent",
                created_by=created_by,
                error_message=None,
                attachments_meta=attachment_meta,
                sent_at=sent_at,
            )
            return {
                "log_id": log.id,
                "status": "sent",
                "provider": "microsoft_graph",
                "subject": resolved_subject,
                "recipients": to,
                "cc": cc_list,
                "sent_at": sent_at.isoformat(),
            }
        except Exception as exc:
            log = self._create_log(
                tenant_id=tenant_id,
                case_id=case_id,
                patient_id=patient_id or context.get("patient_id") or None,
                recipient_email=to,
                cc=cc_list,
                subject=resolved_subject,
                template_name=template_name,
                status="failed",
                created_by=created_by,
                error_message=str(exc),
                attachments_meta=attachment_meta,
                sent_at=None,
            )
            raise ValueError(f"Email sending failed (log_id={log.id}): {exc}") from exc

    def list_logs(self, *, tenant_id: str, case_id: str) -> List[EmailLog]:
        db = SessionLocal()
        try:
            rows = (
                db.query(EmailLog)
                .filter(EmailLog.tenant_id == tenant_id, EmailLog.case_id == case_id)
                .order_by(EmailLog.created_at.desc())
                .all()
            )
            for row in rows:
                db.expunge(row)
            return rows
        finally:
            db.close()
