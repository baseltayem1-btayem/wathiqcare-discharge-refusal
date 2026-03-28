import os
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class Case(BaseModel):
    id: str
    case_number: Optional[str] = None
    mrn: str
    diagnosis: str
    physician: str
    status: str
    created_at: str
    updated_at: str


class CaseRepository:
    def __init__(self, db_path: str = "/tmp/cases.db") -> None:
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS cases (
                    id TEXT PRIMARY KEY,
                    case_number TEXT,
                    mrn TEXT NOT NULL,
                    diagnosis TEXT NOT NULL,
                    physician TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.commit()

    def create_case(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        mrn = payload["mrn"]
        case_id = payload.get("id") or f"case-{mrn}-{int(datetime.utcnow().timestamp())}"
        case_number = payload.get("case_number") or case_id.upper()

        row = {
            "id": case_id,
            "case_number": case_number,
            "mrn": mrn,
            "diagnosis": payload["diagnosis"],
            "physician": payload["physician"],
            "status": payload.get("status", "draft"),
            "created_at": now,
            "updated_at": now,
        }

        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO cases (
                    id, case_number, mrn, diagnosis, physician, status, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row["id"],
                    row["case_number"],
                    row["mrn"],
                    row["diagnosis"],
                    row["physician"],
                    row["status"],
                    row["created_at"],
                    row["updated_at"],
                ),
            )
            conn.commit()

        return row

    def list_cases(self) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT id, case_number, mrn, diagnosis, physician, status, created_at, updated_at
                FROM cases
                ORDER BY created_at DESC
                """
            ).fetchall()
        return [dict(r) for r in rows]

    def get_case(self, case_id: str) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT id, case_number, mrn, diagnosis, physician, status, created_at, updated_at
                FROM cases
                WHERE id = ?
                """,
                (case_id,),
            ).fetchone()

        return dict(row) if row else None

    def update_case_status(self, case_id: str, status: str) -> Optional[Dict[str, Any]]:
        now = datetime.utcnow().isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE cases
                SET status = ?, updated_at = ?
                WHERE id = ?
                """,
                (status, now, case_id),
            )
            conn.commit()

        return self.get_case(case_id)