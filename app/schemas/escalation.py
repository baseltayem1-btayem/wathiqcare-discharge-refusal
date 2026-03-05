from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class EscalationCreate(BaseModel):
    consent_id: str
    reason: str


class EscalationOut(BaseModel):
    consent_id: str
    reason: str
    escalated_at: Optional[datetime] = None
    required_actions: List[str] = []
