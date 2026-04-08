import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { saveRemediationTrackerEntry, listRemediationTrackerDashboard } from "@/lib/server/remediation-tracker-service";
import { logReportAccess } from "@/lib/server/report-access-service";
import { assertStepUpForSensitiveAction } from "@/lib/server/security-policy-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);

    if (!auth.tenant_id) {
      return NextResponse.json({ message: "Tenant context is required" }, { status: 403 });
    }

    const dashboard = await listRemediationTrackerDashboard(auth);
    await logReportAccess({
      tenantId: auth.tenant_id,
      reportKey: "remediation_tracker_dashboard_view",
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
      actionKey: "remediation_tracker_review",
      reason: "Corrective action registration or closure",
    });

    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await saveRemediationTrackerEntry(auth, payload, request);
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
      actionKey: "remediation_tracker_review",
      reason: "Corrective action status update",
    });

    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await saveRemediationTrackerEntry(auth, payload, request);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
