"""Additive production SaaS medico-legal module layer.

This package is intentionally isolated from legacy discharge refusal flows.
"""

from .agreement_engine import AgreementEngine
from .archive_engine import ArchiveEngine
from .consent_engine import ConsentEngine
from .document_generator import DocumentGenerator
from .refusal_engine import RefusalEngine
from .roi_engine import RoiEngine
from .signature_evidence import SignatureEvidenceBuilder

__all__ = [
    "AgreementEngine",
    "ArchiveEngine",
    "ConsentEngine",
    "DocumentGenerator",
    "RefusalEngine",
    "RoiEngine",
    "SignatureEvidenceBuilder",
]
