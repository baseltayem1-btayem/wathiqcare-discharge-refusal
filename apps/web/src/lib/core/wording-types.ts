/**
 * =============================================================================
 * Wording Repository Types & Interfaces
 * =============================================================================
 * Defines the contract for IMC unified informed consent wording
 * with strict protection of fixed legal clauses.
 * =============================================================================
 */

export type WordingLanguage = 'ar' | 'en' | 'bilingual';
export type WordingSection =
  | 'core_consent'
  | 'medical_imaging'
  | 'interpreter'
  | 'guardian'
  | 'physician_certification'
  | 'no_guarantee'
  | 'electronic_signature';

export type WordingReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type WordingChangeType = 'CREATED' | 'APPROVED' | 'REJECTED' | 'DEPRECATED' | 'VERSION_BUMP';

/**
 * Approved Wording Template
 * A legally-reviewed, version-controlled text unit
 */
export interface ApprovedWordingTemplate {
  id: string;
  tenantId: string;
  wordingKey: string; // e.g. "core.informed_consent.main_clause"
  version: string; // Semantic versioning: "1.0.0"
  language: WordingLanguage;
  isFixedLegalClause: boolean; // If TRUE: immutable, requires approval to change
  contentAr?: string; // Arabic content
  contentEn?: string; // English content
  section: WordingSection;
  description: string;
  approvedById?: string;
  approvedAt?: Date;
  legalReviewStatus: WordingReviewStatus;
  medicalReviewStatus: WordingReviewStatus;
  effectiveDate: Date;
  deprecatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dynamically Populatable Fields in Consent Document
 * These are the ONLY fields physicians/system can edit
 */
export interface ConsentDynamicFieldsSpecification {
  diagnosis: string; // 患者/医師が入力
  caseDescription: string; // 医学的な説明
  procedureName: string; // 手術/処置の名前
  procedureDate?: Date;
  anesthesiaType?: string; // 麻酔の種類
  expectedBenefits: string; // 予想される利点
  commonRisks: string; // 一般的なリスク
  uncommonRisks: string; // まれなリスク
  seriousRisks: string; // 重篤なリスク
  treatmentAlternatives: string; // 治療の選択肢
  refusalRisks: string; // 拒否時のリスク
  postCareInstructions: string; // 処置後の指示
  physicianNotes?: string; // 医師の追加コメント
  medicationsUsed?: string[]; // 使用する医薬品
  procedureSite?: string; // 処置の部位
  procedureOrgan?: string; // 対象臓器
  physicianName: string;
  physicianSpecialty: string;
  physicianLicenseNo: string;
  consentDateTime: Date;
}

/**
 * Structured Informed Consent Document with Fixed + Dynamic Sections
 */
export interface StructuredConsentDocument {
  id: string;
  tenantId: string;
  patientId: string;
  procedureId: string;
  specialty: string;

  // Fixed Legal Sections (READ-ONLY AFTER CREATION)
  fixedSections: {
    coreConsent: ApprovedWordingTemplate;
    imagingConsent?: ApprovedWordingTemplate;
    interpreterClause?: ApprovedWordingTemplate;
    guardianClause?: ApprovedWordingTemplate;
    physicianCertification: ApprovedWordingTemplate;
    noGuaranteeClause: ApprovedWordingTemplate;
    electronicSignatureClause: ApprovedWordingTemplate;
  };

  // Dynamic Fields (EDITABLE BY PHYSICIAN)
  dynamicFields: ConsentDynamicFieldsSpecification;

  // Bilingual Structure
  language: WordingLanguage;
  arContent: string; // Generated from fixed + dynamic
  enContent: string; // Generated from fixed + dynamic

  // Governance & Audit
  approvalStatus: 'DRAFT' | 'PENDING_PHYSICIAN_REVIEW' | 'APPROVED' | 'SIGNED' | 'ARCHIVED';
  physicianApprovedAt?: Date;
  patientSignedAt?: Date;
  readOnlyFields: string[]; // List of field paths that are immutable
  auditTrail: WordingAuditEntry[];

  // PDF & Signature
  pdfUrl?: string;
  signatureToken?: string;
  signatureExpiry?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date;
}

/**
 * Audit Entry for Wording Changes
 */
export interface WordingAuditEntry {
  id: string;
  tenantId: string;
  templateId?: string;
  wordingKey: string;
  changeType: WordingChangeType;
  actorId: string;
  actorRole: 'PHYSICIAN' | 'LEGAL' | 'MEDICAL' | 'COMPLIANCE' | 'ADMIN';
  reason?: string;
  previousVersion?: string;
  newVersion?: string;
  timestamp: Date;
}

/**
 * Wording Change Proposal (for governance workflow)
 */
export interface WordingChangeProposal {
  id: string;
  tenantId: string;
  templateId: string;
  wordingKey: string;
  proposedByUserId: string;
  proposedByRole: string;
  proposalReason: string;
  currentVersion: string;
  proposedVersion: string;
  proposedContentAr?: string;
  proposedContentEn?: string;
  legalReviewStatus: WordingReviewStatus;
  medicalReviewStatus: WordingReviewStatus;
  legalReviewedBy?: string;
  legalReviewedAt?: Date;
  medicalReviewedBy?: string;
  medicalReviewedAt?: Date;
  approvedAt?: Date;
  effectiveDate?: Date;
  createdAt: Date;
}

/**
 * Wording Governance Validation Result
 */
export interface WordingValidationResult {
  isValid: boolean;
  errors: WordingValidationError[];
  warnings: string[];
  fixedClausesModified: boolean;
  dynamicFieldsModified: boolean;
}

export interface WordingValidationError {
  code: 'FIXED_CLAUSE_MODIFIED' | 'MISSING_REQUIRED_FIELD' | 'INVALID_VERSION' | 'APPROVAL_NOT_GRANTED';
  message: string;
  fieldPath?: string;
  severity: 'ERROR' | 'WARNING';
}

/**
 * Wording Repository Query Options
 */
export interface WordingRepositoryQueryOptions {
  tenantId: string;
  section?: WordingSection;
  language?: WordingLanguage;
  includeDeprecated?: boolean;
  status?: 'APPROVED' | 'PENDING' | 'REJECTED';
}

/**
 * Wording Retrieval Options
 */
export interface RetrieveWordingOptions {
  forSpecialty?: string;
  forProcedure?: string;
  language: WordingLanguage;
  version?: string;
}
