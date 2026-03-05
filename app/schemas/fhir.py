from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class FHIRIdentifier(BaseModel):
    system: Optional[str] = None
    value: str


class FHIRHumanName(BaseModel):
    family: Optional[str] = None
    given: Optional[List[str]] = None
    text: Optional[str] = None


class FHIRTelecom(BaseModel):
    system: Optional[str] = None
    value: str


class FHIRPatient(BaseModel):
    resourceType: str = "Patient"
    id: Optional[str] = None
    identifier: Optional[List[FHIRIdentifier]] = None
    name: Optional[List[FHIRHumanName]] = None
    telecom: Optional[List[FHIRTelecom]] = None
    birthDate: Optional[str] = None
    gender: Optional[str] = None


class FHIRConsent(BaseModel):
    resourceType: str = "Consent"
    id: Optional[str] = None
    status: Optional[str] = None
    scope: Optional[Dict[str, Any]] = None
    category: Optional[List[Dict[str, Any]]] = None
    subject: Optional[Dict[str, str]] = None
    dateTime: Optional[str] = None
