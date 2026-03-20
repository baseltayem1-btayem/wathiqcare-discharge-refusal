from dataclasses import dataclass
from typing import Any, Dict


@dataclass(frozen=True)
class EmailTemplate:
    name: str
    subject: str
    html_body: str
    text_body: str


class _SafeDict(dict):
    def __missing__(self, key: str) -> str:
        return ""


TEMPLATES: dict[str, EmailTemplate] = {
    "discharge_notice": EmailTemplate(
        name="discharge_notice",
        subject="Discharge Notice - Case {case_id}",
        html_body=(
            "<h3>Discharge Notice</h3>"
            "<p>Case: <strong>{case_id}</strong></p>"
            "<p>Patient: <strong>{patient_name}</strong></p>"
            "<p>Please review the discharge notice and attached documents.</p>"
        ),
        text_body=(
            "Discharge Notice\n"
            "Case: {case_id}\n"
            "Patient: {patient_name}\n"
            "Please review the discharge notice and attached documents."
        ),
    ),
    "discharge_refusal_follow_up": EmailTemplate(
        name="discharge_refusal_follow_up",
        subject="Discharge Refusal Follow-up - Case {case_id}",
        html_body=(
            "<h3>Discharge Refusal Follow-up</h3>"
            "<p>Case: <strong>{case_id}</strong></p>"
            "<p>Patient: <strong>{patient_name}</strong></p>"
            "<p>Refusal remains active. Please complete the follow-up workflow.</p>"
        ),
        text_body=(
            "Discharge Refusal Follow-up\n"
            "Case: {case_id}\n"
            "Patient: {patient_name}\n"
            "Refusal remains active. Please complete the follow-up workflow."
        ),
    ),
    "legal_escalation_notice": EmailTemplate(
        name="legal_escalation_notice",
        subject="Legal Escalation Notice - Case {case_id}",
        html_body=(
            "<h3>Legal Escalation Notice</h3>"
            "<p>Case: <strong>{case_id}</strong></p>"
            "<p>Patient: <strong>{patient_name}</strong></p>"
            "<p>This case requires legal/compliance escalation review.</p>"
        ),
        text_body=(
            "Legal Escalation Notice\n"
            "Case: {case_id}\n"
            "Patient: {patient_name}\n"
            "This case requires legal/compliance escalation review."
        ),
    ),
    "internal_review_notification": EmailTemplate(
        name="internal_review_notification",
        subject="Internal Review Notification - Case {case_id}",
        html_body=(
            "<h3>Internal Review Notification</h3>"
            "<p>Case: <strong>{case_id}</strong></p>"
            "<p>Patient: <strong>{patient_name}</strong></p>"
            "<p>Please review the case workflow status and attachments.</p>"
        ),
        text_body=(
            "Internal Review Notification\n"
            "Case: {case_id}\n"
            "Patient: {patient_name}\n"
            "Please review the case workflow status and attachments."
        ),
    ),
}


def list_template_names() -> list[str]:
    return sorted(TEMPLATES.keys())


def render_template(template_name: str, variables: Dict[str, Any]) -> EmailTemplate:
    if template_name not in TEMPLATES:
        raise ValueError("Unsupported template_name")

    template = TEMPLATES[template_name]
    payload = _SafeDict({key: "" if value is None else str(value) for key, value in variables.items()})

    return EmailTemplate(
        name=template.name,
        subject=template.subject.format_map(payload),
        html_body=template.html_body.format_map(payload),
        text_body=template.text_body.format_map(payload),
    )
