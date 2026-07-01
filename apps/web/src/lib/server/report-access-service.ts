import { Prisma, PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { runAuditOperation } from "@/lib/server/audit-foundation";

const prisma = () => getPrisma();

export type ReportAccessLike = {
  reportKey: string;
  exportFormat?: string | null;
  accessedByUserId?: string | null;
  caseId?: string | null;
};

export function summarizeReportAccessActivity(logs: ReportAccessLike[]) {
  const byReportKey: Record<string, number> = {};
  const uniqueUsers = new Set<string>();
  let exportEvents = 0;
  let caseLinkedEvents = 0;

  for (const log of logs) {
    byReportKey[log.reportKey] = (byReportKey[log.reportKey] ?? 0) + 1;
    if (log.exportFormat) {
      exportEvents += 1;
    }
    if (log.caseId) {
      caseLinkedEvents += 1;
    }
    if (log.accessedByUserId) {
      uniqueUsers.add(log.accessedByUserId);
    }
  }

  return {
    totalEvents: logs.length,
    exportEvents,
    caseLinkedEvents,
    uniqueUsers: uniqueUsers.size,
    byReportKey,
  };
}

export async function logReportAccess(
  args: {
    tenantId: string;
    caseId?: string | null;
    reportKey: string;
    filterSummary?: string | null;
    exportFormat?: string | null;
    accessedByUserId?: string | null;
    accessedByRole?: string | null;
    request?: NextRequest;
    metadataJson?: unknown;
  },
  tx?: PrismaClient | Prisma.TransactionClient,
) {
  const sourceIp = args.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const data = {
    tenantId: args.tenantId,
    caseId: args.caseId ?? null,
    reportKey: args.reportKey,
    filterSummary: args.filterSummary ?? null,
    exportFormat: args.exportFormat ?? null,
    accessedByUserId: args.accessedByUserId ?? null,
    accessedByRole: args.accessedByRole ?? null,
    sourceIp,
    metadataJson:
      args.metadataJson === undefined
        ? undefined
        : args.metadataJson === null
          ? Prisma.JsonNull
          : (args.metadataJson as JsonInputValue),
  };

  if (tx) {
    return tx.reportAccessLog.create({ data });
  }

  return runAuditOperation(
    () => prisma().reportAccessLog.create({ data }),
    {
      operationName: "logReportAccess",
      entityType: "report_access_log",
      entityId: args.reportKey,
    },
  );
}

export async function getReportAccessDashboard(tenantId: string) {
  const [recentLogs, totalCases, blockedLegalChecks, dsrCount] = await Promise.all([
    prisma().reportAccessLog.findMany({
      where: { tenantId },
      orderBy: { accessedAt: "desc" },
      take: 100,
    }).catch(() => []),
    prisma().case.count({ where: { tenantId, caseType: "DISCHARGE_REFUSAL" } }).catch(() => 0),
    prisma().legalReadinessCheck.count({ where: { tenantId, status: "BLOCKED" } }).catch(() => 0),
    prisma().dataSubjectRequest.count({ where: { tenantId } }).catch(() => 0),
  ]);

  const summary = summarizeReportAccessActivity(recentLogs);

  return {
    recentLogs,
    summary,
    metrics: {
      totalCases,
      blockedLegalChecks,
      dsrCount,
      exportEvents: summary.exportEvents,
      uniqueUsers: summary.uniqueUsers,
      caseLinkedEvents: summary.caseLinkedEvents,
    },
  };
}
