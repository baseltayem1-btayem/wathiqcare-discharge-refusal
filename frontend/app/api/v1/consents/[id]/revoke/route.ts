import { ConsentLifecycleStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { isGovernanceModuleEnabled } from "@/lib/server/governance/feature-flag";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isGovernanceModuleEnabled()) {
      throw new ApiError(404, "Governance module is disabled");
    }

    const auth = requireAuth(request);
    const { id } = await params;

    const existing = await prisma.consent.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "Consent not found");
    }
    if (existing.tenantId !== auth.tenant_id) {
      throw new ApiError(403, "Tenant access denied");
    }

    const updated = await prisma.consent.update({
      where: { id },
      data: { status: ConsentLifecycleStatus.REVOKED },
    });

    await writeAuditLog({
      tenantId: auth.tenant_id,
      userId: auth.sub,
      entityType: "consent",
      entityId: id,
      action: "consent_revoked",
      details: "Consent revoked",
      caseId: updated.caseId,
      request,
    });

    return NextResponse.json(toJsonSafe(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
