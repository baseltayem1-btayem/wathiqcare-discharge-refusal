from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict

from backend.discharge.home_healthcare.homecare_agreement_engine import render_homecare_agreement_html


@dataclass(frozen=True)
class MedicalLegalFormTemplate:
    key: str
    title: str
    code: str
    version: str
    locked_template: bool
    bilingual: bool


def _safe(value: str | None) -> str:
    return (value or "").strip()


def _fmt_date(value: str | None) -> str:
    if not value:
        return ""
    try:
        return datetime.fromisoformat(value).strftime("%Y-%m-%d")
    except Exception:
        return value


def _fmt_datetime_time(value: str | None) -> str:
    if not value:
        return ""
    try:
        return datetime.fromisoformat(value).strftime("%H:%M")
    except Exception:
        return value


def render_medical_discharge_refusal_form(context: Dict[str, str]) -> str:
    return f"""
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <title>Medical Discharge Refusal Form</title>
  <style>
    body {{ font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a; margin: 20px; }}
    h1, h2, h3 {{ margin: 0; }}
    .mt {{ margin-top: 14px; }}
    .line {{ border-bottom: 1px solid #334155; min-height: 20px; }}
    .small {{ font-size: 12px; color: #334155; }}
  </style>
</head>
<body>
  <p>Form Code: IMC-PAT-DIS-REF-01</p>
  <p>International Medical Center - Jeddah</p>
  <h1>Medical Discharge Refusal Form</h1>

  <div class=\"mt\">Patient Name: {_safe(context.get("patient_name"))}</div>
  <div>Medical Record Number (MRN): {_safe(context.get("medical_record_number"))}</div>
  <div>National ID / Iqama Number: {_safe(context.get("patient_id_number"))}</div>
  <div>Room Number: {_safe(context.get("room_number"))}</div>
  <div>Department/Ward: {_safe(context.get("department"))}</div>

  <div class=\"mt\">Date of Medical Discharge Decision: {_fmt_date(context.get("discharge_decision_at"))}</div>
  <div>Attending Physician: {_safe(context.get("attending_physician"))}</div>

  <h2 class=\"mt\">Declaration of Medical Discharge Refusal</h2>
  <p>I hereby acknowledge that the attending physician has informed me that I am medically fit for discharge and that continued hospitalization is no longer medically necessary.</p>
  <p>The attending physician and the healthcare team have explained to me the medical condition, the recommended discharge plan, and the potential risks associated with remaining in the hospital after the medical discharge decision.</p>
  <p>Despite this explanation, I voluntarily choose to remain in the hospital and refuse to proceed with the discharge process at this time.</p>
  <p>I understand that my decision may expose me to medical, administrative, and financial consequences.</p>
  <p>I further acknowledge that I have been given the opportunity to ask questions and that all my questions have been answered to my satisfaction.</p>
  <p>By signing below, I confirm that my refusal of discharge is made voluntarily and without coercion.</p>

  <div class=\"mt\">Patient / Legal Representative Name: {_safe(context.get("patient_name"))}</div>
  <div>Relationship to Patient (if applicable): {_safe(context.get("relationship"))}</div>
  <div>Signature: {_safe(context.get("patient_signature"))}</div>
  <div>Date: {_fmt_date(context.get("generated_at"))}</div>
  <div>Time: {_safe(context.get("time")) or _fmt_datetime_time(context.get("generated_at"))}</div>

  <h3 class=\"mt\">If the Patient Refuses to Sign</h3>
  <p>If the patient or legal representative refuses to sign this form, the refusal shall be documented in the presence of two healthcare staff witnesses.</p>

  <div>Witness 1 Name: {_safe(context.get("witness_1_name"))}</div>
  <div>Position: {_safe(context.get("witness1_role"))}</div>
  <div>Signature: {_safe(context.get("witness1_signature"))}</div>
  <div>Date: {_fmt_date(context.get("generated_at"))}</div>

  <div class=\"mt\">Witness 2 Name: {_safe(context.get("witness_2_name"))}</div>
  <div>Position: {_safe(context.get("witness2_role"))}</div>
  <div>Signature: {_safe(context.get("witness2_signature"))}</div>
  <div>Date: {_fmt_date(context.get("generated_at"))}</div>

  <div class=\"mt\">Attending Physician Signature: {_safe(context.get("attending_physician_signature"))}</div>
  <div>Name: {_safe(context.get("attending_physician"))}</div>
  <div>Date: {_fmt_date(context.get("generated_at"))}</div>

  <div class=\"mt\">Nursing Staff Signature: {_safe(context.get("nurse_signature"))}</div>
  <div>Name: {_safe(context.get("nurse_name"))}</div>
  <div>Date: {_fmt_date(context.get("generated_at"))}</div>
</body>
</html>
""".strip()


def render_financial_responsibility_notice_en(context: Dict[str, str]) -> str:
    return f"""
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <title>Notification and Acknowledgment of Financial Responsibility for Refusal of Medical Discharge</title>
  <style>
    body {{ font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a; margin: 20px; }}
    h1 {{ margin: 0; }}
  </style>
</head>
<body>
  <p>International Medical Center - Jeddah</p>
  <h1>Notification and Acknowledgment of Financial Responsibility for Refusal of Medical Discharge</h1>

  <p>Date: {_fmt_date(context.get("generated_at"))}</p>
  <p>Reference No.: {_safe(context.get("reference_number"))}</p>
  <p>To: {_safe(context.get("patient_name_or_guardian") or context.get("patient_name"))}</p>
  <p>National ID Number: {_safe(context.get("patient_id_number"))}</p>
  <p>Medical Record Number: {_safe(context.get("medical_record_number"))}</p>
  <p>Room Number: {_safe(context.get("room_number"))}</p>

  <p>Dear Patient,</p>
  <p>We would like to inform you that on {_fmt_date(context.get("discharge_decision_at"))}, the attending physician has issued a medical discharge decision confirming that you are medically fit for discharge and that continued hospitalization is no longer medically required.</p>
  <p>As you have chosen to remain in the hospital beyond the medical discharge decision, please be advised that insurance providers or guarantor entities may not cover any hospitalization costs or services provided after the discharge decision has been issued.</p>
  <p>Accordingly, you may be personally responsible for all costs associated with your continued stay in the hospital, including but not limited to:</p>

  <p>• Accommodation and room charges</p>
  <p>• Nursing services</p>
  <p>• Medical consultations</p>
  <p>• Medications</p>
  <p>• Laboratory tests</p>
  <p>• Radiology services</p>
  <p>• Any additional medical or administrative services provided during the extended stay</p>

  <p>By signing below, you acknowledge that you have been informed of the medical discharge decision and that you understand and accept full financial responsibility for any costs incurred due to your decision to remain in the hospital after the discharge decision.</p>

  <p>Patient / Legal Representative Name: {_safe(context.get("patient_name"))}</p>
  <p>Signature: {_safe(context.get("patient_signature"))}</p>
  <p>Date: {_fmt_date(context.get("generated_at"))}</p>
  <p>Time: {_safe(context.get("time")) or _fmt_datetime_time(context.get("generated_at"))}</p>

  <p>Hospital Representative Name: {_safe(context.get("representative_name"))}</p>
  <p>Department: {_safe(context.get("department"))}</p>
  <p>Signature: {_safe(context.get("representative_signature"))}</p>
  <p>Date: {_fmt_date(context.get("generated_at"))}</p>
</body>
</html>
""".strip()


def render_financial_responsibility_notice_ar(context: Dict[str, str]) -> str:
    return f"""
<!DOCTYPE html>
<html lang=\"ar\" dir=\"rtl\">
<head>
  <meta charset=\"utf-8\" />
  <title>خطاب إشعار وإقرار تحمل التكاليف الناتجة عن رفض الخروج الطبي</title>
  <style>
    body {{ font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a; margin: 20px; }}
    h1 {{ margin: 0; }}
  </style>
</head>
<body>
  <h1>خطاب إشعار وإقرار تحمل التكاليف الناتجة عن رفض الخروج الطبي</h1>

  <p>الرقم: {_safe(context.get("reference_number"))}</p>
  <p>التاريخ: {_fmt_date(context.get("generated_at"))}</p>
  <p>اسم المريض وولي الأمر: {_safe(context.get("patient_name_or_guardian") or context.get("patient_name"))}</p>
  <p>رقم الهوية / الإقامة: {_safe(context.get("patient_id_number"))}</p>
  <p>رقم الملف الطبي: {_safe(context.get("medical_record_number"))}</p>
  <p>رقم الغرفة: {_safe(context.get("room_number"))}</p>

  <p>السلام عليكم ورحمة الله وبركاته،</p>

  <p>نود إفادتكم بأنه قد صدر قرار طبي يسمح لكم بالخروج من المستشفى بعد أن تبين للفريق الطبي المعالج أن حالتكم الصحية مستقرة ولا توجد حاجة طبية لاستمرار التنويم.</p>
  <p>ونظرًا لرغبتكم في البقاء داخل المستشفى بعد هذا القرار، فإن شركات التأمين أو الجهات الضامنة لا تتحمل تكاليف الإقامة أو الخدمات بعد صدور قرار الخروج الطبي.</p>
  <p>وبناءً عليه فإن بقاؤكم في المستشفى بعد صدور قرار الخروج الطبي سيكون على نفقتكم الخاصة.</p>

  <p>إقرار المريض / الممثل القانوني</p>
  <p>أقر أنا الموقع أدناه بأنني قد اطلعت على ما ورد أعلاه وأتفهم أن بقائي في المستشفى بعد قرار الخروج الطبي سيكون على نفقتي الخاصة.</p>

  <p>الاسم: {_safe(context.get("patient_name"))}</p>
  <p>رقم الهوية: {_safe(context.get("patient_id_number"))}</p>
  <p>تاريخ الإقرار: {_fmt_date(context.get("generated_at"))}</p>
  <p>التوقيع: {_safe(context.get("patient_signature"))}</p>

  <p>إدارة شؤون المرضى</p>
  <p>المركز الطبي الدولي</p>

  <p>اسم الموظف: {_safe(context.get("staff_name"))}</p>
  <p>الختم الرسمي: {_safe(context.get("official_stamp"))}</p>
</body>
</html>
""".strip()


def render_discharge_decision_record(context: Dict[str, str]) -> str:
        return f"""
<!DOCTYPE html>
<html lang=\"en\">
<head>
    <meta charset=\"utf-8\" />
    <title>Medical Discharge Decision Record</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.55; color: #0f172a; margin: 20px; }}
        h1 {{ margin: 0; }}
        .section {{ margin-top: 14px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }}
        .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }}
        .label {{ font-size: 12px; color: #64748b; text-transform: uppercase; }}
        .value {{ font-size: 14px; font-weight: 600; margin-top: 2px; }}
    </style>
</head>
<body>
    <p>Form Code: IMC-PAT-DIS-DEC-01</p>
    <p>International Medical Center - Jeddah</p>
    <h1>Medical Discharge Decision Record</h1>

    <div class=\"section\">
        <div class=\"grid\">
            <div><div class=\"label\">Patient Name</div><div class=\"value\">{_safe(context.get("patient_name"))}</div></div>
            <div><div class=\"label\">Patient ID Number</div><div class=\"value\">{_safe(context.get("patient_id_number"))}</div></div>
            <div><div class=\"label\">Medical Record Number</div><div class=\"value\">{_safe(context.get("medical_record_number"))}</div></div>
            <div><div class=\"label\">Room Number</div><div class=\"value\">{_safe(context.get("room_number"))}</div></div>
            <div><div class=\"label\">Department</div><div class=\"value\">{_safe(context.get("department"))}</div></div>
            <div><div class=\"label\">Attending Physician</div><div class=\"value\">{_safe(context.get("attending_physician"))}</div></div>
            <div><div class=\"label\">Decision Date/Time</div><div class=\"value\">{_fmt_date(context.get("discharge_decision_at"))}</div></div>
            <div><div class=\"label\">Generated At</div><div class=\"value\">{_fmt_date(context.get("generated_at"))}</div></div>
        </div>
    </div>

    <div class=\"section\">
        <p><strong>Clinical Summary</strong></p>
        <p>{_safe(context.get("discussion_summary") or context.get("refusal_reason") or context.get("clinical_summary"))}</p>
    </div>

    <div class=\"section\">
        <p><strong>Decision Statement</strong></p>
        <p>
            The attending physician confirms that the patient is medically fit for discharge according
            to clinical assessment and hospital discharge policy.
        </p>
    </div>
</body>
</html>
""".strip()


FORMS_LIBRARY: Dict[str, MedicalLegalFormTemplate] = {
    "discharge_refusal_form": MedicalLegalFormTemplate(
        key="discharge_refusal_form",
        title="Medical Discharge Refusal Form",
        code="IMC-PAT-DIS-REF-01",
        version="1.0",
        locked_template=True,
        bilingual=True,
    ),
    "financial_responsibility_notice": MedicalLegalFormTemplate(
        key="financial_responsibility_notice",
        title="Notification and Acknowledgment of Financial Responsibility for Refusal of Medical Discharge",
        code="IMC-PAT-DIS-NOT-01",
        version="1.0",
        locked_template=True,
        bilingual=True,
    ),
    "financial_responsibility_notice_ar": MedicalLegalFormTemplate(
        key="financial_responsibility_notice_ar",
        title="خطاب إشعار وإقرار تحمل التكاليف الناتجة عن رفض الخروج الطبي",
        code="IMC-PAT-DIS-NOT-01-AR",
        version="1.0",
        locked_template=True,
        bilingual=True,
    ),
    "home_healthcare_agreement": MedicalLegalFormTemplate(
        key="home_healthcare_agreement",
        title="Home Healthcare Agreement",
        code="IMC-HHC-PDN-01",
        version="1.0",
        locked_template=True,
        bilingual=True,
    ),
    "discharge_decision_record": MedicalLegalFormTemplate(
        key="discharge_decision_record",
        title="Medical Discharge Decision Record",
        code="IMC-PAT-DIS-DEC-01",
        version="1.0",
        locked_template=True,
        bilingual=True,
    ),
}


def render_form_by_key(template_key: str, context: Dict[str, str]) -> str:
    if template_key == "discharge_refusal_form":
        return render_medical_discharge_refusal_form(context)
    if template_key == "financial_responsibility_notice":
        return render_financial_responsibility_notice_en(context)
    if template_key == "financial_responsibility_notice_ar":
        return render_financial_responsibility_notice_ar(context)
    if template_key == "home_healthcare_agreement":
        return render_homecare_agreement_html(context)
    if template_key == "discharge_decision_record":
        return render_discharge_decision_record(context)
    raise ValueError("Unsupported medical legal form template")
