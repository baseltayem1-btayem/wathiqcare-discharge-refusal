import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { createSecurityIncident, listSecurityIncidents } from "@/lib/server/incident-response-service";
import { logReportAccess } from "@/lib/server/report-access-service";
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
    const dashboard = await listSecurityIncidents(auth.tenant_id);
    await logReportAccess({
      tenantId: auth.tenant_id,
      reportKey: "incident_dashboard_view",
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
      actionKey: "incident_create",
      reason: "Security incident registration",
    });
    const payload = (await request.json().catch(() => ({}))) as {
      caseId?: string | null;
      severity?: string;
      status?: string;
      title?: string;
      summary?: string;
      affectedScope?: string;
    };
    const incident = await createSecurityIncident(auth, payload, request);
    return NextResponse.json(incident, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}