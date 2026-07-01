/**
 * Isolated types for the Intelligent Clinical Journey patient experience.
 */

export type PatientLanguage = "en" | "ar";
export type TextSize = "normal" | "large" | "extra-large";
export type PatientJourneyStep =
  | "landing"
  | "education"
  | "questions"
  | "decision"
  | "guardian"
  | "interpreter"
  | "signature"
  | "confirmation"
  | "refusal_acknowledgment"
  | "refusal_signature"
  | "refusal_confirmation";

export type PatientDecision = "accepted" | "refused" | undefined;
export type SignatureRole = "patient" | "guardian" | "witness" | "interpreter";

export interface AccessibilitySettings {
  language: PatientLanguage;
  textSize: TextSize;
  highContrast: boolean;
}

export interface PatientQuestion {
  id: string;
  text: string;
  answer?: string;
  askedAt: string;
  answeredAt?: string;
}

export interface SignatureRecord {
  role: SignatureRole;
  signerName: string;
  relationship?: string;
  language?: string;
  signedAt: string;
  signatureData?: string; // mock base64 canvas data URL
}

export interface PatientJourneyState {
  startedAt?: string;
  completedAt?: string;
  currentStep: PatientJourneyStep;
  accessibility: AccessibilitySettings;
  educationProgress: number; // 0–100
  educationStartedAt?: string;
  educationCompletedAt?: string;
  comprehensionScore?: number;
  comprehensionPassed?: boolean;
  questions: PatientQuestion[];
  decision?: PatientDecision;
  refusalAcknowledged?: boolean;
  signatures: SignatureRecord[];
  otpVerified: boolean;
  patientInteractions: number;
  screensViewed: number;
}

export interface PatientJourneyContext {
  patientName: string;
  patientNameAr: string;
  mrn: string;
  procedureName: string;
  procedureNameAr: string;
  physicianName: string;
  facilityName: string;
  consentReference: string;
  requiredParticipants: ("witness" | "interpreter" | "guardian")[];
  educationMaterials: { titleEn: string; titleAr: string; assetType: string; durationMinutes?: number }[];
  risks: { titleEn: string; titleAr: string; riskLevel: string }[];
}

export type TimelineActor = "physician" | "patient" | "guardian" | "interpreter" | "witness" | "system";

export type TimelineEventType =
  | "CONSENT_DISPATCHED"
  | "PATIENT_LANDING_VIEWED"
  | "LANGUAGE_SELECTED"
  | "EDUCATION_PRESENTED"
  | "EDUCATION_COMPLETED"
  | "QUESTION_SUBMITTED"
  | "QUESTION_ANSWERED"
  | "DECISION_ACCEPTED"
  | "DECISION_REFUSED"
  | "OTP_REQUESTED"
  | "OTP_VERIFIED"
  | "SIGNATURE_CAPTURED"
  | "PDF_FINALIZED"
  | "ARCHIVED_TO_CLINICAL_RECORD"
  | "PHYSICIAN_COMPLETION_REVIEWED";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  actor: TimelineActor;
  actorName: string;
  timestamp: string;
  status: "completed" | "pending" | "blocked";
  summaryEn: string;
  summaryAr: string;
  evidenceHash?: string;
  metadata?: Record<string, unknown>;
}

export interface PatientAlert {
  id: string;
  type: "allergy" | "comorbidity" | "medication" | "high-risk" | "expired-package" | "updated-guideline";
  severity: "critical" | "warning" | "info";
  messageEn: string;
  messageAr: string;
  source: string;
}
