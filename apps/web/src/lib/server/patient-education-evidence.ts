import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import type { AuthContext } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

/**
 * Phase 2.5 — Patient-Education evidence capture.
 *
 * Persists patient-education telemetry as part of the existing audit/evidence
 * pipeline. No schema changes are required: we reuse
 *   - `ConsentAuditEvent`  (consent-scoped JSON metadata, no consentDocumentId
 *                           required at the patient-education stage)
 *   - `AuditLog` + audit-chain (cross-entity tamper-evident trail, via
 *                               `writeAuditLog`)
 *
 * Event-type vocabulary (verbatim with Phase 2.5 spec):
 *   EDUCATION_OPENED         — Patient Education stage entered
 *   FAQ_VIEWED               — A FAQ accordion item was opened
 *   UNDERSTANDING_COMPLETED  — Understanding Check submitted (pass or fail)
 *   UNDERSTANDING_PASSED     — Understanding Check submitted with score >=
 *                              the passing threshold (>=80% by default)
 *   EDUCATION_COMPLETED      — Patient advanced past the Patient Education
 *                              stage (PE gate cleared)
 */

export const PATIENT_EDUCATION_EVENT_TYPES = [
  "EDUCATION_OPENED",
  "EDUCATION_COMPLETED",
  "FAQ_VIEWED",
  "UNDERSTANDING_COMPLETED",
  "UNDERSTANDING_PASSED",
] as const;

export type PatientEducationEventType = (typeof PATIENT_EDUCATION_EVENT_TYPES)[number];

export type PatientEducationLanguage = "ar" | "en" | "bilingual";

export interface RecordPatientEducationEventInput {
  auth: AuthContext;
  eventType: PatientEducationEventType;
  /** Phase 2.2 template code, e.g. "SURGICAL_PROCEDURE_CONSENT". */
  templateCode: string;
  /** Active UI language at the moment the event was emitted. */
  language: PatientEducationLanguage;
  /** Understanding-check score (0..100). Required for UNDERSTANDING_* events. */
  score?: number;
  /** Elapsed seconds since EDUCATION_OPENED (per stage instance). */
  durationSeconds?: number;
  /** Number of understanding-check submissions so far (>=1). */
  attempts?: number;
  /** Free-form extras (faq item id, answer snapshot, passing threshold, etc.). */
  extra?: Record<string, unknown>;
  /** Optional consent document id once known (kept open for later stages). */
  consentDocumentId?: string;
  /** Optional case id propagated to the audit chain. */
  caseId?: string;
  request?: NextRequest;
}

export interface PatientEducationEvidenceRecord {
  eventId: string;
  eventType: PatientEducationEventType;
  timestamp: string;
}

const SOURCE = "patient-education";
const ENTITY_TYPE = "patient_education";

export async function recordPatientEducationEvent(
  input: RecordPatientEducationEventInput,
): Promise<PatientEducationEvidenceRecord> {
  if (!PATIENT_EDUCATION_EVENT_TYPES.includes(input.eventType)) {
    throw new Error(`Unsupported patient-education event type: ${input.eventType}`);
  }
  if (!input.auth.tenant_id) {
    throw new Error("Tenant context is required to record patient-education evidence.");
  }

  const tenantId = input.auth.tenant_id;
  const actorId = input.auth.sub;
  const role = input.auth.role ?? null;

  const metadata: Record<string, unknown> = {
    templateCode: input.templateCode,
    language: input.language,
    score: input.score ?? null,
    durationSeconds: input.durationSeconds ?? null,
    attempts: input.attempts ?? null,
    capturedAt: new Date().toISOString(),
    ...(input.extra ?? {}),
  };

  const summary = buildEventSummary(input.eventType, metadata);

  const prismaClient = getPrisma();

  const auditEvent = await prismaClient.consentAuditEvent.create({
    data: {
      tenantId,
      consentDocumentId: input.consentDocumentId,
      action: input.eventType,
      source: SOURCE,
      actorUserId: actorId,
      actorRole: role,
      summary,
      metadata: metadata as Prisma.InputJsonValue,
    },
    select: { id: true, createdAt: true },
  });

  // Cross-entity tamper-evident audit trail (existing infrastructure).
  await writeAuditLog({
    tenantId,
    userId: actorId,
    entityType: ENTITY_TYPE,
    entityId: input.consentDocumentId ?? input.templateCode,
    action: input.eventType,
    details: summary,
    caseId: input.caseId ?? null,
    moduleKey: "informed-consents",
    metadataJson: {
      source: SOURCE,
      templateCode: input.templateCode,
      consentDocumentId: input.consentDocumentId ?? null,
      ...metadata,
    } as Prisma.InputJsonValue,
    request: input.request,
  });

  return {
    eventId: auditEvent.id,
    eventType: input.eventType,
    timestamp: auditEvent.createdAt.toISOString(),
  };
}

function buildEventSummary(
  eventType: PatientEducationEventType,
  metadata: Record<string, unknown>,
): string {
  const templateCode = String(metadata.templateCode ?? "");
  const language = String(metadata.language ?? "");
  const score = metadata.score == null ? null : Number(metadata.score);
  const attempts = metadata.attempts == null ? null : Number(metadata.attempts);

  switch (eventType) {
    case "EDUCATION_OPENED":
      return `Patient education opened (${templateCode}, ${language}).`;
    case "FAQ_VIEWED": {
      const faqId = metadata.faqItemId ? ` item=${metadata.faqItemId}` : "";
      return `Patient FAQ item viewed (${templateCode}, ${language})${faqId}.`;
    }
    case "UNDERSTANDING_COMPLETED":
      return `Understanding check submitted (${templateCode}, ${language}, score=${score ?? "n/a"}%, attempt=${attempts ?? "n/a"}).`;
    case "UNDERSTANDING_PASSED":
      return `Understanding check passed (${templateCode}, ${language}, score=${score ?? "n/a"}%, attempt=${attempts ?? "n/a"}).`;
    case "EDUCATION_COMPLETED":
      return `Patient education completed (${templateCode}, ${language}, score=${score ?? "n/a"}%).`;
    default:
      return `Patient education event ${eventType} (${templateCode}).`;
  }
}
