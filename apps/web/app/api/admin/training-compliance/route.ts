import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { logReportAccess } from "@/lib/server/report-access-service";
import { assertStepUpForSensitiveAction } from "@/lib/server/security-policy-service";
import { listTrainingComplianceDashboard, saveTrainingComplianceEntry } from "@/lib/server/training-compliance-service";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);

    if (!auth.tenant_id) {
      return NextResponse.json({ message: "Tenant context is required" }, { status: 403 });
    }

    const dashboard = await listTrainingComplianceDashboard(auth);
    await logReportAccess({
      tenantId: auth.tenant_id,
      reportKey: "training_compliance_dashboard_view",
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
      actionKey: "training_compliance_review",
      reason: "Training compliance registration or completion",
    });

    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await saveTrainingComplianceEntry(auth, payload, request);
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
      actionKey: "training_compliance_review",
      reason: "Training readiness status update",
    });

    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await saveTrainingComplianceEntry(auth, payload, request);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
