import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { isProductionSaasUpgradeEnabled } from "@/lib/server/platform/feature-flag";
import { getSignatureProviderReadiness } from "@/lib/server/platform/signature-providers";

export async function GET(request: NextRequest) {
  try {
    requireAuth(request);

    return NextResponse.json({
      ok: true,
      platformEnabled: isProductionSaasUpgradeEnabled(),
      signatureProviders: getSignatureProviderReadiness(),
      startedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
