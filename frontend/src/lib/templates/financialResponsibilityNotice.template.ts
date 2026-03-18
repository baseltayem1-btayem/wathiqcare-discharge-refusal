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

export type FinancialResponsibilityNoticePayload = {
  documentDate?: string;
  referenceNumber?: string;
  patientOrGuardianName?: string;
  patientName?: string;
  patientIdNumber?: string;
  medicalRecordNumber?: string;
  roomNumber?: string;
  dischargeDecisionAt?: string;
  attendingPhysicianName?: string;
  refusalReason?: string;
  discussionSummary?: string;
};

function escapeHtml(value: string | undefined): string {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const financialResponsibilityNoticeTemplate: DocumentTemplate<FinancialResponsibilityNoticePayload> = {
  key: DOCUMENT_TEMPLATE_KEYS.financialResponsibilityNotice,
  documentCode: DOCUMENT_CODES.financialResponsibilityNotice,
  titleEn: "Notification and Acknowledgment of Financial Responsibility for Refusal of Medical Discharge",
  titleAr: "خطاب إشعار وإقرار بتحمل التكاليف الناتجة عن رفض الخروج الطبي",
  validate(payload): ValidationResult {
    return validateDischargeRefusalGeneration({
      patientName: payload.patientName ?? payload.patientOrGuardianName,
      patientIdNumber: payload.patientIdNumber,
      medicalRecordNumber: payload.medicalRecordNumber,
      roomNumber: payload.roomNumber,
      attendingPhysicianName: payload.attendingPhysicianName,
      dischargeDecisionAt: payload.dischargeDecisionAt,
      refusalReason: payload.refusalReason,
      discussionSummary: payload.discussionSummary,
    });
  },
  renderHtml(payload, options): string {
    const locale: DocumentTemplateLocale = options?.locale === "ar" ? "ar" : "en";
    const isArabic = locale === "ar";
    const title = isArabic
      ? "إشعار وإقرار بتحمل المسؤولية المالية الناتجة عن رفض الخروج الطبي"
      : "Notification and Acknowledgment of Financial Responsibility for Refusal of Medical Discharge";
    const institution = isArabic ? "المركز الطبي الدولي - جدة" : "International Medical Center - Jeddah";
    const codeLabel = isArabic ? "الرمز" : "Form Code";
    const dateLabel = isArabic ? "التاريخ" : "Date";
    const referenceLabel = isArabic ? "المرجع" : "Reference No.";
    const patientLabel = isArabic ? "اسم المريض / ولي الأمر" : "Patient / Legal Representative Name";
    const idLabel = isArabic ? "رقم الهوية الوطنية" : "National ID Number";
    const mrnLabel = isArabic ? "رقم السجل الطبي" : "Medical Record Number";
    const roomLabel = isArabic ? "رقم الغرفة" : "Room Number";
    const decisionLabel = isArabic ? "تاريخ قرار الخروج الطبي" : "Medical Discharge Decision Date";
    const acknowledgmentLabel = isArabic ? "الإقرار" : "Acknowledgment";
    const acknowledgmentText = isArabic
      ? "تم توضيح أن الاستمرار في الإقامة بعد قرار الخروج الطبي قد يترتب عليه تحمل جميع التكاليف المالية غير المغطاة وفقًا لسياسات المستشفى والأنظمة المعمول بها."
      : "The patient has been informed that remaining admitted after the medical discharge decision may result in personal financial responsibility for all non-covered costs according to hospital policy and applicable regulations.";
    const signatureLabel = isArabic ? "توقيع المريض / ولي الأمر" : "Patient / Legal Representative Signature";
    const representativeLabel = isArabic ? "توقيع / ختم علاقات المرضى" : "Patient Relations Signature / Stamp";
    const patientOrGuardian = payload.patientOrGuardianName ?? payload.patientName;

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
    <p><strong>${codeLabel}:</strong> ${DOCUMENT_CODES.financialResponsibilityNotice}</p>
    <div class="block">
      <p><strong>${dateLabel}:</strong> ${escapeHtml(payload.documentDate)}</p>
      <p><strong>${referenceLabel}:</strong> ${escapeHtml(payload.referenceNumber)}</p>
      <p><strong>${patientLabel}:</strong> ${escapeHtml(patientOrGuardian)}</p>
      <p><strong>${idLabel}:</strong> ${escapeHtml(payload.patientIdNumber)}</p>
      <p><strong>${mrnLabel}:</strong> ${escapeHtml(payload.medicalRecordNumber)}</p>
      <p><strong>${roomLabel}:</strong> ${escapeHtml(payload.roomNumber)}</p>
      <p><strong>${decisionLabel}:</strong> ${escapeHtml(payload.dischargeDecisionAt)}</p>
      <p><strong>${acknowledgmentLabel}:</strong> ${acknowledgmentText}</p>
      <p><strong>${signatureLabel}:</strong></p>
      <div class="signature"></div>
      <p><strong>${representativeLabel}:</strong></p>
      <div class="signature"></div>
    </div>
  </div>
</body>
</html>`;
  },
  buildFileName(payload): string {
    const mrn = (payload.medicalRecordNumber || "unknown").trim() || "unknown";
    return `financial_notice_${mrn}.html`;
  },
};

registerDocumentTemplate(financialResponsibilityNoticeTemplate);
