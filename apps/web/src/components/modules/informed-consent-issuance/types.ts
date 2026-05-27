export type Language = "ar" | "en";

export type Bilingual = {
  ar: string;
  en: string;
};

export type UserRole = "Doctor" | "Nurse" | "Legal" | "Admin";

export type StepStatus = "pending" | "completed" | "blocked";

export type WorkflowStep = {
  id: number;
  title: Bilingual;
  status: StepStatus;
  timestamp: string;
  responsibleUser: string;
};

/**
 * Lifecycle status of a consent type within the WathiqCare platform.
 *
 * - `pilot-ready` : Fully validated end-to-end (template + workflow + signing + PDF + audit chain).
 *                   Visible in the consent selector during the controlled pilot.
 * - `active`      : Generally available (post-pilot). Visible in production.
 * - `coming-soon` : Template/workflow not yet validated. Hidden from the selector during pilot.
 * - `disabled`    : Explicitly turned off. Hidden from the selector.
 *
 * See `pilot-package/CONSENT_TYPE_READINESS_MATRIX.md` for current status per type.
 */
export type ConsentTypeStatus = "pilot-ready" | "active" | "coming-soon" | "disabled";

export type ConsentType = {
  id: string;
  title: Bilingual;
  riskLevel: "low" | "moderate" | "high";
  /** Lifecycle status. Only `pilot-ready` and `active` types are exposed in the selector. */
  status: ConsentTypeStatus;
};

export type PatientCapacityStatus = "competent" | "minor" | "unconscious" | "representative required";

export type PatientInfo = {
  patientName: string;
  mrn: string;
  nationalId: string;
  dateOfBirth: string;
  gender: Bilingual;
  department: string;
  treatingPhysician: string;
  admissionNumber: string;
  capacityStatus: PatientCapacityStatus;
};

export type MedicalExplanationState = {
  aiDraftDisclaimer: string;
  aiDraftStatus: "approved" | "idle" | "pending-physician-review" | "rejected";
  procedureDescription: string;
  diagnosisReason: string;
  expectedBenefits: string;
  materialRisks: string;
  alternativesExplained: string;
  patientEducationSummary: string;
  postProcedureInstructions: string;
  refusalConsequences: string;
  patientQuestions: string;
  physicianConfirmed: boolean;
};

export type SignatureState = {
  selectedMethod: "otp" | "tablet-drawn-signature" | "biometric-fingerprint" | "combined-tablet-and-otp" | "combined-biometric-and-otp";
  acknowledgmentAccepted: boolean;
  patientSigned: boolean;
  physicianSigned: boolean;
  witnessSigned: boolean;
  interpreterSigned: boolean;
  otpVerified: boolean;
  signatureEvidenceReady: boolean;
  signatureEvidenceReference: string;
  signatureDataUrl: string;
  deviceLabel: string;
  staffWitnessName: string;
  biometricVerified: boolean;
  biometricDeviceReference: string;
  biometricTransactionId: string;
  biometricVerificationHash: string;
  biometricTimestamp: string;
  biometricSdkProvider: string;
  biometricDeviceModel: string;
  biometricLocalAgentStatus: "idle" | "detecting" | "ready" | "verifying" | "verified" | "unavailable" | "error";
  biometricLocalAgentMessage: string;
};

export type LegalReadinessCheck = {
  key: string;
  label: Bilingual;
  passed: boolean;
};

export const CONSENT_TYPES: ConsentType[] = [
  { id: "surgical", title: { ar: "موافقة الإجراء الجراحي", en: "Surgical Procedure Consent" }, riskLevel: "high", status: "pilot-ready" },
  { id: "anesthesia", title: { ar: "موافقة التخدير", en: "Anesthesia Consent" }, riskLevel: "high", status: "coming-soon" },
  { id: "blood", title: { ar: "موافقة نقل الدم", en: "Blood Transfusion Consent" }, riskLevel: "high", status: "coming-soon" },
  { id: "high-risk", title: { ar: "موافقة الإجراء عالي الخطورة", en: "High-Risk Procedure Consent" }, riskLevel: "high", status: "coming-soon" },
  { id: "ama", title: { ar: "الخروج ضد النصيحة الطبية", en: "Discharge Against Medical Advice" }, riskLevel: "moderate", status: "coming-soon" },
  { id: "telemedicine", title: { ar: "موافقة الطب الاتصالي", en: "Telemedicine Consent" }, riskLevel: "low", status: "coming-soon" },
  { id: "media", title: { ar: "موافقة التصوير الطبي / الإعلامي", en: "Clinical Photography / Media Consent" }, riskLevel: "moderate", status: "coming-soon" },
  { id: "data-sharing", title: { ar: "موافقة مشاركة البيانات", en: "Data Sharing Consent" }, riskLevel: "moderate", status: "coming-soon" },
];

/**
 * Returns the consent types that should be exposed in the issuance UI.
 *
 * Pilot stabilization rule (v1.0.1+): only `pilot-ready` and `active` statuses are returned.
 * Non-operational types (`coming-soon`, `disabled`) are hidden so physicians cannot dispatch
 * a workflow that lacks a validated template, education content, signing flow, PDF generation,
 * or audit-chain integration.
 *
 * See `pilot-package/CONSENT_TYPE_READINESS_MATRIX.md`.
 */
export function getActiveConsentTypes(): ConsentType[] {
  return CONSENT_TYPES.filter((t) => t.status === "pilot-ready" || t.status === "active");
}

/** Returns true if the given consent type id is currently exposable to users. */
export function isConsentTypeExposed(consentTypeId: string | null | undefined): boolean {
  if (!consentTypeId) return false;
  return getActiveConsentTypes().some((t) => t.id === consentTypeId);
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 1, title: { ar: "التحقق من هوية المريض", en: "Patient Verification" }, status: "completed", timestamp: "2026-05-11 10:20", responsibleUser: "Nurse Amal" },
  { id: 2, title: { ar: "اختيار نوع الموافقة", en: "Consent Type Selected" }, status: "completed", timestamp: "2026-05-11 10:24", responsibleUser: "Dr. Omar" },
  { id: 3, title: { ar: "اكتمال الشرح الطبي", en: "Medical Explanation Completed" }, status: "completed", timestamp: "2026-05-11 10:31", responsibleUser: "Dr. Omar" },
  { id: 4, title: { ar: "تأكيد المخاطر/الفوائد/البدائل", en: "Risks / Benefits / Alternatives Confirmed" }, status: "pending", timestamp: "--", responsibleUser: "Dr. Omar" },
  { id: 5, title: { ar: "الإجابة على أسئلة المريض", en: "Patient Questions Answered" }, status: "pending", timestamp: "--", responsibleUser: "Dr. Omar" },
  { id: 6, title: { ar: "التوقيع مُلتقط", en: "Signature Captured" }, status: "blocked", timestamp: "--", responsibleUser: "Patient" },
  { id: 7, title: { ar: "الشاهد / المترجم مكتمل", en: "Witness / Interpreter Completed" }, status: "blocked", timestamp: "--", responsibleUser: "Legal Team" },
  { id: 8, title: { ar: "توليد PDF قانوني", en: "Legal PDF Generated" }, status: "blocked", timestamp: "--", responsibleUser: "System" },
  { id: 9, title: { ar: "أرشفة في ملف المريض", en: "Archived in Patient Record" }, status: "blocked", timestamp: "--", responsibleUser: "Admin" },
];

export const DEFAULT_PATIENT_INFO: PatientInfo = {
  patientName: "أحمد خالد السبيعي",
  mrn: "MRN-2026-000741",
  nationalId: "1023456789",
  dateOfBirth: "1986-04-17",
  gender: { ar: "ذكر", en: "Male" },
  department: "General Surgery",
  treatingPhysician: "Dr. Omar Al-Harbi",
  admissionNumber: "ADM-889201",
  capacityStatus: "competent",
};

export const DEFAULT_MEDICAL_EXPLANATION: MedicalExplanationState = {
  aiDraftDisclaimer: "AI-assisted draft. Requires physician review and approval.",
  aiDraftStatus: "idle",
  procedureDescription: "Laparoscopic cholecystectomy with potential conversion to open surgery if indicated.",
  diagnosisReason: "Symptomatic gallstones with recurrent biliary colic and inflammation.",
  expectedBenefits: "Pain relief, reduced recurrence, and prevention of complications.",
  materialRisks: "Bleeding, infection, bile duct injury, anesthesia-related complications.",
  alternativesExplained: "Conservative management, delayed surgery, and dietary control.",
  patientEducationSummary: "Patient education summary pending physician update.",
  postProcedureInstructions: "Post-procedure instructions pending physician update.",
  refusalConsequences: "Risk of recurrent pain, infection, pancreatitis, and emergency surgery.",
  patientQuestions: "Patient asked about recovery timeline and anesthesia safety.",
  physicianConfirmed: false,
};

export const DEFAULT_SIGNATURES: SignatureState = {
  selectedMethod: "otp",
  acknowledgmentAccepted: false,
  patientSigned: false,
  physicianSigned: false,
  witnessSigned: false,
  interpreterSigned: false,
  otpVerified: false,
  signatureEvidenceReady: false,
  signatureEvidenceReference: "",
  signatureDataUrl: "",
  deviceLabel: "Ward Tablet 4",
  staffWitnessName: "",
  biometricVerified: false,
  biometricDeviceReference: "",
  biometricTransactionId: "",
  biometricVerificationHash: "",
  biometricTimestamp: "",
  biometricSdkProvider: "",
  biometricDeviceModel: "",
  biometricLocalAgentStatus: "idle",
  biometricLocalAgentMessage: "",
};

export const ROLE_OPTIONS: UserRole[] = ["Doctor", "Nurse", "Legal", "Admin"];
