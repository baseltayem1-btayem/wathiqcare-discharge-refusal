import type { ClinicalKnowledgeAssembly } from "@/lib/clinical-knowledge/types";

export type { ClinicalKnowledgeAssembly };

export type ProductionPatient = {
  id: string;
  mrn: string;
  name: string;
  caseId?: string;
  caseNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  nationalId?: string | null;
  iqamaNumber?: string | null;
  mobileNumber?: string | null;
  emergencyContact?: string | null;
  emergencyContactPhone?: string | null;
  email?: string | null;
  source?: "trakcare" | "case_fallback" | "pilot_fallback";
  languagePreference?: "en" | "ar" | "bilingual";
  capacityStatus?: "competent" | "minor" | "incapacitated" | "guardian-required";
};

export type ProductionEncounter = {
  id: string;
  encounterId: string;
  admissionDate?: string | null;
  department?: string | null;
  physician?: string | null;
  physicianLicense?: string | null;
  physicianId?: string | null;
  diagnosis?: string | null;
  procedure?: string | null;
  allergies?: string | null;
  currentMedications?: string | null;
  physicianSpecialty?: string | null;
  physicianSpecialtyEn?: string | null;
  physicianSpecialtyAr?: string | null;
  caseNumber?: string | null;
  /** Patient date of birth supplied by the encounter/patient payload as a fallback. */
  patientDateOfBirth?: string | null;
  syncStatus?: "SYNCED" | "CACHED" | "UAT_MOCK";
  isMock?: boolean;
  source?: "trakcare" | "cached_local" | "uat_mock" | "pilot_fallback";
};

export type ProductionProcedure = {
  id: string;
  procedureCode?: string;
  categoryCode?: string;
  consentType?: string;
  templateType?: string;
  titleEn: string;
  titleAr: string;
  specialty: string;
  department?: string;
  anesthesiaRequired: boolean;
};

export type ProductionAssembly = ClinicalKnowledgeAssembly;

export type PhysicianContext = {
  userId: string;
  email: string;
  name: string;
  role?: string | null;
  platformRole?: string | null;
  tenantId: string;
  licenseNumber?: string;
  specialty?: string;
  specialtyEn?: string;
  specialtyAr?: string;
  department?: string;
};

export type SecureSigningResult = {
  sessionId: string;
  documentId: string;
  dispatchStatuses: {
    sms: string;
    email: string;
  };
  status: {
    linkCreated: boolean;
    smsSent: boolean;
    opened: boolean;
    otpRequested: boolean;
    otpVerified: boolean;
    signed: boolean;
    expired: boolean;
    revoked: boolean;
    failed: boolean;
    failedAttempts: number;
  };
  createdAt: string;
  expiresAt?: string;
};

export type TimelineEvent = {
  id: string;
  type: "consent_dispatched" | "patient_opened" | "otp_verified" | "signed" | "refused" | "physician_review" | "system";
  actor: "physician" | "patient" | "system";
  actorName: string;
  timestamp: string;
  status: "completed" | "pending" | "blocked";
  summaryEn: string;
  summaryAr: string;
  evidenceHash?: string;
};

export type ApiState<T> =
  | { status: "idle"; data?: undefined; error?: undefined }
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "success"; data: T; error?: undefined }
  | { status: "error"; data?: undefined; error: string };
