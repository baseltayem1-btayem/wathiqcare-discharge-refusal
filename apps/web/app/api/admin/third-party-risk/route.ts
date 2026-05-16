import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { logReportAccess } from "@/lib/server/report-access-service";
import { assertStepUpForSensitiveAction } from "@/lib/server/security-policy-service";
import { listThirdPartyRiskDashboard, saveThirdPartyRiskEntry } from "@/lib/server/third-party-risk-service";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);

    if (!auth.tenant_id) {
      return NextResponse.json({ message: "Tenant context is required" }, { status: 403 });
    }

    const dashboard = await listThirdPartyRiskDashboard(auth);
    await logReportAccess({
      tenantId: auth.tenant_id,
      reportKey: "third_party_risk_dashboard_view",
      accessedByUserId: auth.sub,
      accessedByRole: auth.role ?? null,
      request,
    }).catch(() => undefined);

    return NextResponse.json(dashboard);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);

    if (!auth.tenant_id) {
      return NextResponse.json({ message: "Tenant context is required" }, { status: 403 });
    }

    await assertStepUpForSensitiveAction({
      auth,
      request,
      tenantId: auth.tenant_id,
      actionKey: "third_party_risk_register",
      reason: "Third-party processor registration or approval",
    });

    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await saveThirdPartyRiskEntry(auth, payload, request);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);

    if (!auth.tenant_id) {
      return NextResponse.json({ message: "Tenant context is required" }, { status: 403 });
    }

    await assertStepUpForSensitiveAction({
      auth,
      request,
      tenantId: auth.tenant_id,
      actionKey: "third_party_risk_register",
      reason: "Third-party processor review decision",
    });

    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await saveThirdPartyRiskEntry(auth, payload, request);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
