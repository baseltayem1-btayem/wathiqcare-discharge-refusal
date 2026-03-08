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
        <h1>Notification and Acknowledgment of Financial Responsibility for Refusal of Medical Discharge</h1>
        <p><strong>Code:</strong> ${DOCUMENT_CODES.financialResponsibilityNotice}</p>
        <p><strong>Date:</strong> ${payload.documentDate ?? ""}</p>
        <p><strong>Ref:</strong> ${payload.referenceNumber ?? ""}</p>
        <p><strong>Patient / Legal Guardian Name:</strong> ${payload.patientOrGuardianName ?? payload.patientName ?? ""}</p>
        <p><strong>National ID Number:</strong> ${payload.patientIdNumber ?? ""}</p>
        <p><strong>Medical Record Number:</strong> ${payload.medicalRecordNumber ?? ""}</p>
        <p><strong>Room Number:</strong> ${payload.roomNumber ?? ""}</p>
        <p><strong>Date of Medical Discharge Decision:</strong> ${payload.dischargeDecisionAt ?? ""}</p>
        <p><strong>Acknowledgment:</strong> Continued refusal after discharge decision may result in financial responsibility per hospital policy and regulations.</p>
        <p><strong>Patient / Legal Guardian Signature:</strong> ____________________</p>
        <p><strong>Patient Affairs Signature / Stamp:</strong> ____________________</p>
      </div>
    `;
  },
  buildFileName(payload): string {
    const mrn = (payload.medicalRecordNumber || "unknown").trim() || "unknown";
    return `financial_notice_${mrn}.html`;
  },
};

registerDocumentTemplate(financialResponsibilityNoticeTemplate);
