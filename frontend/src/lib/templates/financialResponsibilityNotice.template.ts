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
  renderHtml(payload): string {
    return `
      <div>
        <h1>إشعار وإقرار بتحمل المسؤولية المالية الناتجة عن رفض الخروج الطبي</h1>
        <p><strong>الرمز:</strong> ${DOCUMENT_CODES.financialResponsibilityNotice}</p>
        <p><strong>التاريخ:</strong> ${payload.documentDate ?? ""}</p>
        <p><strong>المرجع:</strong> ${payload.referenceNumber ?? ""}</p>
        <p><strong>اسم المريض / ولي الأمر:</strong> ${payload.patientOrGuardianName ?? payload.patientName ?? ""}</p>
        <p><strong>رقم الهوية الوطنية:</strong> ${payload.patientIdNumber ?? ""}</p>
        <p><strong>رقم السجل الطبي:</strong> ${payload.medicalRecordNumber ?? ""}</p>
        <p><strong>رقم الغرفة:</strong> ${payload.roomNumber ?? ""}</p>
        <p><strong>تاريخ قرار الخروج الطبي:</strong> ${payload.dischargeDecisionAt ?? ""}</p>
        <p><strong>الإقرار:</strong> استمرار الرفض بعد قرار الخروج قد يترتب عليه تحمل التكاليف المالية وفقًا لسياسات المستشفى والأنظمة المعمول بها.</p>
        <p><strong>توقيع المريض / ولي الأمر:</strong> ____________________</p>
        <p><strong>توقيع / ختم علاقات المرضى:</strong> ____________________</p>
      </div>
    `;
  },
  buildFileName(payload): string {
    const mrn = (payload.medicalRecordNumber || "unknown").trim() || "unknown";
    return `financial_notice_${mrn}.html`;
  },
};

registerDocumentTemplate(financialResponsibilityNoticeTemplate);
