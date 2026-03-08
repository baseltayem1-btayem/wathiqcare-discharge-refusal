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
        <h1>Medical Discharge Refusal Form</h1>
        <p><strong>Code:</strong> ${DOCUMENT_CODES.dischargeRefusalForm}</p>
        <p><strong>Full Name:</strong> ${payload.patientName ?? ""}</p>
        <p><strong>ID / Iqama Number:</strong> ${payload.patientIdNumber ?? ""}</p>
        <p><strong>Medical Record Number:</strong> ${payload.medicalRecordNumber ?? ""}</p>
        <p><strong>Room Number:</strong> ${payload.roomNumber ?? ""}</p>
        <p><strong>Attending Physician Name:</strong> ${payload.attendingPhysicianName ?? ""}</p>
        <p><strong>Discharge Decision Date:</strong> ${payload.dischargeDecisionAt ?? ""}</p>
        <p><strong>Case details / explanation:</strong> ${payload.discussionSummary ?? ""}</p>
        <p><strong>Reasons for refusal:</strong> ${payload.refusalReason ?? ""}</p>
        <p><strong>Social Services / Patient Affairs:</strong> ${payload.socialServicesSummary ?? ""}</p>
        <p><strong>Patient acknowledgment:</strong> The patient/legal representative acknowledges refusal of medical discharge after explanation.</p>
        <p><strong>Patient/Representative Signature:</strong> ____________________</p>
        <p><strong>Witness 1 Signature:</strong> ____________________</p>
        <p><strong>Witness 2 Signature:</strong> ____________________</p>
      </div>
    `;
  },
  buildFileName(payload): string {
    const mrn = (payload.medicalRecordNumber || "unknown").trim() || "unknown";
    return `discharge_refusal_form_${mrn}.html`;
  },
};

registerDocumentTemplate(dischargeRefusalFormTemplate);
