import { NextRequest } from "next/server";
import { clampAnalyticsRangeDays, type TrackingEventRecord } from "@/lib/analytics";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { handleApiError, jsonError, jsonSuccess } from "@/lib/server/http";
import { ingestAnalyticsBatch, loadAnalyticsRollups } from "@/lib/server/analytics-service";

function sanitizePostedEvents(value: unknown): TrackingEventRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is TrackingEventRecord => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: typeof item.id === "string" ? item.id.slice(0, 120) : undefined,
      eventName: typeof item.eventName === "string" ? item.eventName.slice(0, 64) : "",
      timestamp: typeof item.timestamp === "string" ? item.timestamp : "",
      route: typeof item.route === "string" ? item.route : "/",
      role: null,
      payload: item.payload && typeof item.payload === "object" ? item.payload : {},
      sentAt: null,
    }))
    .filter((item) => item.id && item.eventName && item.timestamp);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);
    const rangeDays = clampAnalyticsRangeDays(request.nextUrl.searchParams.get("days"));
    const payload = await loadAnalyticsRollups(tenantId, rangeDays);

    return jsonSuccess({
      generatedAt: new Date().toISOString(),
      rangeDays: payload.rangeDays,
      source: "stored",
      days: payload.days,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);
    const body = await request.json().catch(() => null);

    const batchId = typeof body?.batchId === "string" ? body.batchId.slice(0, 160) : "";
    const events = sanitizePostedEvents(body?.events);

    if (!batchId) {
      return jsonError(400, "batchId is required");
    }

    if (events.length === 0) {
      return jsonError(400, "No valid analytics events provided");
    }

    const result = await ingestAnalyticsBatch({ tenantId, batchId, events });

    return jsonSuccess({
      accepted: result.accepted,
      duplicate: result.duplicate,
      processedCount: result.processedCount,
      source: "aggregated_store",
    });
  } catch (error) {
    return handleApiError(error);
  }
}