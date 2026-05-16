import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { logReportAccess } from "@/lib/server/report-access-service";
import { createRetentionEntry, getRetentionDashboard } from "@/lib/server/retention-service";
import { assertStepUpForSensitiveAction } from "@/lib/server/security-policy-service";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);
    if (!auth.tenant_id) {
      return NextResponse.json({ message: "Tenant context is required" }, { status: 403 });
    }
    const dashboard = await getRetentionDashboard(auth.tenant_id);
    await logReportAccess({
      tenantId: auth.tenant_id,
      reportKey: "retention_dashboard_view",
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
      actionKey: "retention_admin_change",
      reason: "Retention policy/action change",
    });
    const payload = (await request.json().catch(() => ({}))) as {
      recordCategory?: string;
      retentionYears?: number;
      targetType?: string;
      targetId?: string;
      caseId?: string | null;
      scheduledFor?: string;
      holdReason?: string;
    };
    const result = await createRetentionEntry(auth, payload, request);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}