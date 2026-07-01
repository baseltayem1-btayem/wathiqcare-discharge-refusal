/**
 * Clinical Content Platform — Shared Types
 *
 * Next-generation content model for consent forms, patient education,
 * procedure mapping, dynamic consent assembly, and clinical decision support.
 * All capabilities are gated by feature flags; these types are additive and
 * do not modify production OTP/SMS/PDF contracts.
 */

// ── Core Identity ──────────────────────────────────────────────────────────

export type Language = "en" | "ar" | "bilingual";

export type ContentStatus = "draft" | "review" | "approved" | "deprecated" | "retired";

export type RiskLevel = "standard" | "medium" | "high" | "critical";

export interface GovernedEntity {
  id: string;
  version: string;
  status: ContentStatus;
  language: Language;
  createdAt: string;
  updatedAt: string;
  governanceOwner: string;
  legalApprovalDate?: string;
  clinicalApprovalDate?: string;
  tags: string[];
}

// ── Approved Forms V2 ──────────────────────────────────────────────────────

export type ConsentFormCategory =
  | "general-surgery"
  | "anesthesia"
  | "medical"
  | "diagnostic"
  | "special-procedure"
  | "blood-transfusion"
  | "high-risk"
  | "research";

export interface ApprovedFormV2 extends ClinicalContentItem {
  kind: "approved-form";
  category: ConsentFormCategory;
  specialty: string;
  procedure: string;
  procedureCode?: string;
  riskLevel: RiskLevel;
  pdfUrl: string;
  summaryEn: string;
  summaryAr: string;
  keywords: string[];
  requiresAnesthesia: boolean;
  witnessRequired: boolean;
  interpreterRequired: boolean;
  sections: FormSection[];
}

export interface FormSection {
  id: string;
  type: "header" | "disclosure" | "risk" | "alternative" | "benefit" | "acknowledgment" | "signature";
  titleEn: string;
  titleAr: string;
  contentEn: string;
  contentAr: string;
  required: boolean;
  order: number;
}

// ── Clinical Content Engine ────────────────────────────────────────────────

export type ClinicalContentKind =
  | "approved-form"
  | "education-material"
  | "risk-disclosure"
  | "alternative-disclosure"
  | "procedure-definition"
  | "decision-rule";

export interface ClinicalContentItem extends GovernedEntity {
  kind: ClinicalContentKind;
  titleEn: string;
  titleAr: string;
  source: "imc-approved-library" | "hospital-curated" | "clinical-content-engine";
  metadata: Record<string, unknown>;
}

export interface RiskDisclosure extends ClinicalContentItem {
  kind: "risk-disclosure";
  riskLevel: RiskLevel;
  descriptionEn: string;
  descriptionAr: string;
  incidenceRate?: string;
  specialties: string[];
  procedures: string[];
}

export interface AlternativeDisclosure extends ClinicalContentItem {
  kind: "alternative-disclosure";
  descriptionEn: string;
  descriptionAr: string;
  specialties: string[];
  procedures: string[];
}

// ── Procedure Mapping Engine ───────────────────────────────────────────────

export interface ClinicalProcedure extends ClinicalContentItem {
  kind: "procedure-definition";
  procedureCode?: string;
  specialty: string;
  department: string;
  categoryCode: string;
  anesthesiaRequired: boolean;
  typicalDurationMinutes?: number;
  mappedFormIds: string[];
  mappedEducationIds: string[];
  mappedRiskIds: string[];
  mappedAlternativeIds: string[];
}

export interface ProcedureMappingResult {
  found: boolean;
  procedure?: ClinicalProcedure;
  consentForms: ApprovedFormV2[];
  educationMaterials: EducationMaterial[];
  risks: RiskDisclosure[];
  alternatives: AlternativeDisclosure[];
  anesthesiaRequired: boolean;
  fallbackReason?: string;
}

// ── Patient Education Engine ───────────────────────────────────────────────

export interface EducationMaterial extends ClinicalContentItem {
  kind: "education-material";
  assetType: "pdf" | "video" | "interactive" | "text";
  assetUrl: string;
  durationMinutes?: number | null;
  comprehensionChecks: ComprehensionCheck[];
  procedureIds: string[];
}

export interface ComprehensionCheck {
  id: string;
  questionEn: string;
  questionAr: string;
  options: { id: string; labelEn: string; labelAr: string }[];
  correctOptionId: string;
  explanationEn: string;
  explanationAr: string;
}

export interface EducationResult {
  materialId: string;
  scorePct: number;
  passed: boolean;
  answers: Record<string, string>;
  correctIds: string[];
  durationSeconds?: number;
  attempts: number;
}

// ── Dynamic Consent Generator ──────────────────────────────────────────────

export interface ConsentAssemblyRequest {
  tenantId: string;
  procedureName: string;
  patientContext: PatientContext;
  physicianContext: PhysicianContext;
  preferredLanguage: Language;
  includeEducation: boolean;
  includeDecisionSupport: boolean;
}

export interface PatientContext {
  patientId?: string;
  mrn?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  capacityStatus: "competent" | "minor" | "incapacitated" | "guardian-required";
  guardianName?: string;
  guardianRelationship?: string;
  languagePreference: Language;
  allergies?: string[];
  currentMedications?: string[];
}

export interface PhysicianContext {
  physicianId: string;
  name: string;
  licenseNumber: string;
  specialty: string;
  department: string;
  notes?: string;
}

export interface ConsentAssembly {
  assemblyId: string;
  tenantId: string;
  procedureName: string;
  status: "draft" | "ready" | "blocked";
  consentForm: ApprovedFormV2;
  educationMaterial?: EducationMaterial;
  disclosedRisks: RiskDisclosure[];
  disclosedAlternatives: AlternativeDisclosure[];
  physicianNotes?: string;
  patientContext: PatientContext;
  physicianContext: PhysicianContext;
  generatedAt: string;
  version: string;
  blockers: ConsentBlocker[];
  suggestions: ClinicalSuggestion[];
}

export interface ConsentBlocker {
  key: string;
  messageEn: string;
  messageAr: string;
  severity: "warning" | "blocking";
}

// ── Clinical Decision Support ──────────────────────────────────────────────

export interface ClinicalSuggestion {
  id: string;
  type: "missing-risk" | "missing-alternative" | "procedure-match" | "education-recommended" | "witness-required" | "interpreter-required";
  severity: "info" | "warning" | "critical";
  messageEn: string;
  messageAr: string;
  source: "clinical-content-engine" | "ai-assisted";
  suggestedContentIds: string[];
}

export interface DecisionSupportResult {
  procedureName: string;
  riskScore: number;
  riskLevel: RiskLevel;
  suggestions: ClinicalSuggestion[];
  missingDisclosures: string[];
  requiredParticipants: ("witness" | "interpreter" | "guardian")[];
}

export interface DecisionRule extends ClinicalContentItem {
  kind: "decision-rule";
  condition: {
    procedureKeyword?: string;
    specialty?: string;
    riskLevel?: RiskLevel;
    anesthesiaRequired?: boolean;
  };
  action: {
    suggestRiskIds?: string[];
    suggestAlternativeIds?: string[];
    requireWitness?: boolean;
    requireInterpreter?: boolean;
    requireGuardian?: boolean;
    educationRecommended?: boolean;
  };
  priority: number;
}

// ── Search & Registry ──────────────────────────────────────────────────────

export interface ContentSearchFilters {
  q?: string;
  kind?: ClinicalContentKind;
  category?: string;
  specialty?: string;
  riskLevel?: RiskLevel;
  status?: ContentStatus;
  language?: Language;
}

export interface ContentSearchResult<T extends ClinicalContentItem = ClinicalContentItem> {
  items: T[];
  total: number;
  filters: ContentSearchFilters;
  facets: {
    specialties: string[];
    categories: string[];
    riskLevels: RiskLevel[];
    statuses: ContentStatus[];
  };
}

// ── API Response Shapes ─────────────────────────────────────────────────────

export interface ClinicalContentApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  featureFlagEnabled?: boolean;
}
