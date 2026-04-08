import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getConsentSummary } from "@/lib/server/consent-service";
import { listDataSubjectRequests, summarizeDsrRequests } from "@/lib/server/dsr-service";
import { getPrivacyDashboard } from "@/lib/server/privacy-service";
import { logReportAccess } from "@/lib/server/report-access-service";
import { getRetentionDashboard } from "@/lib/server/retention-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);
    if (!auth.tenant_id) {
      return NextResponse.json({ message: "Tenant context is required" }, { status: 403 });
    }

    const [privacy, consent, dsr, retention] = await Promise.all([
      getPrivacyDashboard(auth.tenant_id),
      getConsentSummary(auth.tenant_id),
      listDataSubjectRequests(auth.tenant_id),
      getRetentionDashboard(auth.tenant_id),
    ]);

    await logReportAccess({
      tenantId: auth.tenant_id,
      reportKey: "privacy_dashboard_view",
      accessedByUserId: auth.sub,
      accessedByRole: auth.role ?? null,
      request,
    }).catch(() => undefined);

    return NextResponse.json({
      ...privacy,
      consent,
      dsr,
      dsrSummary: summarizeDsrRequests(dsr),
      retention,
    });
  } catch (error) {
    return handleApiError(error);
  }
}