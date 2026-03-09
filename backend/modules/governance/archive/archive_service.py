from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class ArchiveEntry:
    tenant_id: str
    patient_id: str | None
    case_id: str | None
    form_number: str | None
    form_title: str | None
    document_category: str | None
    pdf_attachment_id: str | None
    archive_reference_id: str
    indexed_at: str
    archive_status: str
    legal_document_flag: bool


def create_archive_entry(
    tenant_id: str,
    patient_id: str | None = None,
    case_id: str | None = None,
    form_number: str | None = None,
    form_title: str | None = None,
    document_category: str | None = None,
    pdf_attachment_id: str | None = None,
    legal_document_flag: bool = False,
) -> ArchiveEntry:
    return ArchiveEntry(
        tenant_id=tenant_id,
        patient_id=patient_id,
        case_id=case_id,
        form_number=form_number,
        form_title=form_title,
        document_category=document_category,
        pdf_attachment_id=pdf_attachment_id,
        archive_reference_id=f"ARC-{int(datetime.now(timezone.utc).timestamp())}",
        indexed_at=datetime.now(timezone.utc).isoformat(),
        archive_status="INDEXED",
        legal_document_flag=legal_document_flag,
    )
