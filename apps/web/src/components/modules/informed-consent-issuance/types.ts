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

export type ConsentType = {
  id: string;
  title: Bilingual;
  riskLevel: "low" | "moderate" | "high";
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
  procedureDescription: string;
  diagnosisReason: string;
  expectedBenefits: string;
  materialRisks: string;
  alternativesExplained: string;
  refusalConsequences: string;
  patientQuestions: string;
  physicianConfirmed: boolean;
};

export type SignatureState = {
  patientSigned: boolean;
  physicianSigned: boolean;
  witnessSigned: boolean;
  interpreterSigned: boolean;
  otpVerified: boolean;
  pdfFillerSelected: boolean;
};

export type LegalReadinessCheck = {
  key: string;
  label: Bilingual;
  passed: boolean;
};

export const CONSENT_TYPES: ConsentType[] = [
  { id: "surgical", title: { ar: "موافقة الإجراء الجراحي", en: "Surgical Procedure Consent" }, riskLevel: "high" },
  { id: "anesthesia", title: { ar: "موافقة التخدير", en: "Anesthesia Consent" }, riskLevel: "high" },
  { id: "blood", title: { ar: "موافقة نقل الدم", en: "Blood Transfusion Consent" }, riskLevel: "high" },
  { id: "high-risk", title: { ar: "موافقة الإجراء عالي الخطورة", en: "High-Risk Procedure Consent" }, riskLevel: "high" },
  { id: "ama", title: { ar: "الخروج ضد النصيحة الطبية", en: "Discharge Against Medical Advice" }, riskLevel: "moderate" },
  { id: "telemedicine", title: { ar: "موافقة الطب الاتصالي", en: "Telemedicine Consent" }, riskLevel: "low" },
  { id: "media", title: { ar: "موافقة التصوير الطبي / الإعلامي", en: "Clinical Photography / Media Consent" }, riskLevel: "moderate" },
  { id: "data-sharing", title: { ar: "موافقة مشاركة البيانات", en: "Data Sharing Consent" }, riskLevel: "moderate" },
];

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
  patientName: "أحمد خالد السبيعي | Ahmed Khalid Al-Subaie",
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
  procedureDescription: "Laparoscopic cholecystectomy with potential conversion to open surgery if indicated.",
  diagnosisReason: "Symptomatic gallstones with recurrent biliary colic and inflammation.",
  expectedBenefits: "Pain relief, reduced recurrence, and prevention of complications.",
  materialRisks: "Bleeding, infection, bile duct injury, anesthesia-related complications.",
  alternativesExplained: "Conservative management, delayed surgery, and dietary control.",
  refusalConsequences: "Risk of recurrent pain, infection, pancreatitis, and emergency surgery.",
  patientQuestions: "Patient asked about recovery timeline and anesthesia safety.",
  physicianConfirmed: false,
};

export const DEFAULT_SIGNATURES: SignatureState = {
  patientSigned: false,
  physicianSigned: false,
  witnessSigned: false,
  interpreterSigned: false,
  otpVerified: false,
  pdfFillerSelected: false,
};

export const ROLE_OPTIONS: UserRole[] = ["Doctor", "Nurse", "Legal", "Admin"];
