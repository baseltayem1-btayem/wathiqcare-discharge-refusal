/**
 * Shared types for the 24-hour acceleration prototype surfaces.
 * These types are intentionally local to the prototype namespace so they do not
 * leak into production consent workflows.
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ApprovalStatus =
  | "IMC_APPROVED"
  | "CLINICAL_REVIEW"
  | "LEGAL_REVIEW"
  | "PILOT_READY"
  | "DRAFT";

export type ConsentCategoryV2 = {
  code: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  sortOrder: number;
};

export type ConsentTemplateV2 = {
  id: string;
  templateCode: string;
  titleEn: string;
  titleAr: string;
  categoryCode: string;
  consentType: string;
  specialty: string;
  department: string;
  riskLevel: RiskLevel;
  status: ApprovalStatus;
  version: string;
  summaryEn: string;
  summaryAr: string;
  requiresWitness: boolean;
  requiresGuardian: boolean;
  requiresInterpreter: boolean;
  requiresSeparateConsent: boolean;
};

export type ProcedureMappingV2 = {
  id: string;
  specialty: string;
  department: string;
  procedureCode: string;
  procedureNameEn: string;
  procedureNameAr: string;
  categoryCode: string;
  recommendedTemplateIds: string[];
  anesthesiaImplication: "NONE" | "LOCAL" | "SEDATION" | "REGIONAL" | "GENERAL";
  riskLevel: RiskLevel;
  mandatoryDisclosures: string[];
  educationAssetIds: string[];
  commonAlternatives: string[];
  refusalConsequences: string[];
};

export type EducationAssetV2 = {
  id: string;
  titleEn: string;
  titleAr: string;
  kind: "VIDEO" | "PDF" | "ARTICLE" | "INFOGRAPHIC";
  durationMinutes?: number;
};

export type MockPatientEncounter = {
  id: string;
  mrn: string;
  patientNameEn: string;
  patientNameAr: string;
  dateOfBirth: string;
  gender: "M" | "F";
  nationalId: string;
  caseNumber: string;
  admissionDate: string;
  department: string;
  physicianName: string;
  physicianSpecialty: string;
  physicianLicense: string;
  diagnosis: string;
  plannedProcedure: string;
  procedureCode: string;
  allergies: string;
  syncStatus: "SYNCED" | "CACHED" | "UAT_MOCK";
};

export type WorkspaceStepKey =
  | "patient"
  | "recommend"
  | "review"
  | "simulate";
