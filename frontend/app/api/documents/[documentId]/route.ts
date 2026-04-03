import { DocumentStatus, Prisma, UsageMetric } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
<<<<<<< HEAD
=======
import { prisma } from "@/lib/server/prisma";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
import { getPrisma } from "@/lib/server/prisma";
import {
  enforcePlanUsage,
  recordUsage,
  writeAuditLog,
} from "@/lib/server/saas-services";

<<<<<<< HEAD
type RouteContext = {
  params: Promise<{ documentId: string }>;
};

type PatchDocumentPayload = {
  status?: string;
  titleEn?: string;
  titleAr?: string | null;
  storagePath?: string | null;
  previewHtml?: string | null;
  payloadJson?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue | null;
  signedAt?: string | null;
};

function parseDocumentStatus(value: unknown): DocumentStatus | null {
  if (typeof value !== "string") return null;

  const normalized = value.toUpperCase();

=======
function parseDocumentStatus(value: unknown): DocumentStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
  return Object.values(DocumentStatus).includes(normalized as DocumentStatus)
    ? (normalized as DocumentStatus)
    : null;
}

<<<<<<< HEAD
function parseSignedAt(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, "Invalid signedAt value");
  }

  return parsed;
}

async function getAuthorizedDocument(
  documentId: string,
  tenantId: string,
) {
  const prisma = getPrisma();

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

  if (document.tenantId !== tenantId) {
    throw new ApiError(403, "Tenant access denied");
  }

  return document;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { documentId } = await params;

    const document = await getAuthorizedDocument(documentId, auth.tenant_id);
=======
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const auth = requireAuth(request);
    const { documentId } = await params;

    const prisma = getPrisma();
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
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

    return NextResponse.json(toJsonSafe(document));
  } catch (error) {
    return handleApiError(error);
  }
}

<<<<<<< HEAD
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const prisma = getPrisma();

    const auth = await requireAuth(request);
    const { documentId } = await params;

    const existing = await prisma.document.findUnique({
      where: { id: documentId },
    });

=======
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const auth = requireAuth(request);
    const { documentId } = await params;

    const existing = await prisma.document.findUnique({ where: { id: documentId } });
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    if (!existing) {
      throw new ApiError(404, "Document not found");
    }

    if (existing.tenantId !== auth.tenant_id) {
      throw new ApiError(403, "Tenant access denied");
    }

<<<<<<< HEAD
    const payload = (await request.json().catch(() => null)) as PatchDocumentPayload | null;
=======
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
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

    if (!payload) {
      throw new ApiError(400, "Invalid JSON body");
    }

    const status = parseDocumentStatus(payload.status);
    const nextStatus = status ?? existing.status;
<<<<<<< HEAD

=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    const generatedTransition =
      nextStatus === DocumentStatus.GENERATED &&
      existing.status !== DocumentStatus.GENERATED;

    if (generatedTransition) {
      await enforcePlanUsage(auth.tenant_id, UsageMetric.DOCUMENTS, BigInt(1));
    }

<<<<<<< HEAD
    const parsedSignedAt = parseSignedAt(payload.signedAt);

=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
<<<<<<< HEAD
          ? {
              metadata:
                payload.metadata === null ? Prisma.JsonNull : payload.metadata,
            }
          : {}),
        ...(parsedSignedAt !== undefined
          ? {
              signedAt: parsedSignedAt,
              signedByUserId: parsedSignedAt ? auth.sub : null,
            }
=======
          ? { metadata: payload.metadata === null ? Prisma.JsonNull : payload.metadata }
          : {}),
        ...(payload.signedAt !== undefined
          ? {
            signedAt: payload.signedAt ? new Date(payload.signedAt) : null,
            signedByUserId: payload.signedAt ? auth.sub : null,
          }
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
<<<<<<< HEAD
}
=======
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
