import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import {
  createExportApprovalRequest,
  decideExportApprovalRequest,
  listExportApprovalRequests,
} from "@/lib/server/export-approval-service";
import { ApiError, handleApiError } from "@/lib/server/http";
import { assertStepUpForSensitiveAction } from "@/lib/server/security-policy-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);
    if (!auth.tenant_id) {
      return NextResponse.json({ message: "Tenant context is required" }, { status: 403 });
    }

    const items = await listExportApprovalRequests(auth.tenant_id);
    return NextResponse.json({
      items,
      metrics: {
        total: items.length,
        pending: items.filter((item) => item.status === "PENDING").length,
        approved: items.filter((item) => item.status === "APPROVED").length,
        rejected: items.filter((item) => item.status === "REJECTED").length,
      },
    });
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

    const body = await request.json().catch(() => ({}));
    const item = await createExportApprovalRequest({
      auth,
      targetKey: typeof body?.targetKey === "string" ? body.targetKey : "controlled_export",
      caseId: typeof body?.caseId === "string" ? body.caseId : null,
      exportFormat: typeof body?.exportFormat === "string" ? body.exportFormat : "CSV",
      reason: typeof body?.reason === "string" ? body.reason : undefined,
      request,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);
    const role = (auth.role ?? "").trim().toLowerCase();
    if (!["tenant_owner", "tenant_admin", "legal_admin", "compliance"].includes(role)) {
      throw new ApiError(403, "Insufficient role permissions");
    }
    if (!auth.tenant_id) {
      return NextResponse.json({ message: "Tenant context is required" }, { status: 403 });
    }

    await assertStepUpForSensitiveAction({
      auth,
      request,
      tenantId: auth.tenant_id,
      actionKey: "export_approval_decision",
      reason: "Export approval decision",
    });

    const body = await request.json().catch(() => ({}));
    const approvalRequestId = typeof body?.approvalRequestId === "string" ? body.approvalRequestId : "";
    const decision = typeof body?.decision === "string" ? body.decision.toUpperCase() : "";

    if (!approvalRequestId || (decision !== "APPROVED" && decision !== "REJECTED")) {
      throw new ApiError(400, "approvalRequestId and decision are required");
    }

    const item = await decideExportApprovalRequest({
      auth,
      approvalRequestId,
      decision,
      note: typeof body?.note === "string" ? body.note : undefined,
      request,
    });

    return NextResponse.json(item);
  } catch (error) {
    return handleApiError(error);
  }
}
