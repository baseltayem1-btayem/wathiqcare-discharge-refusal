from __future__ import annotations

from datetime import datetime
from typing import Any, Dict


LEGAL_TEMPLATES: dict[str, dict[str, str]] = {
    "discharge_notice_acknowledgment": {
        "title": "إقرار إشعار الخروج الطبي",
        "version": "1.0.0",
        "body": """
<h2>إقرار إشعار الخروج الطبي</h2>
<p>أُقر أنا/نحن بأن المستشفى أبلغنا بقرار الخروج الطبي للمريض <strong>{{patient_name}}</strong> برقم ملف <strong>{{encounter_number}}</strong>.</p>
<p>تاريخ ووقت الإشعار: <strong>{{issued_at}}</strong>.</p>
<p>تم شرح خطة الخروج والتعليمات الطبية وما يترتب على عدم الالتزام بها.</p>
<p>{{hospital_name}}</p>
<p class='legal-footer'>{{legal_footer}}</p>
""".strip(),
    },
    "home_care_agreement": {
        "title": "اتفاقية الرعاية المنزلية",
        "version": "1.0.0",
        "body": """
<h2>اتفاقية الرعاية المنزلية</h2>
<p>أوافق على خطة الرعاية المنزلية التالية للمريض <strong>{{patient_name}}</strong>:</p>
<p>{{home_care_details}}</p>
<p>جهة تقديم الخدمة: <strong>{{home_care_provider}}</strong></p>
<p>أتعهد بالالتزام بالتعليمات الطبية والمتابعة مع الفريق المعالج.</p>
<p>{{hospital_name}}</p>
<p class='legal-footer'>{{legal_footer}}</p>
""".strip(),
    },
    "equipment_receipt_and_training_acknowledgment": {
        "title": "إقرار استلام الأجهزة والتدريب",
        "version": "1.0.0",
        "body": """
<h2>إقرار استلام الأجهزة والتدريب</h2>
<p>أُقر باستلام الأجهزة/المستلزمات الطبية التالية والتدريب عليها:</p>
<ul>{{equipment_list_html}}</ul>
<p>أتعهد باستخدامها وفق الإرشادات الطبية وإعادتها عند الطلب حسب السياسات.</p>
<p>{{hospital_name}}</p>
<p class='legal-footer'>{{legal_footer}}</p>
""".strip(),
    },
    "refusal_of_discharge_and_financial_liability_acknowledgment": {
        "title": "إقرار رفض الخروج والمسؤولية المالية",
        "version": "1.0.0",
        "body": """
<h2>إقرار رفض الخروج والمسؤولية المالية</h2>
<p>أُقر بأنني رفضت تنفيذ قرار الخروج الطبي للمريض <strong>{{patient_name}}</strong> بعد الشرح الطبي الوافي.</p>
<p>أفهم أن هذا الرفض قد يترتب عليه التزامات نظامية ومالية، بما في ذلك مبلغ تقديري قدره <strong>{{liability_amount}}</strong>.</p>
<p>الشروط: {{liability_terms}}</p>
<p>{{hospital_name}}</p>
<p class='legal-footer'>{{legal_footer}}</p>
""".strip(),
    },
}


DEFAULT_HOSPITAL_NAME = "WathiqCare"
DEFAULT_LEGAL_FOOTER = "هذه الوثيقة جزء من السجل الطبي والقانوني وتم حفظها لأغراض التوثيق والإثبات."


def _equipment_html(equipment: list[dict[str, Any]]) -> str:
    if not equipment:
        return "<li>لا يوجد</li>"

    lines: list[str] = []
    for item in equipment:
        name = str(item.get("item_name") or item.get("itemName") or "جهاز طبي")
        qty = item.get("quantity") or 1
        deposit = item.get("deposit_amount") or item.get("depositAmount")
        deposit_text = f" - تأمين {deposit} ريال" if deposit else ""
        lines.append(f"<li>{name} (الكمية: {qty}){deposit_text}</li>")
    return "".join(lines)


def render_legal_template(template_key: str, variables: Dict[str, Any]) -> Dict[str, Any]:
    template = LEGAL_TEMPLATES.get(template_key)
    if not template:
        raise ValueError(f"Unsupported legal template: {template_key}")

    issued_at = variables.get("issued_at")
    if isinstance(issued_at, datetime):
        issued_at = issued_at.isoformat()

    merged: Dict[str, Any] = {
        "patient_name": variables.get("patient_name") or "-",
        "encounter_number": variables.get("encounter_number") or "-",
        "issued_at": issued_at or datetime.utcnow().isoformat(),
        "equipment_list_html": _equipment_html(variables.get("equipment_items") or []),
        "home_care_details": variables.get("home_care_details") or "لا توجد تفاصيل إضافية",
        "home_care_provider": variables.get("home_care_provider") or "-",
        "liability_amount": variables.get("liability_amount") or "غير محدد",
        "liability_terms": variables.get("liability_terms") or "وفق سياسات المستشفى المعتمدة",
        "hospital_name": variables.get("hospital_name") or DEFAULT_HOSPITAL_NAME,
        "legal_footer": variables.get("legal_footer") or DEFAULT_LEGAL_FOOTER,
    }

    rendered = template["body"]
    for key, value in merged.items():
        rendered = rendered.replace("{{" + key + "}}", str(value))

    return {
        "template_key": template_key,
        "title": template["title"],
        "version": template["version"],
        "html": rendered,
        "variables": merged,
    }
