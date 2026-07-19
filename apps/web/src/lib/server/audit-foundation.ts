import crypto from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";
import { appendAuditChainEventInTransaction } from "@/lib/server/audit-chain-service";
import { getPrisma } from "@/lib/server/prisma";
import { logRuntimeIncident } from "@/lib/server/runtime-observability";
import { runDbOperation } from "@/lib/server/db-resilience";

const prisma = () => getPrisma();

/**
 * Audit-protected Prisma models. Any Prisma `update*` or `delete*` action
 * against these models is rejected by the middleware installed in
 * `prisma.ts`. This is the application-level append-only guard while the
 * database constraints required for true immutability are pending.
 */
export const AUDIT_PROTECTED_MODELS = [
  "auditLog",
  "auditChainEvent",
  "consentAuditEvent",
  "consentTimelineEvent",
  "evidenceEvent",
  "consentEvidencePackage",
  "webhookEvent",
  // RC1 Gate 1.3A: extend protection to all event/log tables used for
  // legal evidence, compliance reporting and security observability.
  "reportAccessLog",
  "privilegedAccessLog",
  "securityIncident",
  "caseStepEvent",
  "caseAssignmentHistory",
  "subscriptionEvent",
  "trakCareIntegrationLog",
  "governanceEvent",
  "procedureEducationAuditEvent",
  "notificationDeliveryAttempt",
] as const;

export type AuditProtectedModel = (typeof AUDIT_PROTECTED_MODELS)[number];

export class AuditFoundationError extends Error {
  code: string;
  isRetryable: boolean;
  correlationId?: string;

  constructor(args: {
    message: string;
    code: string;
    isRetryable?: boolean;
    correlationId?: string;
  }) {
    super(args.message);
    this.name = "AuditFoundationError";
    this.code = args.code;
    this.isRetryable = args.isRetryable ?? false;
    this.correlationId = args.correlationId;
  }
}

export function isAuditProtectedModel(model: string): boolean {
  return (AUDIT_PROTECTED_MODELS as readonly string[]).includes(model);
}

export function assertAuditAppendOnly(
  model: string,
  action: "update" | "delete",
): void {
  if (isAuditProtectedModel(model)) {
    throw new AuditFoundationError({
      code: "AUDIT_APPEND_ONLY_VIOLATION",
      message: `Audit model ${model} is append-only and does not support ${action} operations`,
      isRetryable: false,
    });
  }
}

export function createAuditIdempotencyKey(args: {
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  timestamp?: string;
}): string {
  const timestamp = args.timestamp ?? new Date().toISOString();
  const payload = [args.tenantId, args.entityType, args.entityId, args.action, timestamp].join("|");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function deriveIdempotencyKey(
  args: AuditArgs & { idempotencyKey?: string },
): string {
  if (args.idempotencyKey) {
    return args.idempotencyKey;
  }

  // Use a stable logical identifier when the caller provides one so that
  // retries of the same business operation do not create duplicate audit
  // events. Fall back to an ISO timestamp when no stable identifier exists.
  const stableNonce = args.correlationId?.trim()
    || args.requestId?.trim()
    || args.caseId?.trim()
    || args.documentId?.trim();

  return createAuditIdempotencyKey({
    tenantId: args.tenantId,
    entityType: args.entityType,
    entityId: args.entityId,
    action: args.action,
    timestamp: stableNonce ?? new Date().toISOString(),
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function logAuditFailure(args: {
  error: unknown;
  operation: string;
  entityType?: string;
  entityId?: string;
  correlationId?: string;
}): void {
  logRuntimeIncident({
    module: "audit",
    type: "DB_FAILURE" as const,
    error: args.error,
    runtimeCorrelationId: args.correlationId,
    details: {
      operation: args.operation,
      entityType: args.entityType,
      entityId: args.entityId,
    },
  });
}

export type AuditArgs = {
  tenantId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  details?: string;
  caseId?: string | null;
  documentId?: string | null;
  moduleKey?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  metadataJson?: JsonInputValue;
  request?: NextRequest;
  idempotencyKey?: string;
};

function normalizeJsonMetadata(value: JsonInputValue | undefined): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    // Cast is required because Prisma's InputJsonValue union does not expose the
    // JsonNull sentinel directly, but the runtime client accepts it.
    return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
  }
  return value as Prisma.InputJsonValue;
}

async function findExistingAuditEventByIdempotencyKey(
  tx: PrismaClient | Prisma.TransactionClient,
  idempotencyKey: string,
): Promise<{ auditLogId: string; auditChainEventId: string } | null> {
  try {
    const existing = await tx.auditChainEvent.findFirst({
      where: {
        metadataJson: {
          path: ["idempotencyKey"],
          equals: idempotencyKey,
        } as unknown as Prisma.JsonNullableFilter,
      },
      select: { id: true, metadataJson: true },
    });

    if (!existing) {
      return null;
    }

    const metadata = asRecord(existing.metadataJson);
    const auditLogId = metadata?.auditLogId;
    if (typeof auditLogId !== "string") {
      return null;
    }

    return {
      auditLogId,
      auditChainEventId: existing.id,
    };
  } catch {
    // If the JSON-path query is unsupported in the current Prisma/Postgres
    // configuration, fall back to creating a new event. The operation still
    // remains safe because the business transaction will roll back on failure.
    return null;
  }
}

export async function appendAuditEventInTransaction(
  args: AuditArgs & { tx: PrismaClient | Prisma.TransactionClient },
  options?: { idempotencyKey?: string; allowLookup?: boolean },
): Promise<{ auditLogId: string; auditChainEventId: string }> {
  const {
    tx,
    tenantId,
    userId,
    entityType,
    entityId,
    action,
    details,
    caseId,
    documentId,
    moduleKey,
    requestId,
    correlationId,
    metadataJson,
    request,
  } = args;

  const idempotencyKey = options?.idempotencyKey ?? deriveIdempotencyKey(args);

  if (options?.allowLookup !== false) {
    const existing = await findExistingAuditEventByIdempotencyKey(tx, idempotencyKey);
    if (existing) {
      return existing;
    }
  }

  const ip = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request?.headers.get("user-agent") ?? null;

  const auditLog = await tx.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType,
      entityId,
      action,
      details,
      caseId,
      documentId,
      ipAddress: ip,
      userAgent,
      metadataJson: normalizeJsonMetadata(metadataJson),
    },
  });

  const chainEvent = await appendAuditChainEventInTransaction(
    {
      tenantId,
      caseId: caseId ?? null,
      eventType: String(action).toUpperCase(),
      actorId: userId,
      actorRole: null,
      payloadSummary: details || `${entityType}:${action}`,
      documentVersion: null,
      metadataJson: {
        entityType,
        entityId,
        moduleKey: moduleKey ?? null,
        requestId: requestId ?? null,
        correlationId: correlationId ?? null,
        documentId: documentId ?? null,
        metadata: metadataJson ?? null,
        idempotencyKey,
        auditLogId: auditLog.id,
      },
      request,
    },
    tx,
  );

  return {
    auditLogId: auditLog.id,
    auditChainEventId: (chainEvent as { id: string }).id,
  };
}

export async function withAtomicAuditTransaction<T>(
  operation: (tx: PrismaClient | Prisma.TransactionClient) => Promise<T>,
  options?: { operationName?: string; correlationId?: string },
): Promise<T> {
  const operationName = options?.operationName ?? "atomic_audit_transaction";
  const correlationId = options?.correlationId;

  return runDbOperation(
    async () => {
      try {
        return await prisma().$transaction((tx) => operation(tx));
      } catch (error) {
        logAuditFailure({
          error,
          operation: operationName,
          correlationId,
        });
        throw error;
      }
    },
    {
      operationName,
      traceId: correlationId,
    },
  );
}

/**
 * Executes a single audit write outside of an existing business transaction.
 * The operation is retried for transient DB errors and failures are always
 * logged via `logRuntimeIncident`. Callers must still handle thrown errors;
 * this helper must never be used to swallow audit failures.
 */
export async function runAuditOperation<T>(
  operation: () => Promise<T>,
  options: { operationName: string; correlationId?: string; entityType?: string; entityId?: string },
): Promise<T> {
  return runDbOperation(operation, {
    operationName: options.operationName,
    traceId: options.correlationId,
  }).catch((error) => {
    logAuditFailure({
      error,
      operation: options.operationName,
      entityType: options.entityType,
      entityId: options.entityId,
      correlationId: options.correlationId,
    });
    throw error;
  });
}
