import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { getRefusalQualityMetrics } from "@/lib/server/dischargeMedicoLegal";
import { assertExportApprovalForAction } from "@/lib/server/export-approval-service";
import { handleApiError } from "@/lib/server/http";
import { logReportAccess } from "@/lib/server/report-access-service";

function toCsv(metrics: Awaited<ReturnType<typeof getRefusalQualityMetrics>>) {
  const rows = [
    ["metric", "value"],
    ["total_refusal_cases", String(metrics.total_refusal_cases)],
    ["active_refusal_cases", String(metrics.active_refusal_cases)],
    ["cases_escalated_after_24_hours", String(metrics.cases_escalated_after_24_hours)],
    ["average_resolution_time_hours", String(metrics.average_resolution_time_hours)],
  ];

  for (const [key, value] of Object.entries(metrics.refusal_reasons_distribution)) {
    rows.push([`reason:${key}`, String(value)]);
  }
  for (const [key, value] of Object.entries(metrics.cases_by_department)) {
    rows.push([`department:${key}`, String(value)]);
  }

  return rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const metrics = await getRefusalQualityMetrics(auth);
    const format = request.nextUrl.searchParams.get("format")?.toLowerCase() || "json";
    const approval =
      format === "csv"
        ? await assertExportApprovalForAction({
            auth,
            request,
            targetKey: "refusal_quality_report",
            exportFormat: "CSV",
          })
        : null;

    if (auth.tenant_id) {
      await logReportAccess({
        tenantId: auth.tenant_id,
        reportKey: "refusal_quality_report",
        exportFormat: format === "csv" ? "CSV" : null,
        accessedByUserId: auth.sub,
        accessedByRole: auth.role ?? null,
        request,
        metadataJson: {
          format,
          totalCases: metrics.total_refusal_cases,
          approvalRequestId: approval?.approvalRequestId ?? null,
        },
      }).catch(() => undefined);
    }

    if (format === "csv") {
      return new NextResponse(toCsv(metrics), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="refusal-quality-report.csv"',
        },
      });
    }

    return NextResponse.json(metrics);
  } catch (error) {
    return handleApiError(error);
  }
}
