import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { isGovernanceModuleEnabled } from "@/lib/server/governance/feature-flag";

const governanceDb = prisma as unknown as {
  consent: {
    findUnique: (args: { where: { id: string } }) => Promise<{ tenantId: string } | null>;
  };
  signature: {
    findFirst: (args: { where: { tenantId: string; consentId: string }; orderBy: { createdAt: "desc" } }) => Promise<unknown | null>;
  };
  archiveRecord: {
    findFirst: (args: { where: { tenantId: string; consentId: string }; orderBy: { createdAt: "desc" } }) => Promise<unknown | null>;
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isGovernanceModuleEnabled()) {
      throw new ApiError(404, "Governance module is disabled");
    }

    const auth = requireAuth(request);
    const { id } = await params;

    const consent = await governanceDb.consent.findUnique({ where: { id } });
    if (!consent) {
      throw new ApiError(404, "Consent not found");
    }
    if (consent.tenantId !== auth.tenant_id) {
      throw new ApiError(403, "Tenant access denied");
    }

    const signature = await governanceDb.signature.findFirst({
      where: { tenantId: auth.tenant_id, consentId: id },
      orderBy: { createdAt: "desc" },
    });

    const archive = await governanceDb.archiveRecord.findFirst({
      where: { tenantId: auth.tenant_id, consentId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(toJsonSafe({ consent, signature, archive }));
  } catch (error) {
    return handleApiError(error);
  }
}
