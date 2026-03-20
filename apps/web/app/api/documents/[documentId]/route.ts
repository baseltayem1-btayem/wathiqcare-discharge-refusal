import { DocumentStatus, Prisma, UsageMetric } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import {
  enforcePlanUsage,
  recordUsage,
  writeAuditLog,
} from "@/lib/server/saas-services";

function parseDocumentStatus(value: unknown): DocumentStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  return Object.values(DocumentStatus).includes(normalized as DocumentStatus)
    ? (normalized as DocumentStatus)
    : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const auth = requireAuth(request);
    const { documentId } = await params;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!document) {
      throw new ApiError(404, "Document not found");
    }

    if (document.tenantId !== auth.tenant_id) {
      throw new ApiError(403, "Tenant access denied");
    }

    return NextResponse.json(toJsonSafe(document));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const auth = requireAuth(request);
    const { documentId } = await params;

    const existing = await prisma.document.findUnique({ where: { id: documentId } });
    if (!existing) {
      throw new ApiError(404, "Document not found");
    }

    if (existing.tenantId !== auth.tenant_id) {
      throw new ApiError(403, "Tenant access denied");
    }

    const payload = (await request.json().catch(() => null)) as
      | {
          status?: string;
          titleEn?: string;
          titleAr?: string | null;
          storagePath?: string | null;
          previewHtml?: string | null;
          payloadJson?: Prisma.InputJsonValue;
          metadata?: Prisma.InputJsonValue | null;
          signedAt?: string | null;
        }
      | null;

    if (!payload) {
      throw new ApiError(400, "Invalid JSON body");
    }

    const status = parseDocumentStatus(payload.status);
    const nextStatus = status ?? existing.status;
    const generatedTransition =
      nextStatus === DocumentStatus.GENERATED &&
      existing.status !== DocumentStatus.GENERATED;

    if (generatedTransition) {
      await enforcePlanUsage(auth.tenant_id, UsageMetric.DOCUMENTS, BigInt(1));
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        ...(status ? { status } : {}),
        ...(payload.titleEn !== undefined ? { titleEn: payload.titleEn } : {}),
        ...(payload.titleAr !== undefined ? { titleAr: payload.titleAr } : {}),
        ...(payload.storagePath !== undefined ? { storagePath: payload.storagePath } : {}),
        ...(payload.previewHtml !== undefined ? { previewHtml: payload.previewHtml } : {}),
        ...(payload.payloadJson !== undefined ? { payloadJson: payload.payloadJson } : {}),
        ...(payload.metadata !== undefined
          ? { metadata: payload.metadata === null ? Prisma.JsonNull : payload.metadata }
          : {}),
        ...(payload.signedAt !== undefined
          ? {
              signedAt: payload.signedAt ? new Date(payload.signedAt) : null,
              signedByUserId: payload.signedAt ? auth.sub : null,
            }
          : {}),
      },
    });

    if (generatedTransition) {
      await recordUsage(auth.tenant_id, UsageMetric.DOCUMENTS, BigInt(1), {
        source: "api/documents/[documentId]",
        documentId,
      });
    }

    await writeAuditLog({
      tenantId: auth.tenant_id,
      userId: auth.sub,
      entityType: "document",
      entityId: documentId,
      action: "document_updated",
      details: "Document updated",
      caseId: updated.caseId,
      documentId,
      metadataJson: {
        status: updated.status,
        generatedTransition,
      },
      request,
    });

    return NextResponse.json(toJsonSafe(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
