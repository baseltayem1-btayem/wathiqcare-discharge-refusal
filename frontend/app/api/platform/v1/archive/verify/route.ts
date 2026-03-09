import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { isProductionSaasUpgradeEnabled } from "@/lib/server/platform/feature-flag";
import { requireActiveSubscriptionContext } from "@/lib/server/platform/subscription-guard";
import { verifyArchiveRetrieval } from "@/lib/server/platform/archive-engine";

export async function POST(request: NextRequest) {
  try {
    if (!isProductionSaasUpgradeEnabled()) {
      throw new ApiError(404, "Platform module is disabled");
    }

    const auth = requireAuth(request);
    await requireActiveSubscriptionContext(auth.tenant_id);

    const body = (await request.json().catch(() => null)) as { documentId?: string } | null;
    if (!body?.documentId) {
      throw new ApiError(400, "documentId is required");
    }

    const verified = await verifyArchiveRetrieval({
      tenantId: auth.tenant_id,
      documentId: body.documentId,
      actorUserId: auth.sub,
    });

    return NextResponse.json({ ok: true, verified });
  } catch (error) {
    return handleApiError(error);
  }
}
