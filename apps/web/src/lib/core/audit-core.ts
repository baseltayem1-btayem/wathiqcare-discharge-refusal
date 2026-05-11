/**
 * Audit Core — Enterprise Immutable Audit Service
 *
 * Centralized audit logging, timeline creation, and evidence packaging
 * used across ALL platform modules (consents, discharge, promissory notes).
 *
 * All writes are append-only. No delete or update paths exist here.
 */

import crypto from "crypto";
import { AUDIT_CONFIG } from "@/lib/config/platform-config";
import { ENABLE_AUDIT_CHAIN, ENABLE_TIMELINE_AUDIT } from "@/lib/config/feature-flags";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditEventInput {
  /** The Prisma tenant ID */
  tenantId: string;
  /** Module entity type, e.g. "consent_document", "discharge_case" */
  entityType: string;
  /** Entity primary key */
  entityId: string;
  /** Actor user ID */
  actorId: string;
  /** Actor role label */
  actorRole?: string;
  /** Human-readable action label */
  action: string;
  /** Optional structured payload (will be stored as JSON) */
  payload?: Record<string, unknown>;
  /** Client IP address */
  ipAddress?: string;
  /** User agent / device info */
  userAgent?: string;
  /** Previous audit chain hash (for chaining) */
  previousHash?: string;
}

export interface AuditEvent extends AuditEventInput {
  id: string;
  timestamp: string;
  /** SHA-256 hash of this event for chain integrity */
  eventHash: string;
}

export interface TimelineEventInput {
  tenantId: string;
  consentDocumentId: string;
  action: string;
  actorId: string;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Hash Utilities
// ---------------------------------------------------------------------------

/**
 * Compute a deterministic SHA-256 hash for an audit event.
 * Inputs are sorted lexicographically to ensure stability.
 */
export function computeEventHash(input: {
  entityType: string;
  entityId: string;
  actorId: string;
  action: string;
  timestamp: string;
  payload?: Record<string, unknown>;
  previousHash?: string;
}): string {
  const canonical = JSON.stringify({
    action: input.action,
    actorId: input.actorId,
    entityId: input.entityId,
    entityType: input.entityType,
    payload: input.payload ?? null,
    previousHash: input.previousHash ?? null,
    timestamp: input.timestamp,
  });
  return crypto.createHash(AUDIT_CONFIG.hashAlgorithm).update(canonical).digest("hex");
}

/**
 * Compute a checksum for a document payload (evidence package).
 */
export function computeDocumentChecksum(content: string | Buffer): string {
  return crypto
    .createHash(AUDIT_CONFIG.checksumAlgorithm)
    .update(content)
    .digest("hex");
}

// ---------------------------------------------------------------------------
// In-Process Audit Logger (delegates to Prisma service)
// ---------------------------------------------------------------------------

/**
 * Build a structured audit event ready for persistence.
 * Does NOT write to database — caller must persist via module-specific service.
 *
 * Use `writeConsentAudit` in consent-library-service for consent events,
 * or equivalent per-module functions. This is the shared factory.
 */
export function buildAuditEvent(input: AuditEventInput): AuditEvent {
  const timestamp = new Date().toISOString();
  const eventHash = ENABLE_AUDIT_CHAIN
    ? computeEventHash({
        entityType: input.entityType,
        entityId: input.entityId,
        actorId: input.actorId,
        action: input.action,
        timestamp,
        payload: input.payload,
        previousHash: input.previousHash,
      })
    : "";

  return {
    ...input,
    id: crypto.randomUUID(),
    timestamp,
    eventHash,
  };
}

// ---------------------------------------------------------------------------
// Timeline Entry Factory
// ---------------------------------------------------------------------------

/**
 * Build a ConsentTimelineEvent-compatible row.
 * Returns a plain object ready for `prisma.consentTimelineEvent.create`.
 */
export function buildTimelineEntry(input: TimelineEventInput) {
  if (!ENABLE_TIMELINE_AUDIT) return null;

  return {
    tenantId: input.tenantId,
    consentDocumentId: input.consentDocumentId,
    action: input.action,
    actorId: input.actorId,
    actorRole: input.actorRole ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
    timestamp: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Evidence Package Factories
// ---------------------------------------------------------------------------

export type EvidenceCopyType = "PATIENT" | "MEDICAL" | "LEGAL";

export interface EvidencePackageInput {
  tenantId: string;
  consentDocumentId: string;
  copyType: EvidenceCopyType;
  pdfBytes: Buffer;
  generatedByModel?: string;
  actorId: string;
}

/**
 * Build a ConsentEvidencePackage-compatible row.
 * Computes checksum automatically.
 */
export function buildEvidencePackageRow(input: EvidencePackageInput) {
  const checksum = computeDocumentChecksum(input.pdfBytes);
  return {
    tenantId: input.tenantId,
    consentDocumentId: input.consentDocumentId,
    copyType: input.copyType,
    checksum,
    pdfSizeBytes: input.pdfBytes.length,
    generatedByModel: input.generatedByModel ?? null,
    generatedAt: new Date(),
    generatedById: input.actorId,
  };
}

// ---------------------------------------------------------------------------
// Retention & Legal Hold
// ---------------------------------------------------------------------------

export function computeRetentionDate(
  fromDate: Date = new Date(),
  legalHold = false
): Date {
  const years = legalHold
    ? AUDIT_CONFIG.legalHoldRetentionYears
    : AUDIT_CONFIG.defaultRetentionYears;
  const d = new Date(fromDate);
  d.setFullYear(d.getFullYear() + years);
  return d;
}
