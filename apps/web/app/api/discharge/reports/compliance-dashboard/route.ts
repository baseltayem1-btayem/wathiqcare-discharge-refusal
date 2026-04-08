import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { getComplianceDashboard } from "@/lib/server/compliance-dashboard-service";
import { assertExportApprovalForAction } from "@/lib/server/export-approval-service";
import { handleApiError } from "@/lib/server/http";
import { logReportAccess } from "@/lib/server/report-access-service";

function toCsv(dashboard: Awaited<ReturnType<typeof getComplianceDashboard>>) {
  const rows: string[][] = [
    ["metric", "value"],
    ["cases", String(dashboard.totals.cases)],
    ["cbahi_compliant", String(dashboard.totals.cbahiCompliant)],
    ["jci_compliant", String(dashboard.totals.jciCompliant)],
    ["pdpl_log_indicators", String(dashboard.totals.pdplLogIndicators)],
    ["missing_consents", String(dashboard.totals.missingConsents)],
    ["cbahi_rate", String(dashboard.rates.cbahi)],
    ["jci_rate", String(dashboard.rates.jci)],
    ["overdue_incidents", String(dashboard.operational.overdueIncidents)],
    ["failed_backups", String(dashboard.operational.failedBackups)],
    ["overdue_dsrs", String(dashboard.operational.overdueDsrs)],
    ["denied_privileged_access", String(dashboard.operational.deniedPrivilegedAccess)],
    ["report_export_events", String(dashboard.operational.reportExportEvents)],
  ];

  for (const item of dashboard.attention) {
    rows.push([`attention:${item.code}`, `${item.severity}:${item.value}`]);
  }

  return rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const dashboard = await getComplianceDashboard(auth);
    const format = request.nextUrl.searchParams.get("format")?.toLowerCase() || "json";
    const approval =
      format === "csv"
        ? await assertExportApprovalForAction({
            auth,
            request,
            targetKey: "compliance_dashboard",
            exportFormat: "CSV",
          })
        : null;

    if (auth.tenant_id) {
      await logReportAccess({
        tenantId: auth.tenant_id,
        reportKey: "compliance_dashboard",
        exportFormat: format === "csv" ? "CSV" : null,
        accessedByUserId: auth.sub,
        accessedByRole: auth.role ?? null,
        request,
        metadataJson: {
          format,
          cases: dashboard.totals.cases,
          attentionItems: dashboard.attention.length,
          approvalRequestId: approval?.approvalRequestId ?? null,
        },
      }).catch(() => undefined);
    }

    if (format === "csv") {
      return new NextResponse(toCsv(dashboard), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="compliance-dashboard.csv"',
        },
      });
    }

    return NextResponse.json(dashboard);
  } catch (error) {
    return handleApiError(error);
  }
}
