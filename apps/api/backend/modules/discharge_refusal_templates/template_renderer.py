from __future__ import annotations

from datetime import datetime
from html import escape
from typing import Any, Dict


def _safe(value: Any) -> str:
    return escape(str(value or "").strip())


def _dt(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M")
    except Exception:
        return raw


def _base(title: str, body: str, *, rtl: bool = False) -> str:
    direction = "rtl" if rtl else "ltr"
    lang = "ar" if rtl else "en"
    return f"""
<!DOCTYPE html>
<html lang=\"{lang}\" dir=\"{direction}\">
<head>
  <meta charset=\"utf-8\" />
  <title>{escape(title)}</title>
  <style>
    body {{ font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; margin: 20px; }}
    h1 {{ margin: 0 0 10px; font-size: 20px; }}
    h2 {{ margin: 14px 0 8px; font-size: 16px; }}
    .field {{ margin: 4px 0; }}
    .muted {{ color: #475569; }}
  </style>
</head>
<body>
{body}
</body>
</html>
""".strip()


def _render_imc_dis_ref_01(data: Dict[str, Any]) -> str:
    body = f"""
  <h1>Medical Discharge Refusal Form / نموذج رفض الخروج الطبي</h1>
  <div class=\"field\">Form ID: IMC-DIS-REF-01</div>
  <h2>Patient Details / البيانات الشخصية</h2>
  <div class=\"field\">Full Name / الاسم الكامل: {_safe(data.get('patient_name'))}</div>
  <div class=\"field\">ID / Iqama Number / رقم الهوية أو الإقامة: {_safe(data.get('patient_id_number') or data.get('national_id'))}</div>
  <div class=\"field\">Medical Record Number / رقم الملف الطبي: {_safe(data.get('medical_record_number') or data.get('mrn'))}</div>
  <div class=\"field\">Room Number / رقم الغرفة: {_safe(data.get('room_number'))}</div>
  <div class=\"field\">Attending Physician Name / اسم الطبيب المعالج: {_safe(data.get('attending_physician') or data.get('physician_name'))}</div>
  <div class=\"field\">Discharge Decision Date / تاريخ قرار الخروج: {_dt(data.get('discharge_decision_at') or data.get('discharge_date'))}</div>

  <h2>Case Details / تفاصيل الحالة</h2>
  <p>I acknowledge that I have been informed of the medical discharge decision, and that my medical condition has been clearly explained to me / my legal representative by the medical team.</p>
  <p>Nevertheless, I insist on remaining in the hospital beyond the medical discharge decision.</p>
  <p>I have been informed that this stay may not be covered by the insurance company or guarantor entity, and that I will be responsible for all related costs.</p>
  <p>أقر بأنه قد تم إبلاغي بقرار الخروج الطبي، كما تم شرح حالتي الصحية بشكل واضح لي / للممثل النظامي من قبل الفريق الطبي.</p>
  <p>وعلى الرغم من ذلك، أُصر على البقاء في المستشفى بعد صدور قرار الخروج الطبي.</p>
  <p>وقد تم إبلاغي بأن هذا البقاء قد لا يكون مغطى من قبل شركة التأمين أو الجهة الضامنة، وأنني سأتحمل كافة التكاليف المترتبة على ذلك.</p>

  <h2>Refusal Reason / أسباب الرفض</h2>
  <div class=\"field\">{_safe(data.get('refusal_reason'))}</div>

  <h2>Patient Acknowledgment / إقرار المريض</h2>
  <p>I fully understand the medical discharge decision.</p>
  <p>I have been informed of the risks of remaining in the hospital.</p>
  <p>I accept full responsibility for remaining beyond the discharge decision.</p>
  <p>I agree to pay all resulting costs.</p>
  <p>أفهم قرار الخروج الطبي بشكل كامل.</p>
  <p>تم إبلاغي بالمخاطر الناتجة عن البقاء.</p>
  <p>أتحمل كامل المسؤولية عن بقائي بعد القرار.</p>
  <p>أوافق على سداد جميع التكاليف المترتبة على ذلك.</p>

  <h2>Signature Data / بيانات التوقيع</h2>
  <div class=\"field\">Name / الاسم: {_safe(data.get('patient_name'))}</div>
  <div class=\"field\">ID Number / رقم الهوية: {_safe(data.get('patient_id_number') or data.get('national_id'))}</div>
  <div class=\"field\">Signature / التوقيع: {_safe(data.get('patient_signature'))}</div>
  <div class=\"field\">Date / التاريخ: {_safe(data.get('ack_date') or data.get('date'))}</div>

  <h2>Witnesses / الشهود</h2>
  <div class=\"field\">Witness 1 Name: {_safe(data.get('witness_1_name') or data.get('witness1_name'))}</div>
  <div class=\"field\">Witness 1 Position: {_safe(data.get('witness_1_title') or data.get('witness1_role'))}</div>
  <div class=\"field\">Witness 1 Signature: {_safe(data.get('witness_1_signature') or data.get('witness1_signature'))}</div>
  <div class=\"field\">Witness 2 Name: {_safe(data.get('witness_2_name') or data.get('witness2_name'))}</div>
  <div class=\"field\">Witness 2 Position: {_safe(data.get('witness_2_title') or data.get('witness2_role'))}</div>
  <div class=\"field\">Witness 2 Signature: {_safe(data.get('witness_2_signature') or data.get('witness2_signature'))}</div>

  <h2>Patient Affairs / Social Services</h2>
  <div class=\"field\">تم التواصل مع المريض / ذويه: {_safe(data.get('contacted_patient_or_family'))}</div>
  <div class=\"field\">نوع الدعم المقدم: {_safe(data.get('support_provided'))}</div>
  <div class=\"field\">تم التصعيد للإدارة القانونية: {_safe(data.get('escalated_to_legal'))}</div>
  <div class=\"field\">اسم الموظف: {_safe(data.get('staff_name'))}</div>
  <div class=\"field\">التاريخ: {_safe(data.get('date'))}</div>
  <div class=\"field\">التوقيع: {_safe(data.get('staff_signature') or data.get('signature'))}</div>
"""
    return _base("IMC-DIS-REF-01", body)


def _render_imc_dis_not_01(data: Dict[str, Any]) -> str:
    body = f"""
  <h1>Notification and Acknowledgment of Financial Responsibility for Refusal of Medical Discharge</h1>
  <div class=\"field\">Form ID: IMC-DIS-NOT-01</div>
  <p>Date: {_safe(data.get('date'))}<br/>Ref: {_safe(data.get('ref_no') or data.get('reference_number'))}</p>
  <p>To: Mr./Ms.: {_safe(data.get('patient_name'))} / Legal Guardian<br/>
  National ID Number: {_safe(data.get('national_id') or data.get('patient_id_number'))}<br/>
  Medical Record Number: {_safe(data.get('mrn') or data.get('medical_record_number'))}<br/>
  Room Number: {_safe(data.get('room_number'))}</p>
  <p>Dear Sir/Madam,</p>
  <p>We would like to inform you that on {_safe(data.get('discharge_date'))}, the attending physician, Dr. {_safe(data.get('physician_name') or data.get('attending_physician'))}, has issued a medical discharge decision confirming that you are medically fit for discharge and that continued hospitalization is no longer medically required.</p>
  <p>You have been informed of your medical condition and the discharge decision. You have also been advised of the implications and potential risks associated with remaining in the hospital beyond the discharge decision.</p>
  <p>As you have chosen to remain in the hospital despite this medical advice, please be advised that insurance providers or guarantor entities will not cover any hospitalization costs or services provided after the issuance of the medical discharge decision.</p>
  <p>Accordingly, you are hereby required to acknowledge and accept full financial responsibility for all costs incurred as a result of your continued stay in the hospital. This includes, but is not limited to:</p>
  <ul><li>Room charges</li><li>Inpatient care services</li><li>Medication dispensing</li><li>Nursing follow-up</li><li>Meal provision</li><li>Housekeeping services</li><li>Any other medical or operational services associated with your stay</li></ul>
  <p>Patient / Legal Representative Acknowledgment:</p>
  <ul><li>I have read and understood the above statement.</li><li>I have been informed of the discharge decision and its implications.</li><li>I understand that remaining in the hospital after the discharge decision will be at my own expense.</li><li>I undertake to settle all resulting charges in full.</li></ul>
  <p>Name: {_safe(data.get('patient_name'))}<br/>National ID Number: {_safe(data.get('national_id') or data.get('patient_id_number'))}<br/>Date of Acknowledgment: {_safe(data.get('ack_date'))}<br/>Signature: __________________________</p>
  <p>Sincerely,<br/>Patient Affairs Department</p>
  <p>Staff Name: {_safe(data.get('staff_name'))}<br/>Signature: __________________________</p>
  <p>[Official Stamp]</p>
  <hr/>
  <div dir=\"rtl\" style=\"text-align:right;\">
    <p>التاريخ: {_safe(data.get('date'))}<br/>الرقم: {_safe(data.get('ref_no') or data.get('reference_number'))}</p>
    <p>السيد/السيدة: {_safe(data.get('patient_name'))} / الممثل النظامي<br/>رقم الهوية / الإقامة: {_safe(data.get('national_id') or data.get('patient_id_number'))}<br/>رقم الملف الطبي: {_safe(data.get('mrn') or data.get('medical_record_number'))}<br/>رقم الغرفة: {_safe(data.get('room_number'))}</p>
    <p>السلام عليكم ورحمة الله وبركاته،</p>
    <p>نفيدكم بأنه بتاريخ {_safe(data.get('discharge_date'))} الساعة {_safe(data.get('discharge_time'))}، أصدر الطبيب المعالج د. {_safe(data.get('physician_name') or data.get('attending_physician'))} قرارًا طبيًا يفيد بجاهزيتكم للخروج من المستشفى، وعدم وجود حاجة طبية تستدعي استمرار التنويم.</p>
    <p>وقد تم شرح حالتكم الصحية لكم بشكل واضح، كما تم توضيح المخاطر الطبية المحتملة الناتجة عن البقاء في المستشفى بعد صدور قرار الخروج.</p>
    <p>وبالرغم من ذلك، فقد اخترتم الاستمرار في البقاء داخل المستشفى.</p>
    <p>وعليه، نود إحاطتكم بما يلي:</p>
    <ol><li>إن استمراركم في البقاء يُعد خلافًا للتوصية الطبية.</li><li>إن الخدمات المقدمة بعد قرار الخروج قد لا تكون مغطاة من قبل شركات التأمين أو الجهات الضامنة.</li><li>لا تتحمل المستشفى أي مسؤولية عن أي مضاعفات أو نتائج صحية قد تترتب على هذا القرار.</li><li>تتحملون كامل المسؤولية المالية عن جميع التكاليف الناتجة عن استمرار الإقامة.</li></ol>
    <p>إقرار المريض / الممثل النظامي:</p>
    <ul><li>اطلاعي الكامل على ما ورد أعلاه</li><li>فهمي التام لقرار الخروج الطبي</li><li>علمي بالمخاطر الطبية المترتبة على البقاء</li><li>موافقتي على تحمل كافة التكاليف المالية الناتجة عن ذلك</li></ul>
    <p>الاسم: {_safe(data.get('patient_name'))}<br/>رقم الهوية: {_safe(data.get('national_id') or data.get('patient_id_number'))}<br/>التاريخ: {_safe(data.get('ack_date'))}<br/>التوقيع: ______________________</p>
    <p>إدارة شؤون المرضى<br/>اسم الموظف: {_safe(data.get('staff_name'))}<br/>التوقيع: ______________________</p>
    <p>[الختم الرسمي]</p>
  </div>
"""
    return _base("IMC-DIS-NOT-01", body)


def _render_imc_pn_01(data: Dict[str, Any]) -> str:
    body = f"""
  <h1>سند لأمر</h1>
  <div class=\"field\">Form ID: IMC-PN-01</div>
  <p>أتعهد أنا الموقع أدناه / {_safe(data.get('debtor_name'))}، حامل الهوية رقم {_safe(data.get('debtor_id'))}، تعهدًا غير معلق على شرط بأن أدفع لأمر <strong>المركز الطبي الدولي</strong> مبلغًا وقدره <strong>{_safe(data.get('amount'))} ريال سعودي</strong>، وذلك <strong>لدى الاطلاع</strong>، مقابل الخدمات الطبية والإقامة التي تمت أو ستتم نتيجة رفضي الخروج من المستشفى بعد صدور القرار الطبي.</p>
  <p>وقد حرر هذا السند بتاريخ <strong>{_safe(data.get('issue_date'))}</strong> في مدينة <strong>{_safe(data.get('city'))}</strong>.</p>
  <p><strong>ولحامل هذا السند حق الرجوع بدون مصروفات أو إجراءات الاحتجاج.</strong></p>
  <p>رقم الحالة: {_safe(data.get('case_id'))}<br/>رقم الملف الطبي: {_safe(data.get('mrn'))}<br/>التوقيع: {_safe(data.get('signature'))}</p>
"""
    return _base("IMC-PN-01", body, rtl=True)


def _render_key_value_form(form_id: str, title: str, data: Dict[str, Any], fields: list[str]) -> str:
    lines = "".join([f'<div class=\"field\"><strong>{escape(field)}:</strong> {_safe(data.get(field))}</div>' for field in fields])
    return _base(form_id, f"<h1>{escape(title)}</h1><div class=\"field\">Form ID: {escape(form_id)}</div>{lines}")


RENDERERS = {
    "IMC-DIS-REF-01": _render_imc_dis_ref_01,
    "IMC-DIS-NOT-01": _render_imc_dis_not_01,
    "IMC-PN-01": _render_imc_pn_01,
    "IMC-COM-01": lambda d: _render_key_value_form("IMC-COM-01", "Initial Communication Documentation", d, ["case_id", "communication_date_time", "explained_by", "explanation_summary", "risks_explained", "patient_response", "next_action"]),
    "IMC-SOC-01": lambda d: _render_key_value_form("IMC-SOC-01", "Social / Patient Affairs Intervention", d, ["case_id", "referred_to_social_services", "intervention_details", "support_provided", "intervention_result", "staff_name", "date", "signature"]),
    "IMC-ESC-01": lambda d: _render_key_value_form("IMC-ESC-01", "Legal Escalation and Compliance", d, ["case_id", "escalation_date_time", "refusal_duration", "escalation_reason", "notified_department", "current_status", "notes"]),
    "IMC-WIT-01": lambda d: _render_key_value_form("IMC-WIT-01", "Witness Confirmation", d, ["case_id", "witness_1_name", "witness_1_title", "witness_1_signature", "witness_2_name", "witness_2_title", "witness_2_signature"]),
    "IMC-TIME-01": lambda d: _render_key_value_form("IMC-TIME-01", "Chronological Timeline Report", d, ["case_id", "discharge_decision", "communication", "social_intervention", "refusal_form_completion", "financial_acknowledgment", "promissory_note", "escalation", "closure"]),
    "IMC-LEGAL-01": lambda d: _render_key_value_form("IMC-LEGAL-01", "Legal Summary", d, ["case_id", "case_facts", "legal_risk_level", "missing_evidence", "recommendations", "document_inventory"]),
    "IMC-CLOSE-01": lambda d: _render_key_value_form("IMC-CLOSE-01", "Case Closure Summary", d, ["case_id", "case_status", "closure_date", "documents_generated", "escalation_result", "final_financial_position"]),
}


def generate_from_template(template_id: str, case_data: Dict[str, Any]) -> str:
    renderer = RENDERERS.get(template_id)
    if not renderer:
        raise ValueError(f"Unsupported template id: {template_id}")
    return renderer(case_data)


def generateFromTemplate(template_id: str, caseData: Dict[str, Any]) -> str:
    return generate_from_template(template_id, caseData)
