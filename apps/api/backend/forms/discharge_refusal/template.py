from __future__ import annotations

from typing import Dict

from backend.forms.workflow_templates import WORKFLOW_TEMPLATES

DOCUMENT_TYPE = "discharge_refusal_form"
DOCUMENT_VERSION = "IMC-PAT-DIS-REF-01"


def render_official_text(context: Dict[str, str]) -> str:
    # Uses the approved wording renderer without altering legal language.
    return WORKFLOW_TEMPLATES[DOCUMENT_TYPE].renderer(context)
