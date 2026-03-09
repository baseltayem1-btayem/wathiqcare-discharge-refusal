from dataclasses import dataclass


@dataclass
class TemplateDefinition:
    template_id: str
    template_name: str
    template_type: str
    language_mode: str
    form_number: str
    version: str
    active: bool


DEFAULT_TEMPLATES = [
    TemplateDefinition("general-treatment", "General Treatment Consent", "consent", "bilingual", "IMC-GTC-001", "1.0", True),
    TemplateDefinition("surgery-invasive", "Surgery / Invasive Procedure Consent", "consent", "bilingual", "IMC-SRG-001", "1.0", True),
    TemplateDefinition("sedation", "Sedation / Analgesia Consent", "consent", "bilingual", "IMC-ANS-001", "1.0", True),
    TemplateDefinition("blood-transfusion", "Blood Transfusion Consent", "consent", "bilingual", "IMC-BLD-001", "1.0", True),
    TemplateDefinition("home-healthcare", "Home Health Care Consent", "agreement", "bilingual", "IMC-HHC-001", "1.0", True),
    TemplateDefinition("special-procedure", "Special Procedure Consent", "consent", "bilingual", "IMC-SPC-001", "1.0", True),
    TemplateDefinition("roi-auth", "Release of Information Authorization", "authorization", "bilingual", "IMC-ROI-001", "1.0", True),
]


def list_templates() -> list[TemplateDefinition]:
    return DEFAULT_TEMPLATES
