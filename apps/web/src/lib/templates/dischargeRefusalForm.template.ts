import {
  DOCUMENT_CODES,
  DOCUMENT_TEMPLATE_KEYS,
  registerDocumentTemplate,
  type DocumentTemplate,
  type DocumentTemplateLocale,
} from "@/lib/services/documentTemplates.service";
import {
  validateDischargeRefusalGeneration,
  type ValidationResult,
} from "@/lib/validators/dischargeRefusal.validator";
import { buildTenantInstitutionLabel } from "@/lib/server/tenantBranding";

export type DischargeRefusalTemplatePayload = {
  patientName?: string;
  patientIdNumber?: string;
  medicalRecordNumber?: string;
  roomNumber?: string;
  attendingPhysicianName?: string;
  dischargeDecisionAt?: string;
  discussionSummary?: string;
  refusalReason?: string;
  socialServicesSummary?: string;
};

function escapeHtml(value: string | undefined): string {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const dischargeRefusalFormTemplate: DocumentTemplate<DischargeRefusalTemplatePayload> = {
  key: DOCUMENT_TEMPLATE_KEYS.dischargeRefusalForm,
  documentCode: DOCUMENT_CODES.dischargeRefusalForm,
  titleEn: "Medical Discharge Refusal Form",
  titleAr: "نموذج رفض الخروج الطبي",
  validate(payload): ValidationResult {
    return validateDischargeRefusalGeneration(payload);
  },
  renderHtml(payload, options): string {
    const locale: DocumentTemplateLocale = options?.locale === "ar" ? "ar" : "en";
    const isArabic = locale === "ar";
    const title = isArabic ? "نموذج رفض الخروج الطبي" : "Medical Discharge Refusal Form";
    const institution = buildTenantInstitutionLabel(options?.tenantName);
    const codeLabel = isArabic ? "الرمز" : "Form Code";
    const nameLabel = isArabic ? "الاسم الكامل" : "Full Name";
    const idLabel = isArabic ? "رقم الهوية / الإقامة" : "National ID / Iqama Number";
    const mrnLabel = isArabic ? "رقم السجل الطبي" : "Medical Record Number";
    const roomLabel = isArabic ? "رقم الغرفة" : "Room Number";
    const physicianLabel = isArabic ? "اسم الطبيب المعالج" : "Attending Physician";
    const decisionLabel = isArabic ? "تاريخ قرار الخروج" : "Discharge Decision Date";
    const summaryLabel = isArabic ? "تفاصيل الحالة / الشرح" : "Case Discussion Summary";
    const reasonLabel = isArabic ? "أسباب الرفض" : "Refusal Reason";
    const supportLabel = isArabic ? "الخدمات الاجتماعية / علاقات المرضى" : "Social Services / Patient Relations Summary";
    const declarationLabel = isArabic ? "إقرار المريض" : "Patient Acknowledgment";
    const declarationText = isArabic
      ? "يقر المريض أو الممثل النظامي برفض الخروج الطبي بعد الشرح والتوضيح الكامل للمخاطر والبدائل وخطة الخروج الموصى بها."
      : "The patient or legal representative acknowledges refusal of medical discharge after receiving a full explanation of the risks, alternatives, and recommended discharge plan.";
    const patientSignatureLabel = isArabic ? "توقيع المريض / الممثل النظامي" : "Patient / Legal Representative Signature";
    const witnessOneLabel = isArabic ? "توقيع الشاهد الأول" : "Witness 1 Signature";
    const witnessTwoLabel = isArabic ? "توقيع الشاهد الثاني" : "Witness 2 Signature";

    return `<!DOCTYPE html>
<html lang="${locale}" dir="${isArabic ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: ${isArabic ? '"Tahoma", "Arial", sans-serif' : '"Arial", sans-serif'}; line-height: 1.7; color: #0f172a; margin: 24px; }
    .document { max-width: 860px; margin: 0 auto; }
    h1 { margin: 0 0 12px; font-size: 28px; }
    p { margin: 0 0 10px; }
    .muted { color: #475569; }
    .block { margin-top: 18px; padding: 16px; border: 1px solid #cbd5e1; border-radius: 12px; }
    .signature { margin-top: 14px; min-height: 28px; border-bottom: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="document">
    <p class="muted">${institution}</p>
    <h1>${title}</h1>
    <p><strong>${codeLabel}:</strong> ${DOCUMENT_CODES.dischargeRefusalForm}</p>
    <div class="block">
      <p><strong>${nameLabel}:</strong> ${escapeHtml(payload.patientName)}</p>
      <p><strong>${idLabel}:</strong> ${escapeHtml(payload.patientIdNumber)}</p>
      <p><strong>${mrnLabel}:</strong> ${escapeHtml(payload.medicalRecordNumber)}</p>
      <p><strong>${roomLabel}:</strong> ${escapeHtml(payload.roomNumber)}</p>
      <p><strong>${physicianLabel}:</strong> ${escapeHtml(payload.attendingPhysicianName)}</p>
      <p><strong>${decisionLabel}:</strong> ${escapeHtml(payload.dischargeDecisionAt)}</p>
      <p><strong>${summaryLabel}:</strong> ${escapeHtml(payload.discussionSummary)}</p>
      <p><strong>${reasonLabel}:</strong> ${escapeHtml(payload.refusalReason)}</p>
      <p><strong>${supportLabel}:</strong> ${escapeHtml(payload.socialServicesSummary)}</p>
    </div>
    <div class="block">
      <p><strong>${declarationLabel}:</strong> ${declarationText}</p>
      <p><strong>${patientSignatureLabel}:</strong></p>
      <div class="signature"></div>
      <p><strong>${witnessOneLabel}:</strong></p>
      <div class="signature"></div>
      <p><strong>${witnessTwoLabel}:</strong></p>
      <div class="signature"></div>
    </div>
  </div>
</body>
</html>`;
  },
  buildFileName(payload): string {
    const mrn = (payload.medicalRecordNumber || "unknown").trim() || "unknown";
    return `discharge_refusal_form_${mrn}.html`;
  },
};

registerDocumentTemplate(dischargeRefusalFormTemplate);
