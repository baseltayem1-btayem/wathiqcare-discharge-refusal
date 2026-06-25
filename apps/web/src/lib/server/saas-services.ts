import { Prisma } from "@prisma/client";
import { $Enums, type BillingInterval, type PlanCode, type SubscriptionStatus, type UsageMetric } from "@prisma/client";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";

const prisma = () => getPrisma();

type SubscriptionWithPlan = Prisma.SubscriptionGetPayload<{
  include: { plan: true };
}>;

export type TenantSubscriptionSummary = {
  subscriptionId: string;
  subscriptionStatus: SubscriptionStatus;
  planName: string;
  planCode: PlanCode;
  startDate: Date;
  endDate: Date;
  gracePeriodDays: number;
  seatLimit: number;
  activeUserCount: number;
  pendingUsersCount: number;
  availableSeats: number;
};

const SUBSCRIPTION_ALLOWED_STATUSES: SubscriptionStatus[] = [
  $Enums.SubscriptionStatus.TRIALING,
  $Enums.SubscriptionStatus.ACTIVE,
  $Enums.SubscriptionStatus.PAST_DUE,
];

function startOfUtcMonth(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfUtcDay(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function parsePlanLimit(features: unknown, key: string): bigint | null {
  if (!features || typeof features !== "object") return null;

  const raw = (features as Record<string, unknown>)[key];

  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
    return null;
  }

  return BigInt(Math.floor(raw));
}

function usageMetricToPlanKey(metric: UsageMetric): string | null {
  switch (metric) {
    case $Enums.UsageMetric.CASES:
      return "maxCasesPerMonth";
    case $Enums.UsageMetric.DOCUMENTS:
      return "maxDocumentsPerMonth";
    case $Enums.UsageMetric.API_REQUESTS:
      return "maxApiRequestsPerMonth";
    default:
      return null;
  }
}

async function createDefaultTrialSubscription(
  tenantId: string,
): Promise<SubscriptionWithPlan> {
  const starterPlan = await prisma().plan.findFirst({
    where: {
      isActive: true,
      code: $Enums.PlanCode.STARTER,
    },
  });

  const fallbackPlan =
    starterPlan ??
    (await prisma().plan.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    }));

  if (!fallbackPlan) {
    throw new ApiError(503, "No active billing plans configured");
  }

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return prisma().subscription.create({
    data: {
      tenantId,
      planId: fallbackPlan.id,
      status: $Enums.SubscriptionStatus.TRIALING,
      billingInterval: $Enums.BillingInterval.MONTHLY,
      seatLimit: fallbackPlan.seatLimit,
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd,
    },
    include: { plan: true },
  });
}

export async function getTenantSubscription(
  tenantId: string,
): Promise<SubscriptionWithPlan> {
  const existing = await prisma().subscription.findFirst({
    where: { tenantId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  const subscription =
    existing ?? (await createDefaultTrialSubscription(tenantId));

  if (!SUBSCRIPTION_ALLOWED_STATUSES.includes(subscription.status)) {
    throw new ApiError(
      402,
      `Subscription status ${subscription.status} does not allow this action`,
    );
  }

  return subscription;
}

export async function enforceSeatLimit(
  tenantId: string,
  seatsToAdd: number,
): Promise<{ activeSeats: number; seatLimit: number }> {
  const subscription = await getTenantSubscription(tenantId);
  const activeSeats = await countActiveSeatUsers(tenantId);

  if (activeSeats + seatsToAdd > subscription.seatLimit) {
    throw new ApiError(
      403,
      `No available seats (${activeSeats}/${subscription.seatLimit}).`,
    );
  }

  return { activeSeats, seatLimit: subscription.seatLimit };
}

export async function enforcePlanUsage(
  tenantId: string,
  metric: UsageMetric,
  incrementBy: bigint,
): Promise<void> {
  const planKey = usageMetricToPlanKey(metric);
  if (!planKey) return;

  const subscription = await getTenantSubscription(tenantId);
  const limit = parsePlanLimit(subscription.plan.features, planKey);

  if (!limit) return;

  const currentMonthStart = startOfUtcMonth();

  const aggregate = await prisma().usageRecord.aggregate({
    where: {
      tenantId,
      metric: metric as $Enums.UsageMetric,
      periodDate: { gte: currentMonthStart },
    },
    _sum: { value: true },
  });

  const used = aggregate._sum?.value ?? BigInt(0);

  if (used + incrementBy > limit) {
    throw new ApiError(
      403,
      `Plan limit reached for ${metric} (${used}/${limit})`,
    );
  }
}

export async function recordUsage(
  tenantId: string,
  metric: UsageMetric,
  incrementBy: bigint,
  metadata?: JsonInputValue,
): Promise<void> {
  const periodDate = startOfUtcDay();

  await prisma().usageRecord.upsert({
    where: {
      tenantId_metric_periodDate: {
        tenantId,
        metric: metric as $Enums.UsageMetric,
        periodDate,
      },
    },
    update: {
      value: { increment: incrementBy },
      metadata: metadata ?? undefined,
    },
    create: {
      tenantId,
      metric: metric as $Enums.UsageMetric,
      value: incrementBy,
      unit: "count",
      periodDate,
      metadata: metadata ?? undefined,
    },
  });
}

export async function syncActiveUserUsage(
  tenantId: string,
): Promise<void> {
  const activeUsers = await countActiveSeatUsers(tenantId);
  const periodDate = startOfUtcDay();

  await prisma().usageRecord.upsert({
    where: {
      tenantId_metric_periodDate: {
        tenantId,
        metric: $Enums.UsageMetric.ACTIVE_USERS,
        periodDate,
      },
    },
    update: {
      value: BigInt(activeUsers),
    },
    create: {
      tenantId,
      metric: $Enums.UsageMetric.ACTIVE_USERS,
      value: BigInt(activeUsers),
      unit: "count",
      periodDate,
    },
  });
}

export async function countActiveSeatUsers(
  tenantId: string,
): Promise<number> {
  return prisma().tenantMembership.count({
    where: {
      tenantId,
      status: "ACTIVE",
      user: { isActive: true },
    },
  });
}

export async function countPendingSeatUsers(
  tenantId: string,
): Promise<number> {
  return prisma().tenantMembership.count({
    where: {
      tenantId,
      OR: [
        { status: "INVITED" },
        {
          status: "ACTIVE",
          user: { isActive: false },
        },
      ],
    },
  });
}

export async function getTenantSubscriptionSummary(
  tenantId: string,
): Promise<TenantSubscriptionSummary> {
  const subscription = await getTenantSubscription(tenantId);
  const active = await countActiveSeatUsers(tenantId);
  const pending = await countPendingSeatUsers(tenantId);

  const grace =
    Number(
      (subscription.metadata as Record<string, unknown> | null)
        ?.gracePeriodDays ?? 7,
    ) || 7;

  return {
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    planName: subscription.plan.name,
    planCode: subscription.plan.code,
    startDate: subscription.currentPeriodStart,
    endDate: subscription.currentPeriodEnd,
    gracePeriodDays: Math.max(0, Math.floor(grace)),
    seatLimit: subscription.seatLimit,
    activeUserCount: active,
    pendingUsersCount: pending,
    availableSeats: Math.max(0, subscription.seatLimit - active),
  };
}

type AuditArgs = {
  tenantId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  details?: string;
  caseId?: string | null;
  documentId?: string | null;
  moduleKey?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  metadataJson?: JsonInputValue;
  request?: NextRequest;
};

export async function writeAuditLog(args: AuditArgs): Promise<void> {
  const ip =
    args.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  const userAgent = args.request?.headers.get("user-agent") ?? null;

  await prisma().auditLog.create({
    data: {
      tenantId: args.tenantId,
      userId: args.userId,
      entityType: args.entityType,
      entityId: args.entityId,
      action: args.action,
      details: args.details,
      caseId: args.caseId,
      documentId: args.documentId,
      ipAddress: ip,
      userAgent,
      metadataJson: args.metadataJson,
    },
  });

  try {
    await appendAuditChainEvent({
      tenantId: args.tenantId,
      caseId: args.caseId ?? null,
      eventType: String(args.action).toUpperCase(),
      actorId: args.userId,
      payloadSummary: args.details || `${args.entityType}:${args.action}`,
      metadataJson: {
        entityType: args.entityType,
        entityId: args.entityId,
        moduleKey: args.moduleKey ?? null,
        requestId: args.requestId ?? null,
        correlationId: args.correlationId ?? null,
        documentId: args.documentId ?? null,
        metadata: args.metadataJson ?? null,
      },
      request: args.request,
    });
  } catch (auditChainError) {
    console.error("audit chain append failed (non-fatal)", auditChainError);
  }
}
