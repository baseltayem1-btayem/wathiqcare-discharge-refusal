import { NextRequest, NextResponse } from "next/server";

import { handleApiError, ApiError } from "@/lib/server/http";
import { recordPublicEducationEvent } from "@/lib/server/public-signing-service";
import { parseEducationVisualAid } from "@/lib/server/education-visual-aid";

type RouteContext = {
  params: Promise<{ token: string }>;
};

function coerceFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload) {
      throw new ApiError(400, "Request body is required");
    }

    const eventType = typeof payload.eventType === "string" ? payload.eventType.trim().toUpperCase() : "";
    if (
      eventType !== "EDUCATION_VISUAL_GENERATED"
      &&
      eventType !== "EDUCATION_STARTED"
      && eventType !== "EDUCATION_PRESENTED"
      && eventType !== "EDUCATION_COMPLETED"
      && eventType !== "EDUCATION_ACKNOWLEDGED"
    ) {
      throw new ApiError(400, "Unsupported education event type");
    }

    const education = await recordPublicEducationEvent({
      token,
      request,
      eventType,
      language: typeof payload.language === "string" ? payload.language : undefined,
      durationSeconds: coerceFiniteNumber(payload.durationSeconds),
      scrollCompletion: coerceFiniteNumber(payload.scrollCompletion),
      assetViews: Array.isArray(payload.assetViews)
        ? payload.assetViews.filter((item): item is string => typeof item === "string")
        : undefined,
      acknowledgement: typeof payload.acknowledgement === "boolean" ? payload.acknowledgement : undefined,
      educationVisualAid: parseEducationVisualAid(payload.educationVisualAid),
    });

    return NextResponse.json({ ok: true, education });
  } catch (error) {
    return handleApiError(error);
  }
}