import { CaseStatus, CaseType, Prisma, UsageMetric } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId, requireTenantOperationalAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { CASE_CREATOR_ROLES, userRoleAllows } from "@/lib/server/roles";
import { ensureOperationStateForCase } from "@/lib/server/operations";
import {
  enforcePlanUsage,
  recordUsage,
  writeAuditLog,
} from "@/lib/server/saas-services";

function parseCaseStatus(value: string | null | undefined): CaseStatus | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  return Object.values(CaseStatus).includes(normalized as CaseStatus)
    ? (normalized as CaseStatus)
    : null;
}

function parseCaseType(value: unknown): CaseType | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  return Object.values(CaseType).includes(normalized as CaseType)
    ? (normalized as CaseType)
    : null;
}

function defaultCaseNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  return `CASE-${stamp}`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);
    const tenantId = requireTenantId(auth);
    const url = new URL(request.url);

    const status = parseCaseStatus(url.searchParams.get("status"));
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50"), 1), 200);

    const cases = await prisma.case.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
      },
      include: {
        _count: {
          select: {
            documents: true,
            auditLogs: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(toJsonSafe(cases));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);
    const tenantId = requireTenantId(auth);

    if (!userRoleAllows(auth.role, CASE_CREATOR_ROLES)) {
      throw new ApiError(403, "Only authorized clinical and tenant-admin roles can create cases");
    }

    const payload = (await request.json().catch(() => null)) as
      | {
        caseNumber?: string;
        caseType?: string;
        title?: string;
        status?: string;
        workflowType?: string;
        patientName?: string;
        patientIdNumber?: string;
        medicalRecordNo?: string;
        roomNumber?: string;
        metadata?: Prisma.InputJsonValue;
      }
      | null;

    if (!payload) {
      throw new ApiError(400, "Invalid JSON body");
    }

    if (payload.caseType != null && parseCaseType(payload.caseType) === null) {
      throw new ApiError(400, "Invalid caseType");
    }

    if (payload.status != null && parseCaseStatus(payload.status) === null) {
      throw new ApiError(400, "Invalid status");
    }

    const caseType = parseCaseType(payload.caseType) ?? CaseType.GENERAL;
    const status = parseCaseStatus(payload.status) ?? CaseStatus.OPEN;

    await enforcePlanUsage(tenantId, UsageMetric.CASES, BigInt(1));

    const created = await prisma.case.create({
      data: {
        tenantId,
        caseNumber: payload.caseNumber?.trim() || defaultCaseNumber(),
        caseType,
        title: payload.title?.trim() || null,
        status,
        workflowType: payload.workflowType?.trim() || null,
        patientName: payload.patientName?.trim() || null,
        patientIdNumber: payload.patientIdNumber?.trim() || null,
        medicalRecordNo: payload.medicalRecordNo?.trim() || null,
        roomNumber: payload.roomNumber?.trim() || null,
        metadata: payload.metadata ?? undefined,
        createdByUserId: auth.sub,
        updatedByUserId: auth.sub,
      },
    });

    await recordUsage(tenantId, UsageMetric.CASES, BigInt(1), {
      source: "api/cases",
      caseId: created.id,
    });

    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      entityType: "case",
      entityId: created.id,
      action: "case_created",
      details: "Case created",
      caseId: created.id,
      metadataJson: {
        caseType: created.caseType,
        status: created.status,
      },
      request,
    });

    try {
      await ensureOperationStateForCase({
        tenantId,
        caseId: created.id,
        actorUserId: auth.sub,
        actorRole: auth.role,
      });
    } catch (operationError) {
      // Do not fail case registration when operations tracking initialization fails.
      // The case itself is already persisted and can be used safely.
      console.error("case-create: failed to initialize operation state (non-fatal)", {
        caseId: created.id,
        tenantId,
        error: operationError instanceof Error ? operationError.message : String(operationError),
      });
    }

    return NextResponse.json(toJsonSafe(created), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
