import { prisma } from "@/lib/server/prisma";
import { ApiError } from "@/lib/server/http";
import { writeAuditLog } from "@/lib/server/saas-services";

export async function archiveDocumentRecord(args: {
  tenantId: string;
  documentId: string;
  actorUserId: string;
  metadata?: Record<string, unknown>;
}) {
  const document = await prisma.document.findUnique({ where: { id: args.documentId } });
  if (!document || document.tenantId !== args.tenantId) {
    throw new ApiError(404, "Document not found");
  }

  const metadata = {
    ...(document.metadata && typeof document.metadata === "object" ? (document.metadata as Record<string, unknown>) : {}),
    archive: {
      status: "ARCHIVED",
      indexed_at: new Date().toISOString(),
      retrieval_verification: "pending",
      ...(args.metadata ?? {}),
    },
  };

  const updated = await prisma.document.update({
    where: { id: document.id },
    data: {
      status: "ARCHIVED",
      metadata,
    },
  });

  await writeAuditLog({
    tenantId: args.tenantId,
    userId: args.actorUserId,
    entityType: "document",
    entityId: document.id,
    action: "platform_archive_indexed",
    details: "Document indexed into secure archive",
    documentId: document.id,
    caseId: document.caseId,
    metadataJson: metadata,
  });

  return updated;
}

export async function verifyArchiveRetrieval(args: {
  tenantId: string;
  documentId: string;
  actorUserId: string;
}) {
  const document = await prisma.document.findUnique({ where: { id: args.documentId } });
  if (!document || document.tenantId !== args.tenantId) {
    throw new ApiError(404, "Document not found");
  }

  const metadata = {
    ...(document.metadata && typeof document.metadata === "object" ? (document.metadata as Record<string, unknown>) : {}),
    archive: {
      ...((document.metadata as Record<string, unknown> | null)?.archive as Record<string, unknown> | undefined),
      retrieval_verification: "verified",
      verified_at: new Date().toISOString(),
    },
  };

  const updated = await prisma.document.update({
    where: { id: document.id },
    data: { metadata },
  });

  await writeAuditLog({
    tenantId: args.tenantId,
    userId: args.actorUserId,
    entityType: "document",
    entityId: document.id,
    action: "platform_archive_retrieval_verified",
    details: "Archive retrieval verification completed",
    documentId: document.id,
    caseId: document.caseId,
    metadataJson: metadata,
  });

  return updated;
}
