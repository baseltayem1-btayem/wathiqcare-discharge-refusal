import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import type { TrakCareRequestContext } from "@/lib/server/trakcare/types";

function randomId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function buildTrakCareRequestContext(
  request: NextRequest,
  auth: AuthContext,
  options: { caseId?: string } = {},
): TrakCareRequestContext {
  const headerRequestId = request.headers.get("x-request-id")?.trim();
  const headerCorrelationId = request.headers.get("x-correlation-id")?.trim();

  return {
    tenantId: auth.tenant_id || "",
    userId: auth.sub,
    caseId: options.caseId,
    requestId: headerRequestId || randomId("req"),
    correlationId: headerCorrelationId || randomId("corr"),
  };
}
