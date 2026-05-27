import { NextRequest, NextResponse } from "next/server";

import { handleApiError, ApiError } from "@/lib/server/http";
import { recordPublicDecisionEvent } from "@/lib/server/public-signing-service";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload) {
      throw new ApiError(400, "Request body is required");
    }

    const eventType = typeof payload.eventType === "string" ? payload.eventType.trim().toUpperCase() : "";
    if (
      eventType !== "CONSENT_PRESENTED"
      && eventType !== "CONSENT_ACCEPTED"
      && eventType !== "CONSENT_REFUSED"
      && eventType !== "REFUSAL_FORM_PRESENTED"
      && eventType !== "REFUSAL_ACKNOWLEDGED"
    ) {
      throw new ApiError(400, "Unsupported decision event type");
    }

    const decision = await recordPublicDecisionEvent({
      token,
      request,
      eventType,
      refusalAcknowledged: typeof payload.refusalAcknowledged === "boolean" ? payload.refusalAcknowledged : undefined,
    });

    return NextResponse.json({ ok: true, decision });
  } catch (error) {
    return handleApiError(error);
  }
}