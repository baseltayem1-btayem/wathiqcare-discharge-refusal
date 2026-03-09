import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { isProductionSaasUpgradeEnabled } from "@/lib/server/platform/feature-flag";
import { requireActiveSubscriptionContext } from "@/lib/server/platform/subscription-guard";

export async function GET(request: NextRequest) {
  try {
    if (!isProductionSaasUpgradeEnabled()) {
      throw new ApiError(404, "Platform module is disabled");
    }

    const auth = requireAuth(request);
    const context = await requireActiveSubscriptionContext(auth.tenant_id);

    return NextResponse.json({ ok: true, context });
  } catch (error) {
    return handleApiError(error);
  }
}
