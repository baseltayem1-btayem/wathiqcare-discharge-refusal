import { CaseStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
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
    const auth = requireAuth(request);
    const { caseId } = await params;

    const prisma = getPrisma();
    const item = await prisma.case.findUnique({
      where: { id: caseId },
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

    if (item.tenantId !== auth.tenant_id) {
      throw new ApiError(403, "Tenant access denied");
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
    const auth = requireAuth(request);
    const { caseId } = await params;

    const existing = await prisma.case.findUnique({ where: { id: caseId } });
    if (!existing) {
      throw new ApiError(404, "Case not found");
    }

    if (existing.tenantId !== auth.tenant_id) {
      throw new ApiError(403, "Tenant access denied");
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

    const updated = await prisma.case.update({
      where: { id: caseId },
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

    await writeAuditLog({
      tenantId: auth.tenant_id,
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
