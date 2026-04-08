import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getLegalReadiness } from "@/lib/server/legal-readiness-service";
import { logReportAccess } from "@/lib/server/report-access-service";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await params;
    const readiness = await getLegalReadiness(auth, caseId);

    if (auth.tenant_id) {
      await logReportAccess({
        tenantId: auth.tenant_id,
        caseId,
        reportKey: "legal_readiness_view",
        accessedByUserId: auth.sub,
        accessedByRole: auth.role ?? null,
        request,
        metadataJson: {
          status: readiness.status,
          blockerCount: readiness.blockers.length,
        },
      }).catch(() => undefined);
    }

    return NextResponse.json(readiness);
  } catch (error) {
    return handleApiError(error);
  }
}