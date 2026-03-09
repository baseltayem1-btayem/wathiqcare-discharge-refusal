import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { isGovernanceModuleEnabled } from "@/lib/server/governance/feature-flag";

const governanceDb = prisma as unknown as {
  roiRequest: {
    findMany: (args: {
      where: { tenantId: string };
      orderBy: { createdAt: "desc" };
      take: number;
    }) => Promise<Array<Record<string, unknown>>>;
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string; patientId: string; status: string }>;
  };
  patient: {
    findUnique: (args: { where: { id: string } }) => Promise<{ tenantId: string } | null>;
  };
};

export async function GET(request: NextRequest) {
  try {
    if (!isGovernanceModuleEnabled()) {
      throw new ApiError(404, "Governance module is disabled");
    }

    const auth = requireAuth(request);
    const rows = await governanceDb.roiRequest.findMany({
      where: { tenantId: auth.tenant_id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(toJsonSafe(rows));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isGovernanceModuleEnabled()) {
      throw new ApiError(404, "Governance module is disabled");
    }

    const auth = requireAuth(request);
    const payload = (await request.json().catch(() => null)) as
      | {
          patientId?: string;
          requesterName?: string;
          requesterRelationship?: string;
          purpose?: string;
          documentsRequested?: Prisma.InputJsonValue;
          dateRange?: Prisma.InputJsonValue;
          authorizedRecipient?: string;
          identityVerificationMethod?: string;
          minimumNecessaryConfirmed?: boolean;
          pdplBasis?: string;
          metadata?: Prisma.InputJsonValue;
        }
      | null;

    if (!payload?.patientId || !payload.requesterName?.trim()) {
      throw new ApiError(400, "patientId and requesterName are required");
    }

    const patient = await governanceDb.patient.findUnique({ where: { id: payload.patientId } });
    if (!patient || patient.tenantId !== auth.tenant_id) {
      throw new ApiError(404, "Patient not found");
    }

    const created = await governanceDb.roiRequest.create({
      data: {
        tenantId: auth.tenant_id,
        patientId: payload.patientId,
        requesterName: payload.requesterName,
        requesterRelationship: payload.requesterRelationship ?? null,
        purpose: payload.purpose ?? null,
        documentsRequested: payload.documentsRequested,
        dateRange: payload.dateRange,
        authorizedRecipient: payload.authorizedRecipient ?? null,
        identityVerificationMethod: payload.identityVerificationMethod ?? "sms_otp",
        status: "IDENTITY_PENDING",
        minimumNecessaryConfirmed: Boolean(payload.minimumNecessaryConfirmed),
        pdplBasis: payload.pdplBasis ?? null,
        metadata: payload.metadata,
      },
    });

    await writeAuditLog({
      tenantId: auth.tenant_id,
      userId: auth.sub,
      entityType: "roi_request",
      entityId: created.id,
      action: "roi_request_created",
      details: "Release of information request created",
      metadataJson: {
        patientId: created.patientId,
        status: created.status,
      },
      request,
    });

    return NextResponse.json(toJsonSafe(created), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
