from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class RefusalFormTemplate(BaseModel):
    """Describes an available form template in the forms library."""

    form_type: str
    title: str
    description: str
    required_consent_statuses: List[str]
    fields: List[str]


class RefusalFormGenerate(BaseModel):
    """Request body for generating a refusal form for a given consent."""

    consent_id: str
    form_type: str
    notes: Optional[str] = None


class RefusalFormOut(BaseModel):
    """Response schema for a persisted refusal form instance."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    consent_id: str
    patient_id: str
    form_type: str
    status: str
    form_data: Dict[str, Any]
    notes: Optional[str] = None
    generated_by: str
    generated_at: datetime
    downloaded_at: Optional[datetime] = None


class RefusalFormDownload(BaseModel):
    """Lightweight payload returned on download (marks form as downloaded)."""

    model_config = ConfigDict(from_attributes=True)

    form_id: str
    form_type: str
    title: str
    downloaded_at: datetime
    form_data: Dict[str, Any]
