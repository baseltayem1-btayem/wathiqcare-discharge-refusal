import { CaseStatus, CaseType, Prisma, UsageMetric } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
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
    const auth = requireAuth(request);
    const url = new URL(request.url);
    const status = parseCaseStatus(url.searchParams.get("status"));
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50"), 1), 200);
    const prisma = getPrisma();
    const cases = await prisma.case.findMany({
      where: {
        tenantId: auth.tenant_id,
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
    const auth = requireAuth(request);
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
<<<<<<< HEAD
        metadata?: getPrisma().InputJsonValue;
=======
        metadata?: Prisma.InputJsonValue;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
      }
      | null;

    if (!payload) {
      throw new ApiError(400, "Invalid JSON body");
    }

    const caseType = parseCaseType(payload.caseType) ?? CaseType.GENERAL;
    const status = parseCaseStatus(payload.status) ?? CaseStatus.OPEN;

    await enforcePlanUsage(auth.tenant_id, UsageMetric.CASES, BigInt(1));

    const prisma = getPrisma();
<<<<<<< HEAD
    const created = await getPrisma().case.create({
=======
    const created = await prisma.case.create({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
      data: {
        tenantId: auth.tenant_id,
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

    await recordUsage(auth.tenant_id, UsageMetric.CASES, BigInt(1), {
      source: "api/cases",
      caseId: created.id,
    });

    await writeAuditLog({
      tenantId: auth.tenant_id,
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

    return NextResponse.json(toJsonSafe(created), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
