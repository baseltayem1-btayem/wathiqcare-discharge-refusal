import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { requireTenantId } from "@/lib/server/auth";
import { asRecord, readString, toIsoString } from "@/lib/server/compliance-utils";
import { ApiError } from "@/lib/server/http";
import { getTenantSecuritySettings } from "@/lib/server/security-policy-service";
import { logReportAccess } from "@/lib/server/report-access-service";
import { getPrisma } from "@/lib/server/prisma";

const prisma = () => getPrisma();

const EXPORT_APPROVAL_REQUEST_KEY = "export_approval_request";
const EXPORT_APPROVAL_DECISION_KEY = "export_approval_decision";
const APPROVAL_VALIDITY_MS = 12 * 60 * 60 * 1000;

export type ExportApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ExportApprovalSummary = {
  approvalRequestId: string;
  targetKey: string;
  caseId?: string | null;
  exportFormat?: string | null;
  requestedByUserId?: string | null;
  requestedByRole?: string | null;
  requestedAt: string;
  reason?: string | null;
  status: ExportApprovalStatus;
  approverUserId?: string | null;
  approverRole?: string | null;
  decidedAt?: string | null;
  note?: string | null;
};

type ApprovalLogLike = {
  id: string;
  reportKey: string;
  accessedByUserId?: string | null;
  accessedByRole?: string | null;
  accessedAt?: string | Date;
  exportFormat?: string | null;
  caseId?: string | null;
  metadataJson?: unknown;
};

function normalizeStatus(value: string | null | undefined): ExportApprovalStatus {
  const normalized = (value ?? "").trim().toUpperCase();
  if (normalized === "APPROVED") return "APPROVED";
  if (normalized === "REJECTED") return "REJECTED";
  return "PENDING";
}

export function summarizeExportApprovalRequests(logs: ApprovalLogLike[]): ExportApprovalSummary[] {
  const requests = new Map<string, ExportApprovalSummary>();
  const decisions: ApprovalLogLike[] = [];

  for (const log of logs) {
    const metadata = asRecord(log.metadataJson);
    const approvalRequestId = readString(metadata, "approvalRequestId") ?? null;
    if (!approvalRequestId) {
      continue;
    }

    if (log.reportKey === EXPORT_APPROVAL_REQUEST_KEY) {
      requests.set(approvalRequestId, {
        approvalRequestId,
        targetKey: readString(metadata, "targetKey") ?? "unknown_export",
        caseId: readString(metadata, "caseId") ?? log.caseId ?? null,
        exportFormat: readString(metadata, "exportFormat") ?? log.exportFormat ?? null,
        requestedByUserId: log.accessedByUserId ?? null,
        requestedByRole: log.accessedByRole ?? null,
        requestedAt: toIsoString(log.accessedAt) ?? new Date(0).toISOString(),
        reason: readString(metadata, "reason") ?? null,
        status: normalizeStatus(readString(metadata, "status")),
        approverUserId: null,
        approverRole: null,
        decidedAt: null,
        note: null,
      });
      continue;
    }

    if (log.reportKey === EXPORT_APPROVAL_DECISION_KEY) {
      decisions.push(log);
    }
  }

  for (const log of decisions) {
    const metadata = asRecord(log.metadataJson);
    const approvalRequestId = readString(metadata, "approvalRequestId") ?? null;
    if (!approvalRequestId) {
      continue;
    }

    const current = requests.get(approvalRequestId);
    if (!current) {
      continue;
    }

    const decidedAt = toIsoString(log.accessedAt) ?? current.decidedAt ?? null;
    current.status = normalizeStatus(readString(metadata, "decision"));
    current.approverUserId = log.accessedByUserId ?? current.approverUserId ?? null;
    current.approverRole = log.accessedByRole ?? current.approverRole ?? null;
    current.decidedAt = decidedAt;
    current.note = readString(metadata, "note") ?? null;
  }

  return Array.from(requests.values()).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function isExportApprovalSatisfied(args: {
  approvals: ExportApprovalSummary[];
  approvalRequestId: string | null | undefined;
  targetKey: string;
  caseId?: string | null;
  exportFormat?: string | null;
  now?: Date;
}): boolean {
  if (!args.approvalRequestId) {
    return false;
  }

  const approval = args.approvals.find((item) => item.approvalRequestId === args.approvalRequestId);
  if (!approval || approval.status !== "APPROVED") {
    return false;
  }

  if (approval.targetKey !== args.targetKey) {
    return false;
  }

  if ((approval.caseId ?? null) !== (args.caseId ?? null)) {
    return false;
  }

  if ((approval.exportFormat ?? null) !== (args.exportFormat ?? null)) {
    return false;
  }

  const decidedAt = approval.decidedAt ? new Date(approval.decidedAt).getTime() : 0;
  const now = (args.now ?? new Date()).getTime();
  if (!decidedAt || decidedAt + APPROVAL_VALIDITY_MS < now) {
    return false;
  }

  return true;
}

export async function listExportApprovalRequests(tenantId: string) {
  const logs = await prisma().reportAccessLog.findMany({
    where: {
      tenantId,
      reportKey: {
        in: [EXPORT_APPROVAL_REQUEST_KEY, EXPORT_APPROVAL_DECISION_KEY],
      },
    },
    orderBy: { accessedAt: "desc" },
    take: 250,
  }).catch(() => []);

  return summarizeExportApprovalRequests(logs);
}

export async function createExportApprovalRequest(args: {
  auth: AuthContext;
  targetKey: string;
  caseId?: string | null;
  exportFormat?: string | null;
  reason?: string | null;
  request?: NextRequest;
}) {
  const tenantId = requireTenantId(args.auth);
  const targetKey = args.targetKey.trim() || "unknown_export";
  const exportFormat = args.exportFormat?.trim().toUpperCase() || "CSV";
  const reason = args.reason?.trim() || "Controlled evidence export request";

  const existing = await listExportApprovalRequests(tenantId);
  const pending = existing.find((item) =>
    item.status === "PENDING" &&
    item.targetKey === targetKey &&
    (item.caseId ?? null) === (args.caseId ?? null) &&
    (item.exportFormat ?? null) === exportFormat &&
    (item.requestedByUserId ?? null) === args.auth.sub,
  );

  if (pending) {
    return pending;
  }

  const approvalRequestId = crypto.randomUUID();

  await logReportAccess({
    tenantId,
    caseId: args.caseId ?? null,
    reportKey: EXPORT_APPROVAL_REQUEST_KEY,
    filterSummary: "PENDING",
    exportFormat,
    accessedByUserId: args.auth.sub,
    accessedByRole: args.auth.role ?? null,
    request: args.request,
    metadataJson: {
      approvalRequestId,
      targetKey,
      caseId: args.caseId ?? null,
      exportFormat,
      reason,
      status: "PENDING",
    },
  });

  return {
    approvalRequestId,
    targetKey,
    caseId: args.caseId ?? null,
    exportFormat,
    requestedByUserId: args.auth.sub,
    requestedByRole: args.auth.role ?? null,
    requestedAt: new Date().toISOString(),
    reason,
    status: "PENDING" as const,
    approverUserId: null,
    approverRole: null,
    decidedAt: null,
    note: null,
  };
}

export async function decideExportApprovalRequest(args: {
  auth: AuthContext;
  approvalRequestId: string;
  decision: "APPROVED" | "REJECTED";
  note?: string | null;
  request?: NextRequest;
}) {
  const tenantId = requireTenantId(args.auth);
  const approvals = await listExportApprovalRequests(tenantId);
  const target = approvals.find((item) => item.approvalRequestId === args.approvalRequestId);

  if (!target) {
    throw new ApiError(404, "Export approval request not found");
  }

  if (target.status !== "PENDING") {
    throw new ApiError(409, `Export approval request is already ${target.status.toLowerCase()}`);
  }

  await logReportAccess({
    tenantId,
    caseId: target.caseId ?? null,
    reportKey: EXPORT_APPROVAL_DECISION_KEY,
    filterSummary: args.decision,
    exportFormat: target.exportFormat ?? null,
    accessedByUserId: args.auth.sub,
    accessedByRole: args.auth.role ?? null,
    request: args.request,
    metadataJson: {
      approvalRequestId: target.approvalRequestId,
      targetKey: target.targetKey,
      decision: args.decision,
      note: args.note?.trim() || null,
    },
  });

  return {
    ...target,
    status: args.decision,
    approverUserId: args.auth.sub,
    approverRole: args.auth.role ?? null,
    decidedAt: new Date().toISOString(),
    note: args.note?.trim() || null,
  };
}

export async function assertExportApprovalForAction(args: {
  auth: AuthContext;
  request: NextRequest;
  targetKey: string;
  caseId?: string | null;
  exportFormat?: string | null;
}) {
  const tenantId = requireTenantId(args.auth);
  const settings = await getTenantSecuritySettings(tenantId);

  if (!settings.exportApprovalRequired) {
    return { required: false, approved: true, approvalRequestId: null };
  }

  const approvalRequestId =
    args.request.nextUrl.searchParams.get("approvalId") ??
    args.request.headers.get("x-export-approval-id") ??
    null;

  const approvals = await listExportApprovalRequests(tenantId);
  const approved = isExportApprovalSatisfied({
    approvals,
    approvalRequestId,
    targetKey: args.targetKey,
    caseId: args.caseId ?? null,
    exportFormat: args.exportFormat ?? null,
  });

  if (!approved) {
    throw new ApiError(403, `Export approval required for ${args.targetKey}. Request approval before downloading this export.`);
  }

  return {
    required: true,
    approved: true,
    approvalRequestId,
  };
}
