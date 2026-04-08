import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { asRecord, nowPlusDays, toIsoString } from "@/lib/server/compliance-utils";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

const prisma = getPrisma();

export type RemediationCategory = "legal" | "privacy" | "security" | "resilience" | "third_party" | "workforce" | "operations";
export type RemediationSeverity = "standard" | "high" | "critical";
export type RemediationStatus = "OPEN" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "ACCEPTED_RISK";

export type RemediationTrackerItem = {
  id: string;
  actionKey: string;
  actionTitle: string;
  sourceType: string;
  sourceRef?: string | null;
  category: RemediationCategory;
  severity: RemediationSeverity;
  status: RemediationStatus;
  ownerName: string;
  dueAt?: string | null;
  completedAt?: string | null;
  evidenceLink?: string | null;
  rootCause?: string | null;
  notes?: string | null;
  completedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type RemediationTrackerActor = {
  actorId: string;
  actorRole?: string | null;
};

type RemediationTrackerPayload = Partial<RemediationTrackerItem> & {
  actionKey?: string | null;
  actionTitle?: string | null;
  sourceType?: string | null;
  sourceRef?: string | null;
  ownerName?: string | null;
  evidenceLink?: string | null;
  rootCause?: string | null;
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

function normalizeCategory(value: string | null | undefined): RemediationCategory {
  switch ((value ?? "").trim().toLowerCase()) {
    case "legal":
      return "legal";
    case "privacy":
      return "privacy";
    case "security":
      return "security";
    case "resilience":
      return "resilience";
    case "third_party":
    case "third-party":
      return "third_party";
    case "workforce":
      return "workforce";
    default:
      return "operations";
  }
}

function normalizeSeverity(value: string | null | undefined): RemediationSeverity {
  switch ((value ?? "").trim().toLowerCase()) {
    case "high":
      return "high";
    case "critical":
      return "critical";
    default:
      return "standard";
  }
}

function normalizeStatus(value: string | null | undefined): RemediationStatus {
  switch ((value ?? "").trim().toUpperCase()) {
    case "IN_PROGRESS":
      return "IN_PROGRESS";
    case "BLOCKED":
      return "BLOCKED";
    case "COMPLETED":
      return "COMPLETED";
    case "ACCEPTED_RISK":
      return "ACCEPTED_RISK";
    default:
      return "OPEN";
  }
}

export function normalizeRemediationTrackerItem(raw: Partial<RemediationTrackerItem> | null | undefined): RemediationTrackerItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const actionTitle = normalizeText(raw.actionTitle);
  const actionKey = normalizeKey(raw.actionKey, normalizeKey(actionTitle));
  if (!actionTitle || !actionKey) {
    return null;
  }

  return {
    id: normalizeText(raw.id, crypto.randomUUID()),
    actionKey,
    actionTitle,
    sourceType: normalizeText(raw.sourceType, "audit_finding"),
    sourceRef: normalizeText(raw.sourceRef) || null,
    category: normalizeCategory(raw.category),
    severity: normalizeSeverity(raw.severity),
    status: normalizeStatus(raw.status),
    ownerName: normalizeText(raw.ownerName, "Compliance Office"),
    dueAt: toIsoString(raw.dueAt) ?? null,
    completedAt: toIsoString(raw.completedAt) ?? null,
    evidenceLink: normalizeText(raw.evidenceLink) || null,
    rootCause: normalizeText(raw.rootCause) || null,
    notes: normalizeText(raw.notes) || null,
    completedBy: normalizeText(raw.completedBy) || null,
    createdAt: toIsoString(raw.createdAt) ?? null,
    updatedAt: toIsoString(raw.updatedAt) ?? null,
  };
}

export function extractRemediationTracker(metadata: unknown): RemediationTrackerItem[] {
  const root = asRecord(metadata);
  const compliance = asRecord(root?.compliance);
  const source = Array.isArray(root?.remediationTracker)
    ? root?.remediationTracker
    : Array.isArray(compliance?.remediationTracker)
      ? compliance?.remediationTracker
      : [];

  return source
    .map((entry) => normalizeRemediationTrackerItem(asRecord(entry) as Partial<RemediationTrackerItem> | null))
    .filter((entry): entry is RemediationTrackerItem => Boolean(entry))
    .sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")));
}

function isOpen(item: RemediationTrackerItem): boolean {
  return item.status !== "COMPLETED" && item.status !== "ACCEPTED_RISK";
}

export function summarizeRemediationTracker(items: Array<Partial<RemediationTrackerItem>>, now = new Date()) {
  const normalized = items
    .map((entry) => normalizeRemediationTrackerItem(entry))
    .filter((entry): entry is RemediationTrackerItem => Boolean(entry));

  let completedCount = 0;
  let openCount = 0;
  let overdueCount = 0;
  let criticalOpenCount = 0;
  let blockedCount = 0;
  const nowMs = now.getTime();

  for (const item of normalized) {
    if (item.status === "COMPLETED") {
      completedCount += 1;
    }

    const open = isOpen(item);
    if (open) {
      openCount += 1;
    }

    if (item.status === "BLOCKED") {
      blockedCount += 1;
    }

    const dueAt = item.dueAt ? new Date(item.dueAt).getTime() : null;
    if (open && dueAt !== null && Number.isFinite(dueAt) && dueAt < nowMs) {
      overdueCount += 1;
    }

    if (open && (item.severity === "high" || item.severity === "critical")) {
      criticalOpenCount += 1;
    }
  }

  const attention: Array<{
    code: string;
    severity: "warning" | "critical";
    label: string;
    value: number;
  }> = [];

  if (overdueCount > 0) {
    attention.push({
      code: "remediation_overdue",
      severity: overdueCount >= 2 ? "critical" : "warning",
      label: "Corrective actions are overdue",
      value: overdueCount,
    });
  }

  if (criticalOpenCount > 0) {
    attention.push({
      code: "remediation_critical_open",
      severity: criticalOpenCount >= 2 ? "critical" : "warning",
      label: "Critical remediation actions remain open",
      value: criticalOpenCount,
    });
  }

  if (blockedCount > 0) {
    attention.push({
      code: "remediation_blocked",
      severity: blockedCount >= 2 ? "critical" : "warning",
      label: "Some remediation actions are blocked and need escalation",
      value: blockedCount,
    });
  }

  return {
    total: normalized.length,
    completedCount,
    openCount,
    overdueCount,
    criticalOpenCount,
    blockedCount,
    attention,
  };
}

export function upsertRemediationTracker(
  existingItems: Array<Partial<RemediationTrackerItem>>,
  payload: RemediationTrackerPayload,
  actor: RemediationTrackerActor,
  now = new Date(),
) {
  const existing = existingItems
    .map((entry) => normalizeRemediationTrackerItem(entry))
    .filter((entry): entry is RemediationTrackerItem => Boolean(entry));

  const payloadId = normalizeText(payload.id);
  const current = payloadId ? existing.find((item) => item.id === payloadId) ?? null : null;

  if (payloadId && !current) {
    throw new ApiError(404, "Remediation action was not found");
  }

  const actionTitle = normalizeText(payload.actionTitle, current?.actionTitle ?? "");
  const actionKey = normalizeKey(payload.actionKey, current?.actionKey ?? normalizeKey(actionTitle));
  if (!actionTitle || !actionKey) {
    throw new ApiError(400, "actionKey and actionTitle are required");
  }

  const status = normalizeStatus(payload.status ?? current?.status);
  const dueAt =
    toIsoString(payload.dueAt) ??
    current?.dueAt ??
    (status === "COMPLETED" || status === "ACCEPTED_RISK" ? null : nowPlusDays(30, now).toISOString());

  const nowIso = now.toISOString();
  const item: RemediationTrackerItem = {
    id: current?.id ?? payloadId ?? crypto.randomUUID(),
    actionKey,
    actionTitle,
    sourceType: normalizeText(payload.sourceType, current?.sourceType ?? "audit_finding"),
    sourceRef: normalizeText(payload.sourceRef, current?.sourceRef ?? "") || null,
    category: normalizeCategory(payload.category ?? current?.category),
    severity: normalizeSeverity(payload.severity ?? current?.severity),
    status,
    ownerName: normalizeText(payload.ownerName, current?.ownerName ?? "Compliance Office"),
    dueAt,
    completedAt: status === "COMPLETED" ? (toIsoString(payload.completedAt) ?? nowIso) : null,
    evidenceLink: normalizeText(payload.evidenceLink, current?.evidenceLink ?? "") || null,
    rootCause: normalizeText(payload.rootCause, current?.rootCause ?? "") || null,
    notes: normalizeText(payload.notes, current?.notes ?? "") || null,
    completedBy: status === "COMPLETED" ? actor.actorId : current?.completedBy ?? null,
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
    summary: summarizeRemediationTracker(items, now),
  };
}

export async function listRemediationTrackerDashboard(auth: AuthContext) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.tenant_id },
    select: { metadata: true },
  });

  const items = extractRemediationTracker(tenant?.metadata);
  const summary = summarizeRemediationTracker(items);

  return {
    items,
    summary,
    metrics: {
      total: summary.total,
      completedCount: summary.completedCount,
      openCount: summary.openCount,
      overdueCount: summary.overdueCount,
      criticalOpenCount: summary.criticalOpenCount,
      blockedCount: summary.blockedCount,
    },
  };
}

export async function saveRemediationTrackerEntry(
  auth: AuthContext,
  payload: RemediationTrackerPayload,
  request?: NextRequest,
) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.tenant_id },
    select: { id: true, metadata: true },
  });

  if (!tenant) {
    throw new ApiError(404, "Tenant not found");
  }

  const result = upsertRemediationTracker(
    extractRemediationTracker(tenant.metadata),
    payload,
    { actorId: auth.sub, actorRole: auth.role ?? null },
  );

  const currentMetadata = asRecord(tenant.metadata);
  const nextMetadata = {
    ...(currentMetadata ?? {}),
    remediationTracker: result.items,
  } as Prisma.InputJsonValue;

  await prisma.tenant.update({
    where: { id: auth.tenant_id },
    data: { metadata: nextMetadata },
  });

  await writeAuditLog({
    tenantId: auth.tenant_id,
    userId: auth.sub,
    entityType: "remediation_tracker",
    entityId: result.item.id,
    action: result.created ? "remediation_tracker_created" : "remediation_tracker_updated",
    details: result.item.actionTitle,
    metadataJson: {
      ...result.item,
      actorRole: auth.role ?? null,
    },
    request,
  }).catch(() => undefined);

  return result;
}
