import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { asRecord, toIsoString } from "@/lib/server/compliance-utils";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

const prisma = () => getPrisma();

export type ThirdPartyRiskTier = "low" | "medium" | "high" | "critical";
export type ThirdPartyRiskStatus = "PENDING_REVIEW" | "APPROVED" | "RESTRICTED" | "REJECTED";
export type ThirdPartyResidencyScope = "KSA_ONLY" | "CONTROLLED_EXPORT" | "GLOBAL_NON_PERSONAL";

export type ThirdPartyRiskItem = {
  id: string;
  processorName: string;
  serviceType: string;
  hostingRegion: string;
  residencyScope: ThirdPartyResidencyScope;
  crossBorderTransfer: boolean;
  transferMechanism?: string | null;
  contractInPlace: boolean;
  securityReviewCompleted: boolean;
  containsPatientData: boolean;
  riskTier: ThirdPartyRiskTier;
  status: ThirdPartyRiskStatus;
  ownerName?: string | null;
  notes?: string | null;
  lastReviewAt?: string | null;
  nextReviewDueAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ThirdPartyRiskActor = {
  actorId: string;
  actorRole?: string | null;
};

type ThirdPartyRiskUpsertPayload = Partial<ThirdPartyRiskItem> & {
  processorName?: string | null;
  serviceType?: string | null;
  hostingRegion?: string | null;
  transferMechanism?: string | null;
  ownerName?: string | null;
  notes?: string | null;
};

function normalizeRiskTier(value: string | null | undefined): ThirdPartyRiskTier {
  switch ((value ?? "").trim().toLowerCase()) {
    case "low":
      return "low";
    case "high":
      return "high";
    case "critical":
      return "critical";
    default:
      return "medium";
  }
}

function normalizeStatus(value: string | null | undefined): ThirdPartyRiskStatus {
  switch ((value ?? "").trim().toUpperCase()) {
    case "APPROVED":
      return "APPROVED";
    case "RESTRICTED":
      return "RESTRICTED";
    case "REJECTED":
      return "REJECTED";
    default:
      return "PENDING_REVIEW";
  }
}

function normalizeResidencyScope(value: string | null | undefined): ThirdPartyResidencyScope {
  switch ((value ?? "").trim().toUpperCase()) {
    case "GLOBAL_NON_PERSONAL":
      return "GLOBAL_NON_PERSONAL";
    case "CONTROLLED_EXPORT":
      return "CONTROLLED_EXPORT";
    default:
      return "KSA_ONLY";
  }
}

function normalizeText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeThirdPartyRiskItem(raw: Partial<ThirdPartyRiskItem> | null | undefined): ThirdPartyRiskItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const processorName = normalizeText(raw.processorName);
  if (!processorName) {
    return null;
  }

  const crossBorderTransfer = normalizeBoolean(raw.crossBorderTransfer, false);
  const transferMechanism = normalizeText(raw.transferMechanism, crossBorderTransfer ? "" : "Not required");

  return {
    id: normalizeText(raw.id, crypto.randomUUID()),
    processorName,
    serviceType: normalizeText(raw.serviceType, "general"),
    hostingRegion: normalizeText(raw.hostingRegion, "saudi-arabia-riyadh"),
    residencyScope: normalizeResidencyScope(raw.residencyScope),
    crossBorderTransfer,
    transferMechanism: transferMechanism || null,
    contractInPlace: normalizeBoolean(raw.contractInPlace, false),
    securityReviewCompleted: normalizeBoolean(raw.securityReviewCompleted, false),
    containsPatientData: normalizeBoolean(raw.containsPatientData, true),
    riskTier: normalizeRiskTier(raw.riskTier),
    status: normalizeStatus(raw.status),
    ownerName: normalizeText(raw.ownerName) || null,
    notes: normalizeText(raw.notes) || null,
    lastReviewAt: toIsoString(raw.lastReviewAt) ?? null,
    nextReviewDueAt: toIsoString(raw.nextReviewDueAt) ?? null,
    approvedBy: normalizeText(raw.approvedBy) || null,
    approvedAt: toIsoString(raw.approvedAt) ?? null,
    createdAt: toIsoString(raw.createdAt) ?? null,
    updatedAt: toIsoString(raw.updatedAt) ?? null,
  };
}

export function extractThirdPartyRiskRegister(metadata: unknown): ThirdPartyRiskItem[] {
  const root = asRecord(metadata);
  const nested = asRecord(root?.compliance);
  const source = Array.isArray(root?.thirdPartyRiskRegister)
    ? root?.thirdPartyRiskRegister
    : Array.isArray(nested?.thirdPartyRiskRegister)
      ? nested?.thirdPartyRiskRegister
      : [];

  return source
    .map((entry) => normalizeThirdPartyRiskItem(asRecord(entry) as Partial<ThirdPartyRiskItem> | null))
    .filter((entry): entry is ThirdPartyRiskItem => Boolean(entry))
    .sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")));
}

function isCrossBorderFlagged(item: ThirdPartyRiskItem): boolean {
  if (!item.crossBorderTransfer) {
    return false;
  }

  return item.status !== "APPROVED" || !item.contractInPlace || !item.securityReviewCompleted || !normalizeText(item.transferMechanism);
}

export function summarizeThirdPartyRisk(items: Array<Partial<ThirdPartyRiskItem>>, now = new Date()) {
  const normalized = items
    .map((entry) => normalizeThirdPartyRiskItem(entry))
    .filter((entry): entry is ThirdPartyRiskItem => Boolean(entry));

  let approvedCount = 0;
  let restrictedCount = 0;
  let overdueReviews = 0;
  let crossBorderFlags = 0;
  let highRiskCount = 0;
  let missingContracts = 0;
  const nowMs = now.getTime();

  for (const item of normalized) {
    if (item.status === "APPROVED") {
      approvedCount += 1;
    }
    if (item.status === "RESTRICTED") {
      restrictedCount += 1;
    }
    if (item.riskTier === "high" || item.riskTier === "critical") {
      highRiskCount += 1;
    }
    if (!item.contractInPlace) {
      missingContracts += 1;
    }

    const nextReviewDueAt = item.nextReviewDueAt ? new Date(item.nextReviewDueAt).getTime() : null;
    if (nextReviewDueAt !== null && Number.isFinite(nextReviewDueAt) && nextReviewDueAt < nowMs && item.status !== "REJECTED") {
      overdueReviews += 1;
    }

    if (isCrossBorderFlagged(item)) {
      crossBorderFlags += 1;
    }
  }

  const attention: Array<{
    code: string;
    severity: "warning" | "critical";
    label: string;
    value: number;
  }> = [];

  if (overdueReviews > 0) {
    attention.push({
      code: "third_party_overdue_reviews",
      severity: overdueReviews >= 2 ? "critical" : "warning",
      label: "Third-party processor reviews are overdue",
      value: overdueReviews,
    });
  }

  if (crossBorderFlags > 0) {
    attention.push({
      code: "third_party_cross_border",
      severity: crossBorderFlags >= 2 ? "critical" : "warning",
      label: "Cross-border processors lack complete transfer safeguards",
      value: crossBorderFlags,
    });
  }

  if (missingContracts > 0) {
    attention.push({
      code: "third_party_missing_contracts",
      severity: missingContracts >= 2 ? "critical" : "warning",
      label: "Processor agreements or DPAs are missing",
      value: missingContracts,
    });
  }

  return {
    total: normalized.length,
    approvedCount,
    restrictedCount,
    overdueReviews,
    crossBorderFlags,
    highRiskCount,
    missingContracts,
    attention,
  };
}

export function upsertThirdPartyRiskRegister(
  existingItems: Array<Partial<ThirdPartyRiskItem>>,
  payload: ThirdPartyRiskUpsertPayload,
  actor: ThirdPartyRiskActor,
  now = new Date(),
) {
  const existing = existingItems
    .map((entry) => normalizeThirdPartyRiskItem(entry))
    .filter((entry): entry is ThirdPartyRiskItem => Boolean(entry));

  const payloadId = normalizeText(payload.id);
  const current = payloadId ? existing.find((item) => item.id === payloadId) ?? null : null;

  if (payloadId && !current) {
    throw new ApiError(404, "Third-party processor entry was not found");
  }

  const processorName = normalizeText(payload.processorName, current?.processorName ?? "");
  if (!processorName) {
    throw new ApiError(400, "processorName is required");
  }

  const crossBorderTransfer = typeof payload.crossBorderTransfer === "boolean"
    ? payload.crossBorderTransfer
    : current?.crossBorderTransfer ?? false;
  const status = normalizeStatus(payload.status ?? current?.status);
  const riskTier = normalizeRiskTier(payload.riskTier ?? current?.riskTier);
  const contractInPlace = typeof payload.contractInPlace === "boolean"
    ? payload.contractInPlace
    : current?.contractInPlace ?? false;
  const securityReviewCompleted = typeof payload.securityReviewCompleted === "boolean"
    ? payload.securityReviewCompleted
    : current?.securityReviewCompleted ?? false;
  const containsPatientData = typeof payload.containsPatientData === "boolean"
    ? payload.containsPatientData
    : current?.containsPatientData ?? true;
  const residencyScope = normalizeResidencyScope(
    payload.residencyScope ?? current?.residencyScope ?? (crossBorderTransfer ? "CONTROLLED_EXPORT" : "KSA_ONLY"),
  );
  const transferMechanism = normalizeText(
    payload.transferMechanism,
    current?.transferMechanism ?? (crossBorderTransfer ? "" : "Not required"),
  ) || null;

  if (containsPatientData && residencyScope === "GLOBAL_NON_PERSONAL") {
    throw new ApiError(400, "Patient-related processors cannot use the GLOBAL_NON_PERSONAL residency scope");
  }

  if (status === "APPROVED" && !contractInPlace) {
    throw new ApiError(400, "A contract or DPA must be in place before approval");
  }

  if (status === "APPROVED" && !securityReviewCompleted) {
    throw new ApiError(400, "Security review must be completed before approval");
  }

  if (crossBorderTransfer && status === "APPROVED" && !transferMechanism) {
    throw new ApiError(400, "transferMechanism is required when approving a cross-border processor");
  }

  const nowIso = now.toISOString();
  const item: ThirdPartyRiskItem = {
    id: current?.id ?? payloadId ?? crypto.randomUUID(),
    processorName,
    serviceType: normalizeText(payload.serviceType, current?.serviceType ?? "general"),
    hostingRegion: normalizeText(payload.hostingRegion, current?.hostingRegion ?? "saudi-arabia-riyadh"),
    residencyScope,
    crossBorderTransfer,
    transferMechanism,
    contractInPlace,
    securityReviewCompleted,
    containsPatientData,
    riskTier,
    status,
    ownerName: normalizeText(payload.ownerName, current?.ownerName ?? "") || null,
    notes: normalizeText(payload.notes, current?.notes ?? "") || null,
    lastReviewAt: toIsoString(payload.lastReviewAt) ?? current?.lastReviewAt ?? (status === "APPROVED" ? nowIso : null),
    nextReviewDueAt: toIsoString(payload.nextReviewDueAt) ?? current?.nextReviewDueAt ?? null,
    approvedBy: status === "APPROVED" ? actor.actorId : current?.approvedBy ?? null,
    approvedAt: status === "APPROVED" ? nowIso : current?.approvedAt ?? null,
    createdAt: current?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };

  const nextItems = current
    ? existing.map((entry) => (entry.id === item.id ? item : entry))
    : [item, ...existing];

  nextItems.sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")));

  return {
    created: !current,
    item,
    items: nextItems,
    summary: summarizeThirdPartyRisk(nextItems, now),
  };
}

export async function listThirdPartyRiskDashboard(auth: AuthContext) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }

  const tenant = await prisma().tenant.findUnique({
    where: { id: auth.tenant_id },
    select: { metadata: true },
  });

  const items = extractThirdPartyRiskRegister(tenant?.metadata);
  const summary = summarizeThirdPartyRisk(items);

  return {
    items,
    summary,
    metrics: {
      total: summary.total,
      approvedCount: summary.approvedCount,
      overdueReviews: summary.overdueReviews,
      crossBorderFlags: summary.crossBorderFlags,
      highRiskCount: summary.highRiskCount,
      missingContracts: summary.missingContracts,
    },
  };
}

export async function saveThirdPartyRiskEntry(
  auth: AuthContext,
  payload: ThirdPartyRiskUpsertPayload,
  request?: NextRequest,
) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }

  const tenant = await prisma().tenant.findUnique({
    where: { id: auth.tenant_id },
    select: { id: true, metadata: true },
  });

  if (!tenant) {
    throw new ApiError(404, "Tenant not found");
  }

  const result = upsertThirdPartyRiskRegister(
    extractThirdPartyRiskRegister(tenant.metadata),
    payload,
    { actorId: auth.sub, actorRole: auth.role ?? null },
  );

  const currentMetadata = asRecord(tenant.metadata);
  const nextMetadata = {
    ...(currentMetadata ?? {}),
    thirdPartyRiskRegister: result.items,
  } as JsonInputValue;

  await prisma().tenant.update({
    where: { id: auth.tenant_id },
    data: { metadata: nextMetadata },
  });

  await writeAuditLog({
    tenantId: auth.tenant_id,
    userId: auth.sub,
    entityType: "third_party_processor",
    entityId: result.item.id,
    action: result.created ? "third_party_processor_created" : "third_party_processor_updated",
    details: result.item.processorName,
    metadataJson: {
      ...result.item,
      actorRole: auth.role ?? null,
    },
    request,
  }).catch(() => undefined);

  return result;
}
