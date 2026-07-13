import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
import { writeAuditLog } from "@/lib/server/saas-services";

const prisma = () => getPrisma();

export type ConsentAuditEventInput = {
  tenantId: string;
  actorUserId: string;
  actorRole?: string | null;
  action: string;
  summary: string;
  source?: string;
  consentDocumentId?: string;
  templateId?: string;
  templateVersionId?: string;
  caseId?: string;
  metadata?: Record<string, unknown>;
};

export async function writeConsentAuditInTx(
  tx: Prisma.TransactionClient,
  args: ConsentAuditEventInput,
): Promise<void> {
  await tx.consentAuditEvent.create({
    data: {
      tenantId: args.tenantId,
      consentDocumentId: args.consentDocumentId,
      templateId: args.templateId,
      templateVersionId: args.templateVersionId,
      action: args.action,
      source: args.source,
      actorUserId: args.actorUserId,
      actorRole: args.actorRole ?? null,
      summary: args.summary,
      metadata: args.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  if (args.consentDocumentId) {
    await tx.consentTimelineEvent.create({
      data: {
        tenantId: args.tenantId,
        consentDocumentId: args.consentDocumentId,
        action: args.action,
        actorUserId: args.actorUserId,
        actorRole: args.actorRole ?? null,
        deviceInfo: null,
        ipAddress: null,
        userAgent: null,
        metadata: (args.metadata || {}) as Prisma.InputJsonValue,
      },
    });
  }
}

export async function writeConsentAudit(args: {
  tenantId: string;
  auth: AuthContext;
  action: string;
  summary: string;
  source?: string;
  consentDocumentId?: string;
  templateId?: string;
  templateVersionId?: string;
  caseId?: string;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
}) {
  await prisma().consentAuditEvent.create({
    data: {
      tenantId: args.tenantId,
      consentDocumentId: args.consentDocumentId,
      templateId: args.templateId,
      templateVersionId: args.templateVersionId,
      action: args.action,
      source: args.source,
      actorUserId: args.auth.sub,
      actorRole: args.auth.role || null,
      summary: args.summary,
      metadata: args.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  await writeAuditLog({
    tenantId: args.tenantId,
    userId: args.auth.sub,
    entityType: "consent_library",
    entityId: args.consentDocumentId || args.templateVersionId || args.templateId || args.tenantId,
    action: args.action,
    details: args.summary,
    caseId: args.caseId,
    metadataJson: {
      source: args.source || "consent-library",
      templateId: args.templateId || null,
      templateVersionId: args.templateVersionId || null,
      consentDocumentId: args.consentDocumentId || null,
      ...(args.metadata || {}),
    },
    request: args.request,
  });

  await appendAuditChainEvent({
    tenantId: args.tenantId,
    caseId: args.caseId || null,
    eventType: args.action.toUpperCase(),
    actorId: args.auth.sub,
    actorRole: args.auth.role || null,
    payloadSummary: args.summary,
    documentVersion: undefined,
    metadataJson: {
      consentDocumentId: args.consentDocumentId || null,
      templateId: args.templateId || null,
      templateVersionId: args.templateVersionId || null,
      ...(args.metadata || {}),
    },
    request: args.request,
  }).catch(() => undefined);

  if (args.consentDocumentId) {
    await prisma().consentTimelineEvent.create({
      data: {
        tenantId: args.tenantId,
        consentDocumentId: args.consentDocumentId,
        action: args.action,
        actorUserId: args.auth.sub,
        actorRole: args.auth.role || null,
        deviceInfo: args.request?.headers.get("sec-ch-ua-platform") || null,
        ipAddress: args.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        userAgent: args.request?.headers.get("user-agent") || null,
        metadata: (args.metadata || {}) as Prisma.InputJsonValue,
      },
    });
  }
}