/**
 * Internal workspace types for the production physician consent workspace.
 */

import type {
  PatientJourneyState,
  TimelineEvent,
  PatientAlert,
  PatientLanguage,
  TextSize,
} from "./patient-journey";
import type { ClinicalKnowledgeIllustration } from "@/lib/clinical-knowledge/types";

export type CapacityStatus = "competent" | "minor" | "incapacitated" | "guardian-required";
export type LanguagePreference = "en" | "ar" | "bilingual";
export type RiskLevel = "STANDARD" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AnesthesiaDecision = "NONE" | "LOCAL" | "SEDATION" | "REGIONAL" | "GENERAL";
export type ConsentFormType =
  | "PROCEDURE_CONSENT"
  | "ANESTHESIA_CONSENT"
  | "BLOOD_TRANSFUSION_CONSENT"
  | "HIGH_RISK_PROCEDURE_CONSENT"
  | "RESEARCH_CLINICAL_TRIAL_CONSENT";

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  nameAr: string;
  dateOfBirth: string;
  gender: "male" | "female";
  nationalId?: string;
  mobileNumber: string;
  languagePreference: LanguagePreference;
  capacityStatus: CapacityStatus;
  guardianName?: string;
  guardianRelationship?: string;
}

export interface Encounter {
  id: string;
  encounterId: string;
  admissionDate: string;
  department: string;
  physician: string;
  physicianLicense: string;
  diagnosis: string;
  procedure: string;
  allergies?: string;
  currentMedications?: string;
  caseNumber: string;
}

export interface Procedure {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  specialtyId: string;
  specialtyName: string;
  departmentName: string;
  categoryCode: ConsentFormType;
  anesthesiaRequired: boolean;
  typicalDurationMinutes: number;
  riskLevel: RiskLevel;
}

export interface MockConsentForm {
  id: string;
  code: string;
  titleEn: string;
  titleAr: string;
  formType: ConsentFormType;
  riskLevel: RiskLevel;
  version: string;
  requiresWitness: boolean;
  requiresInterpreter: boolean;
}

export interface MockEducationMaterial {
  id: string;
  code: string;
  titleEn: string;
  titleAr: string;
  assetType: "PDF" | "VIDEO" | "INTERACTIVE" | "TEXT";
  assetUrl: string;
  durationMinutes?: number;
}

export interface MockRiskDisclosure {
  id: string;
  code: string;
  titleEn: string;
  titleAr: string;
  riskLevel: RiskLevel;
  incidenceRate?: string;
}

export interface MockClinicalSuggestion {
  id: string;
  type:
    | "witness-required"
    | "interpreter-required"
    | "education-recommended"
    | "guardian-required"
    | "risk-highlight";
  severity: "info" | "warning" | "critical";
  messageEn: string;
  messageAr: string;
}

export interface MockConsentBlocker {
  key: string;
  messageEn: string;
  messageAr: string;
  severity: "warning" | "blocking";
}

export interface MockClinicalKnowledgeAssembly {
  assemblyId: string;
  procedureId: string;
  procedureCode: string;
  procedureNameEn: string;
  procedureNameAr: string;
  status: "ready" | "blocked" | "draft";
  consentForm?: MockConsentForm;
  educationMaterials: MockEducationMaterial[];
  riskDisclosures: MockRiskDisclosure[];
  illustrations: ClinicalKnowledgeIllustration[];
  suggestions: MockClinicalSuggestion[];
  blockers: MockConsentBlocker[];
  requiredParticipants: ("witness" | "interpreter" | "guardian")[];
  assembledAt: string;
}

export interface WorkspaceState {
  patient?: Patient;
  encounter?: Encounter;
  procedure?: Procedure;
  assembly?: MockClinicalKnowledgeAssembly;
  anesthesiaOverride?: AnesthesiaDecision;
  educationIncluded: boolean;
  physicianNotes: string;
  draftApproved: boolean;
  sentAt?: string;
  journeyMode: "physician" | "patientPreview" | "timeline";
  patientJourney: PatientJourneyState;
  timeline: TimelineEvent[];
  alerts: PatientAlert[];
  acknowledgedAlertIds: Set<string>;
}

export interface TaskMetrics {
  clicks: number;
  decisions: number;
  startTime: number;
  endTime?: number;
  durationMs: number;
  blockersHit: number;
  patientInteractions: number;
  patientScreensViewed: number;
  educationTimeMs: number;
  questionsAsked: number;
  endToEndDurationMs?: number;
  blockersCaughtBeforeSend: number;
}

export interface BaselineScenario {
  name: string;
  clicks: number;
  decisions: number;
  estimatedTimeMs: number;
  blockersHit: number;
}

export type { PatientJourneyState, TimelineEvent, PatientAlert, PatientLanguage, TextSize };
export type {
  PatientJourneyContext,
  SignatureRecord,
  PatientQuestion,
  AccessibilitySettings,
  PatientJourneyStep,
  PatientDecision,
  SignatureRole,
  TimelineActor,
} from "./patient-journey";
export { type TimelineEventType } from "./patient-journey";
