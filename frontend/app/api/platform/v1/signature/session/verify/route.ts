import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { isProductionSaasUpgradeEnabled } from "@/lib/server/platform/feature-flag";
import { verifySignatureSession } from "@/lib/server/platform/signature-providers";
import type { SignatureMethod } from "@/lib/server/platform/types";

export async function POST(request: NextRequest) {
  try {
    if (!isProductionSaasUpgradeEnabled()) {
      throw new ApiError(404, "Platform module is disabled");
    }

    requireAuth(request);

    const body = (await request.json().catch(() => null)) as {
      sessionId?: string;
      verificationCode?: string;
      method?: SignatureMethod;
    } | null;

    if (!body?.sessionId || !body?.verificationCode || !body?.method) {
      throw new ApiError(400, "sessionId, verificationCode and method are required");
    }

    const result = verifySignatureSession({
      sessionId: body.sessionId,
      verificationCode: body.verificationCode,
      method: body.method,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
