import json
import os
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from datetime import datetime
import uuid

router = APIRouter()

# Temporary in-memory storage (stable for routing test)
cases_db = {}


@router.post("")
def create_case(payload: dict):
    case_id = str(uuid.uuid4())

    case = {
        "id": case_id,
        "case_number": f"CASE-{case_id[:8]}",
        "mrn": payload.get("mrn"),
        "diagnosis": payload.get("diagnosis"),
        "physician": payload.get("physician"),
        "status": "draft",
        "created_at": datetime.utcnow().isoformat()
    }

    cases_db[case_id] = case
    return case


@router.get("")
def list_cases():
    return list(cases_db.values())


@router.get("/{case_id}")
def get_case(case_id: str):
    if case_id not in cases_db:
        raise HTTPException(status_code=404, detail="Case not found")
    return cases_db[case_id]


@router.post("/{case_id}/legal-package")
def generate_legal_package(case_id: str):
    if case_id not in cases_db:
        raise HTTPException(status_code=404, detail="Case not found")

    return {
        "status": "success",
        "case_id": case_id,
        "version": 1,
        "generated_at": datetime.utcnow().isoformat(),
        "download_url": f"/api/cases/{case_id}/legal-package/download"
    }
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.models.case_repository import Case, CaseRepository
from backend.api.deps import require_roles

router = APIRouter()

case_repo = CaseRepository()

LEGAL_PACKAGE_DIR = "/tmp/legal_packages"
AUDIT_DIR = os.path.join(LEGAL_PACKAGE_DIR, "audit")
os.makedirs(LEGAL_PACKAGE_DIR, exist_ok=True)
os.makedirs(AUDIT_DIR, exist_ok=True)


class CaseCreateRequest(BaseModel):
    mrn: str
    diagnosis: str
    physician: str
    status: Optional[str] = "draft"


class LegalPackageMetadata(BaseModel):
    case_id: str
    version: int
    status: str
    generated_at: str
    download_url: str
    file_path: str
    pushed_to_trakcare: bool = False
    trakcare_document_id: str = ""
    pushed_at: str = ""
    target_system: str = ""


def _meta_path(case_id: str) -> str:
    return os.path.join(LEGAL_PACKAGE_DIR, f"{case_id}.json")


def _audit_path(case_id: str) -> str:
    return os.path.join(AUDIT_DIR, f"{case_id}.jsonl")


def _escape_pdf_text(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


def _build_simple_pdf(lines: List[str]) -> bytes:
    safe_lines = [_escape_pdf_text(line) for line in lines]

    text_commands = ["BT", "/F1 11 Tf", "50 780 Td"]
    first = True
    for line in safe_lines:
        if not first:
            text_commands.append("0 -16 Td")
        text_commands.append(f"({line}) Tj")
        first = False
    text_commands.append("ET")

    content_stream = "\n".join(text_commands).encode("latin-1", errors="replace")

    objects = []
    objects.append(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n")
    objects.append(b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n")
    objects.append(
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n"
    )
    objects.append(b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n")
    objects.append(
        f"5 0 obj << /Length {len(content_stream)} >> stream\n".encode("latin-1")
        + content_stream
        + b"\nendstream endobj\n"
    )

    pdf = bytearray()
    pdf.extend(b"%PDF-1.4\n")

    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf.extend(obj)

    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))

    pdf.extend(
        (
            f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF"
        ).encode("latin-1")
    )
    return bytes(pdf)


def _append_audit(case_id: str, action: str, meta: dict) -> None:
    record = {
        "timestamp": datetime.utcnow().isoformat(),
        "case_id": case_id,
        "action": action,
        "meta": meta,
    }
    with open(_audit_path(case_id), "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def _load_legal_package_meta(case_id: str) -> Optional[dict]:
    path = _meta_path(case_id)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_legal_package_meta(case_id: str, meta: dict) -> None:
    with open(_meta_path(case_id), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)


@router.post("/", response_model=Case, status_code=status.HTTP_201_CREATED)
def create_case(payload: CaseCreateRequest):
    created = case_repo.create_case(payload.model_dump())
    return Case(**created)


@router.get("/", response_model=List[Case])
def list_cases():
    cases = case_repo.list_cases()
    return [Case(**c) for c in cases]


@router.get("/{case_id}", response_model=Case)
def get_case(case_id: str):
    case = case_repo.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return Case(**case)


@router.post("/{case_id}/legal-package", response_model=LegalPackageMetadata)
def generate_legal_package(case_id: str, current_user=Depends(require_roles("legal", "legal_admin", "legal_officer", "admin", "platform_admin"))):
    from backend.adapters.trakcare_adapter import TrakCareAdapter
    case = case_repo.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    existing = _load_legal_package_meta(case_id)
    next_version = 1 if not existing else int(existing["version"]) + 1

    generated_at = datetime.utcnow().isoformat()
    file_name = f"{case_id}_v{next_version}.pdf"
    file_path = os.path.join(LEGAL_PACKAGE_DIR, file_name)

    pdf_lines = [
        "WathiqCare Legal Case Package",
        "",
        f"Case ID: {case['id']}",
        f"Case Number: {case.get('case_number') or case['id']}",
        f"MRN: {case['mrn']}",
        f"Diagnosis: {case['diagnosis']}",
        f"Physician: {case['physician']}",
        f"Status: {case['status']}",
        f"Generated At: {generated_at}",
        f"Version: {next_version}",
    ]

    pdf_bytes = _build_simple_pdf(pdf_lines)
    with open(file_path, "wb") as f:
        f.write(pdf_bytes)

    # --- TrakCare push integration ---
    adapter = TrakCareAdapter()
    trakcare_result = adapter.push_document(case["mrn"], file_path)
    pushed_to_trakcare = trakcare_result.get("success", False)
    trakcare_document_id = trakcare_result.get("document_id", "")
    pushed_at = trakcare_result.get("pushed_at", "")
    target_system = trakcare_result.get("target_system", "")

    meta = {
        "case_id": case_id,
        "version": next_version,
        "status": "generated",
        "generated_at": generated_at,
        "download_url": f"/api/cases/{case_id}/legal-package/download",
        "file_path": file_path,
        "pushed_to_trakcare": pushed_to_trakcare,
        "trakcare_document_id": trakcare_document_id,
        "pushed_at": pushed_at,
        "target_system": target_system,
    }

    _save_legal_package_meta(case_id, meta)
    _append_audit(
        case_id,
        "LEGAL_PACKAGE_GENERATED",
        {"version": next_version, "file_path": file_path},
    )
    if pushed_to_trakcare:
        _append_audit(
            case_id,
            "LEGAL_PACKAGE_PUSHED_TO_TRAKCARE",
            {
                "version": next_version,
                "trakcare_document_id": trakcare_document_id,
                "pushed_at": pushed_at,
                "target_system": target_system,
            },
        )

    return LegalPackageMetadata(**meta)


@router.get("/{case_id}/legal-package", response_model=LegalPackageMetadata)
def get_legal_package_metadata(case_id: str):
    case = case_repo.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    meta = _load_legal_package_meta(case_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Legal package not generated yet")

    return LegalPackageMetadata(**meta)


@router.get("/{case_id}/legal-package/download")
def download_legal_package(case_id: str):
    case = case_repo.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    meta = _load_legal_package_meta(case_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Legal package not generated yet")

    file_path = meta["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file not found")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=os.path.basename(file_path),
    )