import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { asRecord, nowPlusDays, toIsoString } from "@/lib/server/compliance-utils";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

const prisma = () => getPrisma();

export type TrainingCriticality = "standard" | "high" | "critical";
export type TrainingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "EXEMPTED";

export type TrainingComplianceItem = {
  id: string;
  moduleKey: string;
  moduleName: string;
  targetRole: string;
  ownerName: string;
  criticality: TrainingCriticality;
  status: TrainingStatus;
  mandatory: boolean;
  dueAt?: string | null;
  completedAt?: string | null;
  evidenceLink?: string | null;
  notes?: string | null;
  completedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type TrainingComplianceActor = {
  actorId: string;
  actorRole?: string | null;
};

type TrainingCompliancePayload = Partial<TrainingComplianceItem> & {
  moduleKey?: string | null;
  moduleName?: string | null;
  targetRole?: string | null;
  ownerName?: string | null;
  evidenceLink?: string | null;
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

function normalizeCriticality(value: string | null | undefined): TrainingCriticality {
  switch ((value ?? "").trim().toLowerCase()) {
    case "high":
      return "high";
    case "critical":
      return "critical";
    default:
      return "standard";
  }
}

function normalizeStatus(value: string | null | undefined): TrainingStatus {
  switch ((value ?? "").trim().toUpperCase()) {
    case "IN_PROGRESS":
      return "IN_PROGRESS";
    case "COMPLETED":
      return "COMPLETED";
    case "EXEMPTED":
      return "EXEMPTED";
    default:
      return "NOT_STARTED";
  }
}

function normalizeBoolean(value: unknown, fallback = true): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeTrainingComplianceItem(raw: Partial<TrainingComplianceItem> | null | undefined): TrainingComplianceItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const moduleName = normalizeText(raw.moduleName);
  const moduleKey = normalizeKey(raw.moduleKey, normalizeKey(moduleName));
  if (!moduleKey || !moduleName) {
    return null;
  }

  return {
    id: normalizeText(raw.id, crypto.randomUUID()),
    moduleKey,
    moduleName,
    targetRole: normalizeText(raw.targetRole, "all_staff"),
    ownerName: normalizeText(raw.ownerName, "Compliance"),
    criticality: normalizeCriticality(raw.criticality),
    status: normalizeStatus(raw.status),
    mandatory: normalizeBoolean(raw.mandatory, true),
    dueAt: toIsoString(raw.dueAt) ?? null,
    completedAt: toIsoString(raw.completedAt) ?? null,
    evidenceLink: normalizeText(raw.evidenceLink) || null,
    notes: normalizeText(raw.notes) || null,
    completedBy: normalizeText(raw.completedBy) || null,
    createdAt: toIsoString(raw.createdAt) ?? null,
    updatedAt: toIsoString(raw.updatedAt) ?? null,
  };
}

export function extractTrainingComplianceRegister(metadata: unknown): TrainingComplianceItem[] {
  const root = asRecord(metadata);
  const compliance = asRecord(root?.compliance);
  const source = Array.isArray(root?.trainingComplianceRegister)
    ? root?.trainingComplianceRegister
    : Array.isArray(compliance?.trainingComplianceRegister)
      ? compliance?.trainingComplianceRegister
      : [];

  return source
    .map((entry) => normalizeTrainingComplianceItem(asRecord(entry) as Partial<TrainingComplianceItem> | null))
    .filter((entry): entry is TrainingComplianceItem => Boolean(entry))
    .sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")));
}

function isOutstanding(item: TrainingComplianceItem): boolean {
  return item.status !== "COMPLETED" && item.status !== "EXEMPTED";
}

export function summarizeTrainingCompliance(items: Array<Partial<TrainingComplianceItem>>, now = new Date()) {
  const normalized = items
    .map((entry) => normalizeTrainingComplianceItem(entry))
    .filter((entry): entry is TrainingComplianceItem => Boolean(entry));

  let completedCount = 0;
  let overdueCount = 0;
  let criticalGapCount = 0;
  let notStartedCount = 0;
  const nowMs = now.getTime();

  for (const item of normalized) {
    if (item.status === "COMPLETED") {
      completedCount += 1;
    }

    if (item.status === "NOT_STARTED") {
      notStartedCount += 1;
    }

    const dueAt = item.dueAt ? new Date(item.dueAt).getTime() : null;
    if (item.mandatory && isOutstanding(item) && dueAt !== null && Number.isFinite(dueAt) && dueAt < nowMs) {
      overdueCount += 1;
    }

    if (item.mandatory && isOutstanding(item) && (item.criticality === "high" || item.criticality === "critical")) {
      criticalGapCount += 1;
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
      code: "training_overdue",
      severity: overdueCount >= 2 ? "critical" : "warning",
      label: "Mandatory training modules are overdue",
      value: overdueCount,
    });
  }

  if (criticalGapCount > 0) {
    attention.push({
      code: "training_critical_gap",
      severity: criticalGapCount >= 2 ? "critical" : "warning",
      label: "Critical workforce readiness gaps remain open",
      value: criticalGapCount,
    });
  }

  return {
    total: normalized.length,
    completedCount,
    overdueCount,
    criticalGapCount,
    notStartedCount,
    attention,
  };
}

export function upsertTrainingComplianceRegister(
  existingItems: Array<Partial<TrainingComplianceItem>>,
  payload: TrainingCompliancePayload,
  actor: TrainingComplianceActor,
  now = new Date(),
) {
  const existing = existingItems
    .map((entry) => normalizeTrainingComplianceItem(entry))
    .filter((entry): entry is TrainingComplianceItem => Boolean(entry));

  const payloadId = normalizeText(payload.id);
  const current = payloadId ? existing.find((item) => item.id === payloadId) ?? null : null;

  if (payloadId && !current) {
    throw new ApiError(404, "Training item was not found");
  }

  const moduleName = normalizeText(payload.moduleName, current?.moduleName ?? "");
  const moduleKey = normalizeKey(payload.moduleKey, current?.moduleKey ?? normalizeKey(moduleName));
  if (!moduleName || !moduleKey) {
    throw new ApiError(400, "moduleKey and moduleName are required");
  }

  const status = normalizeStatus(payload.status ?? current?.status);
  const mandatory = typeof payload.mandatory === "boolean" ? payload.mandatory : current?.mandatory ?? true;
  const dueAt = toIsoString(payload.dueAt) ?? current?.dueAt ?? (mandatory ? nowPlusDays(90, now).toISOString() : null);
  if (mandatory && !dueAt) {
    throw new ApiError(400, "dueAt is required for mandatory training items");
  }

  const nowIso = now.toISOString();
  const item: TrainingComplianceItem = {
    id: current?.id ?? payloadId ?? crypto.randomUUID(),
    moduleKey,
    moduleName,
    targetRole: normalizeText(payload.targetRole, current?.targetRole ?? "all_staff"),
    ownerName: normalizeText(payload.ownerName, current?.ownerName ?? "Compliance"),
    criticality: normalizeCriticality(payload.criticality ?? current?.criticality),
    status,
    mandatory,
    dueAt,
    completedAt: status === "COMPLETED" ? (toIsoString(payload.completedAt) ?? nowIso) : null,
    evidenceLink: normalizeText(payload.evidenceLink, current?.evidenceLink ?? "") || null,
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
    summary: summarizeTrainingCompliance(items, now),
  };
}

export async function listTrainingComplianceDashboard(auth: AuthContext) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }

  const tenant = await prisma().tenant.findUnique({
    where: { id: auth.tenant_id },
    select: { metadata: true },
  });

  const items = extractTrainingComplianceRegister(tenant?.metadata);
  const summary = summarizeTrainingCompliance(items);

  return {
    items,
    summary,
    metrics: {
      total: summary.total,
      completedCount: summary.completedCount,
      overdueCount: summary.overdueCount,
      criticalGapCount: summary.criticalGapCount,
      notStartedCount: summary.notStartedCount,
    },
  };
}

export async function saveTrainingComplianceEntry(
  auth: AuthContext,
  payload: TrainingCompliancePayload,
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

  const result = upsertTrainingComplianceRegister(
    extractTrainingComplianceRegister(tenant.metadata),
    payload,
    { actorId: auth.sub, actorRole: auth.role ?? null },
  );

  const currentMetadata = asRecord(tenant.metadata);
  const nextMetadata = {
    ...(currentMetadata ?? {}),
    trainingComplianceRegister: result.items,
  } as Prisma.InputJsonValue;

  await prisma().tenant.update({
    where: { id: auth.tenant_id },
    data: { metadata: nextMetadata },
  });

  await writeAuditLog({
    tenantId: auth.tenant_id,
    userId: auth.sub,
    entityType: "training_compliance",
    entityId: result.item.id,
    action: result.created ? "training_compliance_created" : "training_compliance_updated",
    details: result.item.moduleName,
    metadataJson: {
      ...result.item,
      actorRole: auth.role ?? null,
    },
    request,
  }).catch(() => undefined);

  return result;
}
