import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { isProductionSaasUpgradeEnabled } from "@/lib/server/platform/feature-flag";
import { requireActiveSubscriptionContext } from "@/lib/server/platform/subscription-guard";
import { runConsentEngine } from "@/lib/server/platform/consent-engine";
import { getRequestDeviceInfo, getRequestIpAddress, parsePlatformPayload } from "@/lib/server/platform/request";
import { resolveVerifiedSignatureRecord } from "@/lib/server/platform/signature-providers";

export async function POST(request: NextRequest) {
  try {
    if (!isProductionSaasUpgradeEnabled()) {
      throw new ApiError(404, "Platform module is disabled");
    }

    const auth = requireAuth(request);
    const body = await parsePlatformPayload(request);
    const subscription = await requireActiveSubscriptionContext(auth.tenant_id);
    const signatureRecord = body.signatureSessionId
      ? resolveVerifiedSignatureRecord(body.signatureSessionId, body.signatureMethod)
      : (body.signatureRecord as string);

    const generated = await runConsentEngine({
      tenantId: auth.tenant_id,
      actorUserId: auth.sub,
      caseId: body.caseId,
      payload: {
        ...body.payload,
        subscription_context: subscription,
      },
      signatureMethod: body.signatureMethod,
      signatureRecord,
      requestIp: getRequestIpAddress(request),
      deviceInfo: getRequestDeviceInfo(request),
    });

    return NextResponse.json({ ok: true, module: "consent_engine", ...generated });
  } catch (error) {
    return handleApiError(error);
  }
}
