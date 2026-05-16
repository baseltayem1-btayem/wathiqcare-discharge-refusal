import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { asRecord, nowPlusDays, toIsoString } from "@/lib/server/compliance-utils";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

const prisma = () => getPrisma();

export type PolicyCriticality = "standard" | "high" | "critical";
export type PolicyAttestationStatus = "PENDING_REVIEW" | "ATTESTED" | "EXCEPTION" | "RETIRED";

export type PolicyAttestationItem = {
  id: string;
  policyKey: string;
  policyName: string;
  framework: string;
  ownerName: string;
  criticality: PolicyCriticality;
  status: PolicyAttestationStatus;
  reviewFrequencyDays: number;
  nextReviewDueAt?: string | null;
  evidenceLink?: string | null;
  exceptionReason?: string | null;
  exceptionExpiresAt?: string | null;
  notes?: string | null;
  attestedBy?: string | null;
  attestedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type PolicyAttestationActor = {
  actorId: string;
  actorRole?: string | null;
};

type PolicyAttestationPayload = Partial<PolicyAttestationItem> & {
  policyKey?: string | null;
  policyName?: string | null;
  framework?: string | null;
  ownerName?: string | null;
  evidenceLink?: string | null;
  exceptionReason?: string | null;
  notes?: string | null;
};

function normalizeText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeKey(value: unknown, fallback = ""): string {
  const raw = normalizeText(value, fallback);
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;
}

function normalizeCriticality(value: string | null | undefined): PolicyCriticality {
  switch ((value ?? "").trim().toLowerCase()) {
    case "high":
      return "high";
    case "critical":
      return "critical";
    default:
      return "standard";
  }
}

function normalizeStatus(value: string | null | undefined): PolicyAttestationStatus {
  switch ((value ?? "").trim().toUpperCase()) {
    case "ATTESTED":
      return "ATTESTED";
    case "EXCEPTION":
      return "EXCEPTION";
    case "RETIRED":
      return "RETIRED";
    default:
      return "PENDING_REVIEW";
  }
}

function normalizeReviewFrequency(value: unknown, fallback = 365): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(30, Math.floor(value));
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(30, Math.floor(parsed));
    }
  }

  return fallback;
}

export function normalizePolicyAttestationItem(raw: Partial<PolicyAttestationItem> | null | undefined): PolicyAttestationItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const policyName = normalizeText(raw.policyName);
  const policyKey = normalizeKey(raw.policyKey, normalizeKey(policyName));
  if (!policyKey || !policyName) {
    return null;
  }

  return {
    id: normalizeText(raw.id, crypto.randomUUID()),
    policyKey,
    policyName,
    framework: normalizeText(raw.framework, "PDPL"),
    ownerName: normalizeText(raw.ownerName, "Compliance"),
    criticality: normalizeCriticality(raw.criticality),
    status: normalizeStatus(raw.status),
    reviewFrequencyDays: normalizeReviewFrequency(raw.reviewFrequencyDays),
    nextReviewDueAt: toIsoString(raw.nextReviewDueAt) ?? null,
    evidenceLink: normalizeText(raw.evidenceLink) || null,
    exceptionReason: normalizeText(raw.exceptionReason) || null,
    exceptionExpiresAt: toIsoString(raw.exceptionExpiresAt) ?? null,
    notes: normalizeText(raw.notes) || null,
    attestedBy: normalizeText(raw.attestedBy) || null,
    attestedAt: toIsoString(raw.attestedAt) ?? null,
    createdAt: toIsoString(raw.createdAt) ?? null,
    updatedAt: toIsoString(raw.updatedAt) ?? null,
  };
}

export function extractPolicyAttestationRegister(metadata: unknown): PolicyAttestationItem[] {
  const root = asRecord(metadata);
  const compliance = asRecord(root?.compliance);
  const source = Array.isArray(root?.policyAttestationRegister)
    ? root?.policyAttestationRegister
    : Array.isArray(compliance?.policyAttestationRegister)
      ? compliance?.policyAttestationRegister
      : [];

  return source
    .map((entry) => normalizePolicyAttestationItem(asRecord(entry) as Partial<PolicyAttestationItem> | null))
    .filter((entry): entry is PolicyAttestationItem => Boolean(entry))
    .sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")));
}

function isOverdue(item: PolicyAttestationItem, now: Date): boolean {
  if (item.status === "RETIRED") {
    return false;
  }
  const dueAt = item.nextReviewDueAt ? new Date(item.nextReviewDueAt).getTime() : null;
  return dueAt !== null && Number.isFinite(dueAt) && dueAt < now.getTime();
}

function hasOpenException(item: PolicyAttestationItem, now: Date): boolean {
  if (item.status !== "EXCEPTION") {
    return false;
  }
  if (!item.exceptionExpiresAt) {
    return true;
  }
  return new Date(item.exceptionExpiresAt).getTime() >= now.getTime();
}

export function summarizePolicyAttestations(items: Array<Partial<PolicyAttestationItem>>, now = new Date()) {
  const normalized = items
    .map((entry) => normalizePolicyAttestationItem(entry))
    .filter((entry): entry is PolicyAttestationItem => Boolean(entry));

  let attestedCount = 0;
  let overdueAttestations = 0;
  let openExceptions = 0;
  let criticalFindings = 0;

  for (const item of normalized) {
    if (item.status === "ATTESTED") {
      attestedCount += 1;
    }

    const overdue = isOverdue(item, now);
    const openException = hasOpenException(item, now);

    if (overdue) {
      overdueAttestations += 1;
    }

    if (openException) {
      openExceptions += 1;
    }

    if ((item.criticality === "high" || item.criticality === "critical") && (overdue || openException)) {
      criticalFindings += 1;
    }
  }

  const attention: Array<{
    code: string;
    severity: "warning" | "critical";
    label: string;
    value: number;
  }> = [];

  if (overdueAttestations > 0) {
    attention.push({
      code: "policy_attestations_overdue",
      severity: overdueAttestations >= 2 ? "critical" : "warning",
      label: "Policy or control attestations are overdue",
      value: overdueAttestations,
    });
  }

  if (openExceptions > 0) {
    attention.push({
      code: "policy_exceptions_open",
      severity: openExceptions >= 2 ? "critical" : "warning",
      label: "Temporary governance exceptions remain open",
      value: openExceptions,
    });
  }

  if (criticalFindings > 0) {
    attention.push({
      code: "policy_critical_findings",
      severity: criticalFindings >= 2 ? "critical" : "warning",
      label: "Critical policies require attestation or exception closure",
      value: criticalFindings,
    });
  }

  return {
    total: normalized.length,
    attestedCount,
    overdueAttestations,
    openExceptions,
    criticalFindings,
    attention,
  };
}

export function upsertPolicyAttestationRegister(
  existingItems: Array<Partial<PolicyAttestationItem>>,
  payload: PolicyAttestationPayload,
  actor: PolicyAttestationActor,
  now = new Date(),
) {
  const existing = existingItems
    .map((entry) => normalizePolicyAttestationItem(entry))
    .filter((entry): entry is PolicyAttestationItem => Boolean(entry));

  const payloadId = normalizeText(payload.id);
  const current = payloadId ? existing.find((item) => item.id === payloadId) ?? null : null;

  if (payloadId && !current) {
    throw new ApiError(404, "Policy attestation record was not found");
  }

  const policyName = normalizeText(payload.policyName, current?.policyName ?? "");
  const policyKey = normalizeKey(payload.policyKey, current?.policyKey ?? normalizeKey(policyName));
  if (!policyName || !policyKey) {
    throw new ApiError(400, "policyKey and policyName are required");
  }

  const status = normalizeStatus(payload.status ?? current?.status);
  const reviewFrequencyDays = normalizeReviewFrequency(payload.reviewFrequencyDays ?? current?.reviewFrequencyDays ?? 365);
  const nextReviewDueAt = toIsoString(payload.nextReviewDueAt)
    ?? current?.nextReviewDueAt
    ?? nowPlusDays(reviewFrequencyDays, now).toISOString();
  const exceptionExpiresAt = toIsoString(payload.exceptionExpiresAt) ?? current?.exceptionExpiresAt ?? null;
  const exceptionReason = normalizeText(payload.exceptionReason, current?.exceptionReason ?? "") || null;

  if (status === "EXCEPTION" && !exceptionReason) {
    throw new ApiError(400, "exceptionReason is required when a policy remains under exception");
  }

  if (status === "EXCEPTION" && !exceptionExpiresAt) {
    throw new ApiError(400, "exceptionExpiresAt is required for open policy exceptions");
  }

  const nowIso = now.toISOString();
  const item: PolicyAttestationItem = {
    id: current?.id ?? payloadId ?? crypto.randomUUID(),
    policyKey,
    policyName,
    framework: normalizeText(payload.framework, current?.framework ?? "PDPL"),
    ownerName: normalizeText(payload.ownerName, current?.ownerName ?? "Compliance"),
    criticality: normalizeCriticality(payload.criticality ?? current?.criticality),
    status,
    reviewFrequencyDays,
    nextReviewDueAt,
    evidenceLink: normalizeText(payload.evidenceLink, current?.evidenceLink ?? "") || null,
    exceptionReason,
    exceptionExpiresAt: status === "EXCEPTION" ? exceptionExpiresAt : null,
    notes: normalizeText(payload.notes, current?.notes ?? "") || null,
    attestedBy: status === "ATTESTED" ? actor.actorId : current?.attestedBy ?? null,
    attestedAt: status === "ATTESTED" ? nowIso : current?.attestedAt ?? null,
    createdAt: current?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };

  const items = current
    ? existing.map((entry) => (entry.id === item.id ? item : entry))
    : [item, ...existing];

  items.sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")));

  return {
    created: !current,
    item,
    items,
    summary: summarizePolicyAttestations(items, now),
  };
}

export async function listPolicyAttestationDashboard(auth: AuthContext) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }

  const tenant = await prisma().tenant.findUnique({
    where: { id: auth.tenant_id },
    select: { metadata: true },
  });

  const items = extractPolicyAttestationRegister(tenant?.metadata);
  const summary = summarizePolicyAttestations(items);

  return {
    items,
    summary,
    metrics: {
      total: summary.total,
      attestedCount: summary.attestedCount,
      overdueAttestations: summary.overdueAttestations,
      openExceptions: summary.openExceptions,
      criticalFindings: summary.criticalFindings,
    },
  };
}

export async function savePolicyAttestationEntry(
  auth: AuthContext,
  payload: PolicyAttestationPayload,
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

  const result = upsertPolicyAttestationRegister(
    extractPolicyAttestationRegister(tenant.metadata),
    payload,
    { actorId: auth.sub, actorRole: auth.role ?? null },
  );

  const currentMetadata = asRecord(tenant.metadata);
  const nextMetadata = {
    ...(currentMetadata ?? {}),
    policyAttestationRegister: result.items,
  } as Prisma.InputJsonValue;

  await prisma().tenant.update({
    where: { id: auth.tenant_id },
    data: { metadata: nextMetadata },
  });

  await writeAuditLog({
    tenantId: auth.tenant_id,
    userId: auth.sub,
    entityType: "policy_attestation",
    entityId: result.item.id,
    action: result.created ? "policy_attestation_created" : "policy_attestation_updated",
    details: result.item.policyName,
    metadataJson: {
      ...result.item,
      actorRole: auth.role ?? null,
    },
    request,
  }).catch(() => undefined);

  return result;
}
