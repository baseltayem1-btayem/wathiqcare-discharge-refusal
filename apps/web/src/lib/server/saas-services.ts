import { Prisma, SubscriptionStatus, UsageMetric } from "@prisma/client";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";

type SubscriptionWithPlan = Prisma.SubscriptionGetPayload<{
  include: { plan: true };
}>;

const SUBSCRIPTION_ALLOWED_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
];

function startOfUtcMonth(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parsePlanLimit(features: unknown, key: string): bigint | null {
  if (!features || typeof features !== "object") {
    return null;
  }

  const rawValue = (features as Record<string, unknown>)[key];
  if (typeof rawValue !== "number" || !Number.isFinite(rawValue) || rawValue <= 0) {
    return null;
  }

  return BigInt(Math.floor(rawValue));
}

function usageMetricToPlanKey(metric: UsageMetric): string | null {
  switch (metric) {
    case UsageMetric.CASES:
      return "maxCasesPerMonth";
    case UsageMetric.DOCUMENTS:
      return "maxDocumentsPerMonth";
    case UsageMetric.API_REQUESTS:
      return "maxApiRequestsPerMonth";
    default:
      return null;
  }
}

export async function getTenantSubscription(tenantId: string): Promise<SubscriptionWithPlan> {
  const subscription = await prisma.subscription.findFirst({
    where: { tenantId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    throw new ApiError(402, "No active subscription for tenant");
  }

  if (!SUBSCRIPTION_ALLOWED_STATUSES.includes(subscription.status)) {
    throw new ApiError(402, `Subscription status ${subscription.status} does not allow this action`);
  }

  return subscription;
}

export async function enforceSeatLimit(
  tenantId: string,
  seatsToAdd: number,
): Promise<{ activeSeats: number; seatLimit: number }> {
  const subscription = await getTenantSubscription(tenantId);
  const activeSeats = await prisma.tenantMembership.count({
    where: {
      tenantId,
      status: "ACTIVE",
    },
  });

  const seatLimit = subscription.seatLimit;
  if (activeSeats + seatsToAdd > seatLimit) {
    throw new ApiError(
      403,
      `Seat limit exceeded (${activeSeats}/${seatLimit} active). Upgrade plan or increase seat limit.`,
    );
  }

  return { activeSeats, seatLimit };
}

export async function enforcePlanUsage(
  tenantId: string,
  metric: UsageMetric,
  incrementBy: bigint,
): Promise<void> {
  const planKey = usageMetricToPlanKey(metric);
  if (!planKey) {
    return;
  }

  const subscription = await getTenantSubscription(tenantId);
  const planLimit = parsePlanLimit(subscription.plan.features, planKey);
  if (!planLimit) {
    return;
  }

  const currentMonthStart = startOfUtcMonth();

  const aggregate = await prisma.usageRecord.aggregate({
    where: {
      tenantId,
      metric,
      periodDate: {
        gte: currentMonthStart,
      },
    },
    _sum: {
      value: true,
    },
  });

  const used = aggregate._sum.value ?? BigInt(0);
  if (used + incrementBy > planLimit) {
    throw new ApiError(
      403,
      `Plan limit reached for ${metric}. Used ${used.toString()} / ${planLimit.toString()} this month.`,
    );
  }
}

export async function recordUsage(
  tenantId: string,
  metric: UsageMetric,
  incrementBy: bigint,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  const periodDate = startOfUtcDay();

  await prisma.usageRecord.upsert({
    where: {
      tenantId_metric_periodDate: {
        tenantId,
        metric,
        periodDate,
      },
    },
    update: {
      value: { increment: incrementBy },
      metadata: metadata ?? undefined,
    },
    create: {
      tenantId,
      metric,
      value: incrementBy,
      unit: "count",
      periodDate,
      metadata: metadata ?? undefined,
    },
  });
}

export async function syncActiveUserUsage(tenantId: string): Promise<void> {
  const periodDate = startOfUtcDay();
  const activeUsers = await prisma.tenantMembership.count({
    where: {
      tenantId,
      status: "ACTIVE",
    },
  });

  await prisma.usageRecord.upsert({
    where: {
      tenantId_metric_periodDate: {
        tenantId,
        metric: UsageMetric.ACTIVE_USERS,
        periodDate,
      },
    },
    update: {
      value: BigInt(activeUsers),
      unit: "count",
    },
    create: {
      tenantId,
      metric: UsageMetric.ACTIVE_USERS,
      value: BigInt(activeUsers),
      unit: "count",
      periodDate,
    },
  });
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
  metadataJson?: Prisma.InputJsonValue;
  request?: NextRequest;
};

export async function writeAuditLog(args: AuditArgs): Promise<void> {
  const ipAddress = args.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = args.request?.headers.get("user-agent") ?? null;

  await prisma.auditLog.create({
    data: {
      tenantId: args.tenantId,
      userId: args.userId,
      entityType: args.entityType,
      entityId: args.entityId,
      action: args.action,
      details: args.details,
      caseId: args.caseId,
      documentId: args.documentId,
      ipAddress,
      userAgent,
      metadataJson: args.metadataJson,
    },
  });
}
