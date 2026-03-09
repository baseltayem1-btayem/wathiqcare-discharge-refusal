import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { isProductionSaasUpgradeEnabled } from "@/lib/server/platform/feature-flag";
import { startSignatureSession } from "@/lib/server/platform/signature-providers";
import type { SignatureMethod } from "@/lib/server/platform/types";

export async function POST(request: NextRequest) {
  try {
    if (!isProductionSaasUpgradeEnabled()) {
      throw new ApiError(404, "Platform module is disabled");
    }

    requireAuth(request);

    const body = (await request.json().catch(() => null)) as {
      method?: SignatureMethod;
      recipient?: string;
    } | null;

    if (!body?.method) {
      throw new ApiError(400, "method is required");
    }

    const session = await startSignatureSession({
      method: body.method,
      recipient: body.recipient,
    });

    return NextResponse.json({ ok: true, session });
  } catch (error) {
    return handleApiError(error);
  }
}
