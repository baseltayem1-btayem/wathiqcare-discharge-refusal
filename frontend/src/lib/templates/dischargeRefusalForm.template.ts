import {
  DOCUMENT_CODES,
  DOCUMENT_TEMPLATE_KEYS,
  registerDocumentTemplate,
  type DocumentTemplate,
} from "@/lib/services/documentTemplates.service";
import {
  validateDischargeRefusalGeneration,
  type ValidationResult,
} from "@/lib/validators/dischargeRefusal.validator";

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

export const dischargeRefusalFormTemplate: DocumentTemplate<DischargeRefusalTemplatePayload> = {
  key: DOCUMENT_TEMPLATE_KEYS.dischargeRefusalForm,
  documentCode: DOCUMENT_CODES.dischargeRefusalForm,
  titleEn: "Medical Discharge Refusal Form",
  titleAr: "نموذج رفض الخروج الطبي",
  validate(payload): ValidationResult {
    return validateDischargeRefusalGeneration(payload);
  },
  renderHtml(payload): string {
    return `
      <div>
        <h1>نموذج رفض الخروج الطبي</h1>
        <p><strong>الرمز:</strong> ${DOCUMENT_CODES.dischargeRefusalForm}</p>
        <p><strong>الاسم الكامل:</strong> ${payload.patientName ?? ""}</p>
        <p><strong>رقم الهوية / الإقامة:</strong> ${payload.patientIdNumber ?? ""}</p>
        <p><strong>رقم السجل الطبي:</strong> ${payload.medicalRecordNumber ?? ""}</p>
        <p><strong>رقم الغرفة:</strong> ${payload.roomNumber ?? ""}</p>
        <p><strong>اسم الطبيب المعالج:</strong> ${payload.attendingPhysicianName ?? ""}</p>
        <p><strong>تاريخ قرار الخروج:</strong> ${payload.dischargeDecisionAt ?? ""}</p>
        <p><strong>تفاصيل الحالة / الشرح:</strong> ${payload.discussionSummary ?? ""}</p>
        <p><strong>أسباب الرفض:</strong> ${payload.refusalReason ?? ""}</p>
        <p><strong>الخدمات الاجتماعية / علاقات المرضى:</strong> ${payload.socialServicesSummary ?? ""}</p>
        <p><strong>إقرار المريض:</strong> يقر المريض / الممثل النظامي برفض الخروج الطبي بعد الشرح والتوضيح.</p>
        <p><strong>توقيع المريض / الممثل النظامي:</strong> ____________________</p>
        <p><strong>توقيع الشاهد الأول:</strong> ____________________</p>
        <p><strong>توقيع الشاهد الثاني:</strong> ____________________</p>
      </div>
    `;
  },
  buildFileName(payload): string {
    const mrn = (payload.medicalRecordNumber || "unknown").trim() || "unknown";
    return `discharge_refusal_form_${mrn}.html`;
  },
};

registerDocumentTemplate(dischargeRefusalFormTemplate);
