import { DsrRequestStatus, DsrRequestType } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { nowPlusDays } from "@/lib/server/compliance-utils";
import { writeAuditLog } from "@/lib/server/saas-services";

const prisma = () => getPrisma();

export function calculateDsrDueDates(requestedAt = new Date()) {
  return {
    defaultDueAt: nowPlusDays(30, requestedAt),
    maxExtendedDueAt: nowPlusDays(60, requestedAt),
  };
}

export function deriveDsrSlaState(request: {
  status: DsrRequestStatus | string;
  dueAt: Date | string;
  extendedDueAt?: Date | string | null;
}) {
  const status = String(request.status).toUpperCase();
  if (status === "REJECTED" || status === "EXECUTED" || status === "CLOSED") {
    return "closed";
  }

  const dueDate = new Date(request.extendedDueAt ?? request.dueAt);
  const remainingMs = dueDate.getTime() - Date.now();
  if (remainingMs < 0) {
    return "breached";
  }
  if (remainingMs <= 5 * 24 * 60 * 60 * 1000) {
    return "warning";
  }
  return "on_track";
}

export function summarizeDsrRequests(
  requests: Array<{
    status: DsrRequestStatus | string;
    dueAt: Date | string;
    extendedDueAt?: Date | string | null;
  }>,
) {
  const byStatus: Record<string, number> = {};
  const bySlaState: Record<string, number> = {};
  let openCount = 0;

  for (const request of requests) {
    const status = String(request.status).toUpperCase();
    const slaState = deriveDsrSlaState(request);

    byStatus[status] = (byStatus[status] ?? 0) + 1;
    bySlaState[slaState] = (bySlaState[slaState] ?? 0) + 1;

    if (slaState !== "closed") {
      openCount += 1;
    }
  }

  return {
    total: requests.length,
    openCount,
    byStatus,
    bySlaState,
  };
}

function parseRequestType(value: string | null | undefined): DsrRequestType {
  const normalized = (value ?? "").trim().toUpperCase();
  switch (normalized) {
    case "CORRECTION":
      return DsrRequestType.CORRECTION;
    case "DELETION":
      return DsrRequestType.DELETION;
    case "RESTRICTION":
    case "RESTRICTION_OBJECTION":
    case "OBJECTION":
      return DsrRequestType.RESTRICTION_OBJECTION;
    case "EXPORT":
      return DsrRequestType.EXPORT;
    default:
      return DsrRequestType.ACCESS;
  }
}

function parseStatus(value: string | null | undefined): DsrRequestStatus {
  const normalized = (value ?? "").trim().toUpperCase();
  if (normalized in DsrRequestStatus) {
    return DsrRequestStatus[normalized as keyof typeof DsrRequestStatus];
  }
  return DsrRequestStatus.REQUESTED;
}

export async function listDataSubjectRequests(tenantId: string) {
  const requests = await prisma().dataSubjectRequest.findMany({
    where: { tenantId },
    orderBy: { requestedAt: "desc" },
    take: 200,
  }).catch(() => []);

  return requests.map((request) => ({
    ...request,
    slaState: deriveDsrSlaState(request),
  }));
}

export async function createDataSubjectRequest(
  auth: AuthContext,
  payload: {
    caseId?: string | null;
    requestType?: string;
    requesterName?: string;
    requesterIdNumber?: string;
    requestReason?: string;
  },
  request?: NextRequest,
) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }
  if (!payload.requesterName?.trim()) {
    throw new ApiError(400, "requesterName is required");
  }

  const dueDates = calculateDsrDueDates();
  const created = await prisma().dataSubjectRequest.create({
    data: {
      tenantId: auth.tenant_id,
      caseId: payload.caseId?.trim() || null,
      requestType: parseRequestType(payload.requestType),
      requesterName: payload.requesterName.trim(),
      requesterIdNumber: payload.requesterIdNumber?.trim() || null,
      requestReason: payload.requestReason?.trim() || null,
      dueAt: dueDates.defaultDueAt,
    },
  });

  await writeAuditLog({
    tenantId: auth.tenant_id,
    userId: auth.sub,
    entityType: "data_subject_request",
    entityId: created.id,
    action: "dsr_requested",
    details: `DSR request created (${created.requestType})`,
    caseId: created.caseId,
    metadataJson: {
      status: created.status,
      dueAt: created.dueAt.toISOString(),
    },
    request,
  }).catch(() => undefined);

  return {
    ...created,
    slaState: deriveDsrSlaState(created),
  };
}

export async function updateDataSubjectRequest(
  auth: AuthContext,
  requestId: string,
  payload: {
    status?: string;
    extendByDays?: number;
    extensionReason?: string;
  },
  request?: NextRequest,
) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }

  const existing = await prisma().dataSubjectRequest.findFirst({
    where: { id: requestId, tenantId: auth.tenant_id },
  });

  if (!existing) {
    throw new ApiError(404, "Data subject request not found");
  }

  let extendedDueAt = existing.extendedDueAt;
  if (payload.extendByDays && payload.extendByDays > 0) {
    if (!payload.extensionReason?.trim()) {
      throw new ApiError(400, "extensionReason is required when extending SLA");
    }
    const limit = calculateDsrDueDates(existing.requestedAt).maxExtendedDueAt;
    const proposed = nowPlusDays(Math.min(payload.extendByDays, 30), existing.dueAt);
    extendedDueAt = proposed > limit ? limit : proposed;
  }

  const updated = await prisma().dataSubjectRequest.update({
    where: { id: existing.id },
    data: {
      status: payload.status ? parseStatus(payload.status) : existing.status,
      extendedDueAt,
      extensionReason: payload.extensionReason?.trim() || existing.extensionReason,
      identityVerifiedAt:
        payload.status?.toUpperCase() === "IDENTITY_VERIFIED" ? new Date() : existing.identityVerifiedAt,
      legalReviewedAt:
        payload.status?.toUpperCase() === "LEGAL_REVIEW" ? new Date() : existing.legalReviewedAt,
      executedAt:
        payload.status?.toUpperCase() === "EXECUTED" ? new Date() : existing.executedAt,
      closedAt:
        payload.status?.toUpperCase() === "CLOSED" ? new Date() : existing.closedAt,
    },
  });

  await writeAuditLog({
    tenantId: auth.tenant_id,
    userId: auth.sub,
    entityType: "data_subject_request",
    entityId: updated.id,
    action: "dsr_updated",
    details: `DSR moved to ${updated.status}`,
    caseId: updated.caseId,
    metadataJson: {
      status: updated.status,
      extendedDueAt: updated.extendedDueAt?.toISOString() ?? null,
    },
    request,
  }).catch(() => undefined);

  return {
    ...updated,
    slaState: deriveDsrSlaState(updated),
  };
}