import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { logReportAccess } from "@/lib/server/report-access-service";
import { assertStepUpForSensitiveAction } from "@/lib/server/security-policy-service";
import { listPolicyAttestationDashboard, savePolicyAttestationEntry } from "@/lib/server/policy-attestation-service";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);

    if (!auth.tenant_id) {
      return NextResponse.json({ message: "Tenant context is required" }, { status: 403 });
    }

    const dashboard = await listPolicyAttestationDashboard(auth);
    await logReportAccess({
      tenantId: auth.tenant_id,
      reportKey: "policy_attestation_dashboard_view",
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
      actionKey: "policy_attestation_review",
      reason: "Policy attestation or exception approval",
    });

    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await savePolicyAttestationEntry(auth, payload, request);
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
      actionKey: "policy_attestation_review",
      reason: "Policy exception or attestation decision",
    });

    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await savePolicyAttestationEntry(auth, payload, request);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
