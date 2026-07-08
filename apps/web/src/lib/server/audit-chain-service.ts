import crypto from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { toIsoString } from "@/lib/server/compliance-utils";

const prisma = () => getPrisma();

const AUDIT_CHAIN_SCHEMA_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS audit_chain_events (
      id VARCHAR PRIMARY KEY,
      tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      case_id VARCHAR REFERENCES cases(id) ON DELETE SET NULL,
      event_type VARCHAR NOT NULL,
      actor_id VARCHAR,
      actor_role VARCHAR,
      source_ip VARCHAR,
      device_info VARCHAR,
      session_info VARCHAR,
      previous_hash VARCHAR,
      current_hash VARCHAR NOT NULL UNIQUE,
      payload_summary VARCHAR NOT NULL,
      document_version VARCHAR,
      metadata_json JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_audit_chain_events_case
      ON audit_chain_events(tenant_id, case_id, created_at ASC)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_audit_chain_events_event_type
      ON audit_chain_events(tenant_id, event_type, created_at ASC)
  `,
];

let auditChainSchemaBootstrapPromise: Promise<void> | null = null;

async function ensureAuditChainSchema() {
  if (!auditChainSchemaBootstrapPromise) {
    auditChainSchemaBootstrapPromise = (async () => {
      for (const statement of AUDIT_CHAIN_SCHEMA_STATEMENTS) {
        await prisma().$executeRawUnsafe(statement);
      }
    })().catch((error) => {
      auditChainSchemaBootstrapPromise = null;
      throw error;
    });
  }

  return auditChainSchemaBootstrapPromise;
}

type AuditChainEventDelegate = {
  findFirst: (args: unknown) => Promise<{ currentHash?: string | null } | null>;
  create: (args: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<VerifiableChainEvent[]>;
};

function getAuditChainEventDelegate(): AuditChainEventDelegate {
  const db = prisma() as unknown as { auditChainEvent?: AuditChainEventDelegate };
  const delegate = db.auditChainEvent;
  if (!delegate) {
    throw new ApiError(500, "Audit chain model is not available in current Prisma client");
  }
  return delegate;
}

export type AuditChainHashInput = {
  previousHash?: string | null;
  tenantId: string;
  caseId?: string | null;
  eventType: string;
  actorId?: string | null;
  actorRole?: string | null;
  occurredAt: string;
  payloadSummary: string;
  documentVersion?: string | null;
  metadataJson?: unknown;
};

export type AuditChainVerification = {
  verified: boolean;
  totalEvents: number;
  brokenAtIndex: number | null;
  expectedHash: string | null;
  actualHash: string | null;
};

export function buildAuditChainHash(input: AuditChainHashInput): string {
  const serialized = [
    input.previousHash ?? "GENESIS",
    input.tenantId,
    input.caseId ?? "GLOBAL",
    input.eventType,
    input.actorId ?? "anonymous",
    input.actorRole ?? "unknown",
    input.occurredAt,
    input.payloadSummary,
    input.documentVersion ?? "-",
    JSON.stringify(input.metadataJson ?? null),
  ].join("|");

  return crypto.createHash("sha256").update(serialized).digest("hex");
}

type VerifiableChainEvent = {
  tenantId: string;
  caseId?: string | null;
  eventType: string;
  actorId?: string | null;
  actorRole?: string | null;
  previousHash?: string | null;
  currentHash: string;
  payloadSummary: string;
  documentVersion?: string | null;
  metadataJson?: unknown;
  createdAt: Date | string;
};

export function verifyAuditChain(events: VerifiableChainEvent[]): AuditChainVerification {
  let previousHash: string | null = null;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const occurredAt = toIsoString(event.createdAt) ?? new Date().toISOString();
    const expectedHash = buildAuditChainHash({
      previousHash,
      tenantId: event.tenantId,
      caseId: event.caseId ?? null,
      eventType: event.eventType,
      actorId: event.actorId ?? null,
      actorRole: event.actorRole ?? null,
      occurredAt,
      payloadSummary: event.payloadSummary,
      documentVersion: event.documentVersion ?? null,
      metadataJson: event.metadataJson ?? null,
    });

    if (event.previousHash !== previousHash || event.currentHash !== expectedHash) {
      return {
        verified: false,
        totalEvents: events.length,
        brokenAtIndex: index,
        expectedHash,
        actualHash: event.currentHash,
      };
    }

    previousHash = event.currentHash;
  }

  return {
    verified: true,
    totalEvents: events.length,
    brokenAtIndex: null,
    expectedHash: null,
    actualHash: null,
  };
}

export type AppendAuditChainEventArgs = {
  tenantId: string;
  caseId?: string | null;
  eventType: string;
  actorId?: string | null;
  actorRole?: string | null;
  payloadSummary: string;
  documentVersion?: string | null;
  metadataJson?: unknown;
  request?: NextRequest;
};

function extractRequestSource(request?: NextRequest) {
  return {
    sourceIp: request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    deviceInfo: request?.headers.get("user-agent") ?? null,
    sessionInfo: request?.headers.get("x-session-id") ?? null,
  };
}

function validateAppendAuditChainEventArgs(args: AppendAuditChainEventArgs): void {
  if (!args.tenantId || !args.eventType || !args.payloadSummary) {
    throw new ApiError(400, "Missing mandatory audit chain fields");
  }
}

function buildAuditChainCreateData(
  args: AppendAuditChainEventArgs,
  previousHash: string | null | undefined,
  occurredAt: Date,
  source: ReturnType<typeof extractRequestSource>,
) {
  const currentHash = buildAuditChainHash({
    previousHash: previousHash ?? null,
    tenantId: args.tenantId,
    caseId: args.caseId ?? null,
    eventType: args.eventType,
    actorId: args.actorId ?? null,
    actorRole: args.actorRole ?? null,
    occurredAt: occurredAt.toISOString(),
    payloadSummary: args.payloadSummary,
    documentVersion: args.documentVersion ?? null,
    metadataJson: args.metadataJson ?? null,
  });

  return {
    tenantId: args.tenantId,
    caseId: args.caseId ?? null,
    eventType: args.eventType,
    actorId: args.actorId ?? null,
    actorRole: args.actorRole ?? null,
    sourceIp: source.sourceIp,
    deviceInfo: source.deviceInfo,
    sessionInfo: source.sessionInfo,
    previousHash: previousHash ?? null,
    currentHash,
    payloadSummary: args.payloadSummary,
    documentVersion: args.documentVersion ?? null,
    metadataJson:
      args.metadataJson === undefined
        ? undefined
        : args.metadataJson === null
          ? Prisma.JsonNull
          : (args.metadataJson as JsonInputValue),
    createdAt: occurredAt,
  };
}

export async function appendAuditChainEventInTransaction(
  args: AppendAuditChainEventArgs,
  tx: PrismaClient | Prisma.TransactionClient,
) {
  validateAppendAuditChainEventArgs(args);
  await ensureAuditChainSchema();

  const previous = await tx.auditChainEvent.findFirst({
    where: {
      tenantId: args.tenantId,
      ...(args.caseId ? { caseId: args.caseId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const occurredAt = new Date();
  const source = extractRequestSource(args.request);
  const data = buildAuditChainCreateData(args, previous?.currentHash ?? null, occurredAt, source);

  return tx.auditChainEvent.create({ data });
}

export async function appendAuditChainEvent(
  args: AppendAuditChainEventArgs,
  tx?: PrismaClient | Prisma.TransactionClient,
) {
  if (tx) {
    return appendAuditChainEventInTransaction(args, tx);
  }

  validateAppendAuditChainEventArgs(args);
  await ensureAuditChainSchema();

  const auditChainEvent = getAuditChainEventDelegate();

  const previous = await auditChainEvent.findFirst({
    where: {
      tenantId: args.tenantId,
      ...(args.caseId ? { caseId: args.caseId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const occurredAt = new Date();
  const source = extractRequestSource(args.request);
  const data = buildAuditChainCreateData(args, previous?.currentHash ?? null, occurredAt, source);

  return auditChainEvent.create({ data });
}

export async function getCaseAuditChain(tenantId: string, caseId: string) {
  await ensureAuditChainSchema();
  const auditChainEvent = getAuditChainEventDelegate();

  const events = await auditChainEvent.findMany({
    where: { tenantId, caseId },
    orderBy: { createdAt: "asc" },
  });

  return {
    events,
    verification: verifyAuditChain(events),
  };
}
