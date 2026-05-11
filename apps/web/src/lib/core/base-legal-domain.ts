/**
 * Base Legal Domain Abstractions
 *
 * Shared TypeScript interfaces and base types for ALL legal documents
 * on the WathiqCare platform. Module-specific types extend these.
 *
 * Rules:
 * - No Prisma imports here (pure TypeScript)
 * - No module-specific logic
 * - Used by: informed-consents, discharge-refusal, promissory-notes, future modules
 */

import type { SignerRole } from "@/lib/core/signature-core";
import type { AiGenerationMetadata } from "@/lib/core/ai-core";
import type { EvidenceCopyType } from "@/lib/core/audit-core";

// ---------------------------------------------------------------------------
// Universal Document Status
// ---------------------------------------------------------------------------

export type LegalDocumentStatus =
  | "DRAFT"
  | "AI_DRAFT"           // AI generated — awaiting physician review
  | "PENDING_REVIEW"     // Submitted for review
  | "UNDER_REVIEW"       // In committee review
  | "APPROVED"           // Physician/committee approved
  | "SIGNED"             // All required signatures collected
  | "FINALIZED"          // Immutably locked
  | "ARCHIVED"           // Evidence-archived
  | "REJECTED"           // Rejected — must restart
  | "REVOKED"            // Legally revoked after finalization
  | "EXPIRED";           // Auto-expired by retention policy

// ---------------------------------------------------------------------------
// Actor
// ---------------------------------------------------------------------------

export interface LegalActor {
  id: string;
  role: string;
  name?: string;
  nameAr?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Base Legal Document
// ---------------------------------------------------------------------------

/**
 * Minimum shape all legal documents must satisfy.
 * Module documents extend this — do not break this contract.
 */
export interface BaseLegalDocument {
  id: string;
  tenantId: string;
  status: LegalDocumentStatus;
  language: "ar" | "en" | "bilingual";
  createdAt: string;
  updatedAt: string;
  createdById: string;
  /** Immutable finalization timestamp */
  finalizedAt?: string;
  /** SHA-256 checksum of finalized PDF */
  auditChecksum?: string;
  /** Legal hold prevents deletion/modification */
  legalHold: boolean;
  legalHoldReason?: string;
  retentionUntil?: string;
}

// ---------------------------------------------------------------------------
// Base PDF Document
// ---------------------------------------------------------------------------

export interface BasePdfDocument {
  /** HTML source for rendering */
  htmlSource?: string;
  /** Stored PDF URL / storage key */
  pdfStorageKey?: string;
  /** Copy type for this PDF */
  copyType: EvidenceCopyType;
  /** Page count */
  pageCount?: number;
  /** Byte size */
  sizeBytes?: number;
  renderedAt?: string;
}

// ---------------------------------------------------------------------------
// Base Signature Workflow
// ---------------------------------------------------------------------------

export interface BaseSignatureWorkflow {
  documentId: string;
  sessionId?: string;
  providerSessionId?: string;
  status: "PENDING" | "SENT" | "PARTIALLY_SIGNED" | "COMPLETED" | "EXPIRED" | "REVOKED";
  requiredSigners: SignerRole[];
  completedSigners: SignerRole[];
  expiresAt?: string;
  completedAt?: string;
  initiatedBy: string;
  initiatedAt: string;
}

// ---------------------------------------------------------------------------
// Base Audit Timeline
// ---------------------------------------------------------------------------

export interface BaseAuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: LegalActor;
  timestamp: string;
  eventHash: string;
  previousHash?: string;
  metadata?: Record<string, unknown>;
}

export interface BaseAuditTimeline {
  entityId: string;
  entityType: string;
  events: BaseAuditEvent[];
  totalEvents: number;
  lastEventAt?: string;
}

// ---------------------------------------------------------------------------
// Base Evidence Package
// ---------------------------------------------------------------------------

export interface BaseEvidencePackage {
  id: string;
  documentId: string;
  copyType: EvidenceCopyType;
  checksum: string;
  pdfSizeBytes?: number;
  generatedAt: string;
  generatedById: string;
  generatedByModel?: string;
  /** Permanent archive storage key */
  archiveKey?: string;
  /** Whether this copy is archived immutably */
  isArchived: boolean;
}

// ---------------------------------------------------------------------------
// Base Approval Workflow
// ---------------------------------------------------------------------------

export type ApprovalDecision = "PENDING" | "APPROVED" | "REJECTED" | "ABSTAINED";

export interface BaseApprovalWorkflow {
  id: string;
  documentId: string;
  reviewType: string;
  reviewedById: string;
  reviewedByRole: string;
  decision: ApprovalDecision;
  comments?: string;
  reviewedAt?: string;
  submittedAt: string;
}

// ---------------------------------------------------------------------------
// AI-Aware Document Extension
// ---------------------------------------------------------------------------

export interface AiAwareDocument extends BaseLegalDocument {
  /** Set when AI generated content */
  generatedByModel?: string;
  /** AI metadata snapshot at generation time */
  aiMetadata?: AiGenerationMetadata;
  /** True if AI was used and physician has not yet reviewed */
  pendingPhysicianValidation: boolean;
}

// ---------------------------------------------------------------------------
// Bilingual Content
// ---------------------------------------------------------------------------

export interface BilingualContent {
  en: string;
  ar: string;
}

export interface BilingualDocument {
  titleEn: string;
  titleAr: string;
  contentEn: string;
  contentAr: string;
}

// ---------------------------------------------------------------------------
// Risk Item
// ---------------------------------------------------------------------------

export type RiskFrequency = "COMMON" | "LESS_COMMON" | "RARE";
export type RiskSeverity = "MILD" | "MODERATE" | "SERIOUS" | "LIFE_THREATENING";
export type MedicoLegalAlertLevel = "ROUTINE" | "HEIGHTENED" | "CRITICAL" | "MANDATORY_DISCLOSURE";

export interface BaseRiskItem {
  id: string;
  descriptionEn: string;
  descriptionAr: string;
  frequency: RiskFrequency;
  severity: RiskSeverity;
  alertLevel: MedicoLegalAlertLevel;
  isMandatoryDisclosure: boolean;
  probability?: string;
  physicianEditable: boolean;
}

// ---------------------------------------------------------------------------
// Module Identity
// ---------------------------------------------------------------------------

export type PlatformModule =
  | "informed_consent"
  | "discharge_refusal"
  | "promissory_note"
  | "legal_package"
  | "audit_export";
