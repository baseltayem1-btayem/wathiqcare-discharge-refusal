import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { createBackupJob, getBackupDashboard } from "@/lib/server/backup-dr-service";
import { logReportAccess } from "@/lib/server/report-access-service";
import { assertStepUpForSensitiveAction } from "@/lib/server/security-policy-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);
    if (!auth.tenant_id) {
      return NextResponse.json({ message: "Tenant context is required" }, { status: 403 });
    }
    const dashboard = await getBackupDashboard(auth.tenant_id);
    await logReportAccess({
      tenantId: auth.tenant_id,
      reportKey: "backup_dashboard_view",
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
      actionKey: "backup_job_create",
      reason: "Backup/DR administration",
    });
    const payload = (await request.json().catch(() => ({}))) as {
      backupType?: string;
      storageLocation?: string;
      region?: string;
      encrypted?: boolean;
      status?: string;
      restoreResultStatus?: string;
      restoreNotes?: string;
    };
    const result = await createBackupJob(auth, payload, request);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}