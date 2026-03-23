import { CaseStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId, requireTenantOperationalAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

function parseCaseStatus(value: unknown): CaseStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  return Object.values(CaseStatus).includes(normalized as CaseStatus)
    ? (normalized as CaseStatus)
    : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);
    const tenantId = requireTenantId(auth);
    const { caseId } = await params;

    const item = await prisma.case.findFirst({
      where: { id: caseId, tenantId },
      include: {
        documents: true,
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!item) {
      throw new ApiError(404, "Case not found");
    }

    return NextResponse.json(toJsonSafe(item));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);
    const tenantId = requireTenantId(auth);
    const { caseId } = await params;

    const existing = await prisma.case.findFirst({ where: { id: caseId, tenantId } });
    if (!existing) {
      throw new ApiError(404, "Case not found");
    }

    const payload = (await request.json().catch(() => null)) as
      | {
        title?: string | null;
        status?: string;
        workflowType?: string | null;
        patientName?: string | null;
        patientIdNumber?: string | null;
        medicalRecordNo?: string | null;
        roomNumber?: string | null;
        closedAt?: string | null;
        metadata?: Prisma.InputJsonValue | null;
      }
      | null;

    if (!payload) {
      throw new ApiError(400, "Invalid JSON body");
    }

    const parsedStatus = parseCaseStatus(payload.status);

    const updateResult = await prisma.case.updateMany({
      where: { id: caseId, tenantId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(parsedStatus ? { status: parsedStatus } : {}),
        ...(payload.workflowType !== undefined ? { workflowType: payload.workflowType } : {}),
        ...(payload.patientName !== undefined ? { patientName: payload.patientName } : {}),
        ...(payload.patientIdNumber !== undefined
          ? { patientIdNumber: payload.patientIdNumber }
          : {}),
        ...(payload.medicalRecordNo !== undefined
          ? { medicalRecordNo: payload.medicalRecordNo }
          : {}),
        ...(payload.roomNumber !== undefined ? { roomNumber: payload.roomNumber } : {}),
        ...(payload.metadata !== undefined
          ? { metadata: payload.metadata === null ? Prisma.JsonNull : payload.metadata }
          : {}),
        ...(payload.closedAt !== undefined
          ? { closedAt: payload.closedAt ? new Date(payload.closedAt) : null }
          : {}),
        updatedByUserId: auth.sub,
        version: { increment: 1 },
      },
    });

    if (updateResult.count === 0) {
      throw new ApiError(404, "Case not found");
    }

    const updated = await prisma.case.findFirst({ where: { id: caseId, tenantId } });
    if (!updated) {
      throw new ApiError(404, "Case not found");
    }

    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      entityType: "case",
      entityId: caseId,
      action: "case_updated",
      details: "Case updated",
      caseId,
      metadataJson: {
        status: updated.status,
      },
      request,
    });

    return NextResponse.json(toJsonSafe(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
