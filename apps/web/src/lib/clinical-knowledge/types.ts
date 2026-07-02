/**
 * Clinical Knowledge Engine — DB-backed Types
 *
 * These types mirror the Prisma schema for the Clinical Knowledge Engine MVP.
 * They are intentionally separate from the in-memory Clinical Content Platform
 * types in `@/lib/clinical-content/types` to avoid naming conflicts.
 */

export type ClinicalKnowledgeStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "MEDICALLY_APPROVED"
  | "LEGALLY_APPROVED"
  | "PUBLISHED"
  | "SUPERSEDED"
  | "ARCHIVED"
  | "REJECTED";

export type ClinicalKnowledgeIllustrationStatus =
  | "draft"
  | "medical_review"
  | "approved"
  | "rejected";

export type ClinicalKnowledgePackageItemType =
  | "CONSENT_FORM"
  | "EDUCATION_MATERIAL"
  | "RISK_DISCLOSURE"
  | "DECISION_RULE";

export type ClinicalKnowledgeConsentFormType =
  | "PROCEDURE_CONSENT"
  | "ANESTHESIA_CONSENT"
  | "BLOOD_TRANSFUSION_CONSENT"
  | "HIGH_RISK_PROCEDURE_CONSENT"
  | "DIAGNOSTIC_IMAGING_CONSENT"
  | "RESEARCH_CLINICAL_TRIAL_CONSENT"
  | "TELEMEDICINE_CONSENT"
  | "VACCINATION_CONSENT";

export type ClinicalKnowledgeEducationAssetType =
  | "PDF"
  | "VIDEO"
  | "INTERACTIVE"
  | "TEXT";

export type ClinicalKnowledgeDecisionRuleStatus =
  | "DRAFT"
  | "ACTIVE"
  | "INACTIVE";

export type ClinicalKnowledgeGovernanceEntityType =
  | "PROCEDURE"
  | "PACKAGE"
  | "FORM"
  | "EDUCATION"
  | "RISK"
  | "RULE";

export type ClinicalKnowledgeGovernanceEventType =
  | "CREATED"
  | "SUBMITTED_FOR_REVIEW"
  | "MEDICALLY_APPROVED"
  | "LEGALLY_APPROVED"
  | "PUBLISHED"
  | "SUPERSEDED"
  | "ARCHIVED"
  | "REJECTED"
  | "MODIFIED";

export type ClinicalKnowledgeRiskLevel =
  | "STANDARD"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export interface ClinicalKnowledgeSpecialty {
  id: string;
  tenantId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalKnowledgeProcedure {
  id: string;
  tenantId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  shortNameEn?: string | null;
  shortNameAr?: string | null;
  specialtyId: string;
  departmentName: string;
  categoryCode: string;
  typicalDurationMinutes?: number | null;
  anesthesiaRequired: boolean;
  keywords: string[];
  externalMappings?: Record<string, unknown> | null;
  status: "draft" | "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalKnowledgePackage {
  id: string;
  tenantId: string;
  procedureId: string;
  version: string;
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
  effectiveDate: string;
  expiryDate?: string | null;
  status: ClinicalKnowledgeStatus;
  governanceSnapshot?: Record<string, unknown> | null;
  requiredParticipantsSnapshot?: Record<string, unknown> | null;
  packageSnapshot?: Record<string, unknown> | null;
  supersededByPackageId?: string | null;
  createdByUserId: string;
  publishedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalKnowledgePackageItem {
  id: string;
  tenantId: string;
  packageId: string;
  itemType: ClinicalKnowledgePackageItemType;
  itemId: string;
  orderIndex: number;
  isRequired: boolean;
  packageOverrides?: Record<string, unknown> | null;
}

export interface ClinicalKnowledgeConsentFormSection {
  id: string;
  tenantId: string;
  formId: string;
  type: string;
  orderIndex: number;
  titleEn?: string | null;
  titleAr?: string | null;
  contentEn?: string | null;
  contentAr?: string | null;
  isRequired: boolean;
  isEditableByPhysician: boolean;
}

export interface ClinicalKnowledgeConsentForm {
  id: string;
  tenantId: string;
  code: string;
  titleEn: string;
  titleAr: string;
  formType: ClinicalKnowledgeConsentFormType;
  riskLevel: ClinicalKnowledgeRiskLevel;
  status: ClinicalKnowledgeStatus;
  version: string;
  effectiveDate: string;
  expiryDate?: string | null;
  governanceSnapshot?: Record<string, unknown> | null;
  pdfTemplateUrl?: string | null;
  requiresWitness: boolean;
  requiresInterpreter: boolean;
  createdByUserId: string;
  publishedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  sections?: ClinicalKnowledgeConsentFormSection[];
}

export interface ClinicalKnowledgeEducationMaterial {
  id: string;
  tenantId: string;
  code: string;
  titleEn: string;
  titleAr: string;
  assetType: ClinicalKnowledgeEducationAssetType;
  assetUrl: string;
  durationMinutes?: number | null;
  status: ClinicalKnowledgeStatus;
  version: string;
  effectiveDate: string;
  expiryDate?: string | null;
  governanceSnapshot?: Record<string, unknown> | null;
  createdByUserId: string;
  publishedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalKnowledgeRiskDisclosure {
  id: string;
  tenantId: string;
  code: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  riskLevel: ClinicalKnowledgeRiskLevel;
  incidenceRate?: string | null;
  specialtyIds: string[];
  status: ClinicalKnowledgeStatus;
  version: string;
  effectiveDate: string;
  expiryDate?: string | null;
  governanceSnapshot?: Record<string, unknown> | null;
  createdByUserId: string;
  publishedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalKnowledgeIllustration {
  id: string;
  tenantId: string;
  procedureId: string;
  procedureNameEn: string;
  procedureNameAr: string;
  specialty?: string | null;
  anatomyRegion?: string | null;
  anatomyImageUrl?: string | null;
  procedureImageUrl?: string | null;
  anatomyPromptEn?: string | null;
  anatomyPromptAr?: string | null;
  procedurePromptEn?: string | null;
  procedurePromptAr?: string | null;
  patientDisplayDisclaimerEn?: string | null;
  patientDisplayDisclaimerAr?: string | null;
  source?: string | null;
  version?: string | null;
  patientFacing: boolean;
  imageReviewStatus: ClinicalKnowledgeIllustrationStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  effectiveDate: string;
  expiryDate?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalKnowledgeDecisionRule {
  id: string;
  tenantId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  description?: string | null;
  priority: number;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  status: ClinicalKnowledgeDecisionRuleStatus;
  effectiveDate: string;
  expiryDate?: string | null;
  createdByUserId: string;
  approvedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalKnowledgeGovernanceEvent {
  id: string;
  tenantId: string;
  entityType: ClinicalKnowledgeGovernanceEntityType;
  entityId: string;
  eventType: ClinicalKnowledgeGovernanceEventType;
  actorUserId: string;
  actorRole: string;
  comment?: string | null;
  metadata?: Record<string, unknown> | null;
  previousHash?: string | null;
  eventHash: string;
  createdAt: string;
}

export interface ClinicalKnowledgeAssembly {
  assemblyId: string;
  tenantId: string;
  procedureId: string;
  procedureCode: string;
  procedureNameEn: string;
  procedureNameAr: string;
  packageId: string;
  packageVersion: string;
  status: "ready" | "blocked" | "draft";
  consentForm?: ClinicalKnowledgeConsentForm;
  educationMaterials: ClinicalKnowledgeEducationMaterial[];
  riskDisclosures: ClinicalKnowledgeRiskDisclosure[];
  illustrations: ClinicalKnowledgeIllustration[];
  decisionRules: ClinicalKnowledgeDecisionRule[];
  suggestions: ClinicalSuggestion[];
  blockers: ConsentBlocker[];
  requiredParticipants: ("witness" | "interpreter" | "guardian")[];
  packageSnapshot?: Record<string, unknown> | null;
  assembledAt: string;
}

export interface ClinicalKnowledgeAssemblyRequest {
  tenantId: string;
  procedureCode: string;
  patientContext?: {
    capacityStatus?: "competent" | "minor" | "incapacitated" | "guardian-required";
    languagePreference?: "en" | "ar" | "bilingual";
    guardianName?: string;
    guardianRelationship?: string;
  };
  physicianContext?: {
    physicianId: string;
    name: string;
    licenseNumber: string;
    specialty: string;
    department: string;
  };
}

export interface ClinicalKnowledgeAssemblyApiResponse {
  ok: boolean;
  data?: ClinicalKnowledgeAssembly;
  error?: string;
  featureFlagEnabled?: boolean;
  found?: boolean;
  fallbackReason?: string;
}

// Re-export shared suggestion/blocker types from clinical-content to keep CKE self-contained.
import type { ClinicalSuggestion, ConsentBlocker } from "@/lib/clinical-content/types";
export type { ClinicalSuggestion, ConsentBlocker };
