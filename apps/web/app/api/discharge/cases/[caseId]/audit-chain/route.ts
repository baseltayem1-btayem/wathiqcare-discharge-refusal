import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getCaseAuditChain } from "@/lib/server/audit-chain-service";
import { logReportAccess } from "@/lib/server/report-access-service";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await params;
    const tenantId = auth.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ message: "Tenant context is required" }, { status: 403 });
    }

    const result = await getCaseAuditChain(tenantId, caseId);
    await logReportAccess({
      tenantId,
      caseId,
      reportKey: "audit_chain_viewer",
      accessedByUserId: auth.sub,
      accessedByRole: auth.role ?? null,
      request,
    }).catch(() => undefined);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}