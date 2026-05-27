import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { toIsoString } from "@/lib/server/compliance-utils";

const prisma = () => getPrisma();

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

export async function appendAuditChainEvent(args: {
  tenantId: string;
  caseId?: string | null;
  eventType: string;
  actorId?: string | null;
  actorRole?: string | null;
  payloadSummary: string;
  documentVersion?: string | null;
  metadataJson?: unknown;
  request?: NextRequest;
}) {
  if (!args.tenantId || !args.eventType || !args.payloadSummary) {
    throw new ApiError(400, "Missing mandatory audit chain fields");
  }

  const auditChainEvent = getAuditChainEventDelegate();

  const previous = await auditChainEvent.findFirst({
    where: {
      tenantId: args.tenantId,
      ...(args.caseId ? { caseId: args.caseId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const sourceIp = args.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const deviceInfo = args.request?.headers.get("user-agent") ?? null;
  const sessionInfo = args.request?.headers.get("x-session-id") ?? null;
  const occurredAt = new Date();
  const currentHash = buildAuditChainHash({
    previousHash: previous?.currentHash ?? null,
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

  return auditChainEvent.create({
    data: {
      tenantId: args.tenantId,
      caseId: args.caseId ?? null,
      eventType: args.eventType,
      actorId: args.actorId ?? null,
      actorRole: args.actorRole ?? null,
      sourceIp,
      deviceInfo,
      sessionInfo,
      previousHash: previous?.currentHash ?? null,
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
    },
  });
}

export async function getCaseAuditChain(tenantId: string, caseId: string) {
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
