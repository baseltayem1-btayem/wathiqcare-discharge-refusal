import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { verifyEvidenceToken } from "@/lib/server/informed-consents-evidence-vault-service";
import { logRuntimeIncident, recordRuntimeMetric } from "@/lib/server/runtime-observability";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const startedAt = Date.now();
  try {
    const { token } = await params;
    const result = await verifyEvidenceToken(token);
    return NextResponse.json(toJsonSafe(result));
  } catch (error) {
    logRuntimeIncident({
      request: _request,
      module: "qr_verification",
      type: "QR_VERIFICATION_FAILURE",
      error,
      details: {
        route: "/api/modules/informed-consents/evidence/verify/[token]",
      },
    });
    return handleApiError(error);
  } finally {
    recordRuntimeMetric("response_time_ms", Date.now() - startedAt);
  }
}
