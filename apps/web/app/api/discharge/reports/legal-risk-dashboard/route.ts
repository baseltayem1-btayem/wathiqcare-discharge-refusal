import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getLegalRiskDashboard } from "@/lib/server/legal-risk-dashboard-service";
import { logReportAccess } from "@/lib/server/report-access-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);

    const params = request.nextUrl.searchParams;
    const dashboard = await getLegalRiskDashboard(auth, {
      dateFrom: params.get("dateFrom"),
      dateTo: params.get("dateTo"),
      department: params.get("department"),
      physician: params.get("physician"),
      caseStatus: params.get("caseStatus"),
      riskLevel: params.get("riskLevel"),
      escalationStatus: params.get("escalationStatus"),
      signatureStatus: params.get("signatureStatus"),
      insuranceCoverageStatus: params.get("insuranceCoverageStatus"),
    });

    if (auth.tenant_id) {
      await logReportAccess({
        tenantId: auth.tenant_id,
        reportKey: "legal_risk_dashboard",
        accessedByUserId: auth.sub,
        accessedByRole: auth.role ?? null,
        request,
        metadataJson: {
          filtersApplied: Object.keys((dashboard.filters as Record<string, unknown>) || {}).length,
          totalCases: (dashboard.kpis as Record<string, number>)?.totalRefusalCases ?? 0,
        },
      }).catch(() => undefined);
    }

    return NextResponse.json(dashboard);
  } catch (error) {
    return handleApiError(error);
  }
}
