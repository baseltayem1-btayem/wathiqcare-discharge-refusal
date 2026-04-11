import {
  BillingInterval,
  Prisma,
  PlanCode,
  SubscriptionEventType,
  SubscriptionStatus,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import {
  hasPlatformAccess,
  requireAuth,
  requireTenantAccess,
} from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import {
  countActiveSeatUsers,
  countPendingSeatUsers,
  getTenantSubscriptionSummary,
  writeAuditLog,
} from "@/lib/server/saas-services";
import { ensureBasePlans } from "@/lib/server/admin-bootstrap";

type RouteContext = {
  params: Promise<{ tenantId: string }>;
};

function parseEnum<T extends Record<string, string>>(
  value: unknown,
  enumType: T,
): T[keyof T] | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  return Object.values(enumType).includes(normalized as T[keyof T])
    ? (normalized as T[keyof T])
    : null;
}

function parsePlanCode(value: unknown): PlanCode | null {
  return parseEnum(value, PlanCode) as PlanCode | null;
}

function parseBillingInterval(value: unknown): BillingInterval | null {
  return parseEnum(value, BillingInterval) as BillingInterval | null;
}

function parseSubscriptionStatus(value: unknown): SubscriptionStatus | null {
  return parseEnum(value, SubscriptionStatus) as SubscriptionStatus | null;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const prisma = getPrisma();
  const { tenantId } = await params;
  const auth = await requireAuth(request);

  if (!hasPlatformAccess(auth)) {
    await requireTenantAccess(request, tenantId);
  }

  const subscription = await prisma.subscription.findFirst({
    where: { tenantId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  const summary = await getTenantSubscriptionSummary(tenantId);

  return NextResponse.json(
    toJsonSafe({
      ...subscription,
      summary,
    }),
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    const auth = await requireAuth(request);
    const prisma = getPrisma();
    if (!hasPlatformAccess(auth)) {
      throw new ApiError(403, "Only platform admins can update subscriptions");
    }

    const payload = (await request.json().catch(() => null)) as
      | {
        planCode?: string;
        billingInterval?: string;
        status?: string;
        seatLimit?: number;
      }
      | null;

    if (!payload) {
      throw new ApiError(400, "Invalid JSON body");
    }

    await ensureBasePlans();

    const planCode = parsePlanCode(payload.planCode);
    const billingInterval = parseBillingInterval(payload.billingInterval);
    const status = parseSubscriptionStatus(payload.status);

    let selectedPlan = null;
    if (planCode) {
      selectedPlan = await prisma.plan.findUnique({ where: { code: planCode } });
      if (!selectedPlan) {
        throw new ApiError(404, "Plan not found");
      }
    }

    const existing = await prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    const activeSeats = await countActiveSeatUsers(tenantId);
    const pendingSeats = await countPendingSeatUsers(tenantId);

    if (
      typeof payload.seatLimit === "number" &&
      payload.seatLimit > 0 &&
      Math.floor(payload.seatLimit) < activeSeats
    ) {
      throw new ApiError(
        400,
        `seatLimit cannot be lower than active seats (${activeSeats})`,
      );
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const shouldActivateTenant = status === SubscriptionStatus.ACTIVE;
    const shouldEndSubscription = status === SubscriptionStatus.CANCELED || status === SubscriptionStatus.EXPIRED;

    const baseData = {
      ...(selectedPlan
        ? { planId: selectedPlan.id, seatLimit: selectedPlan.seatLimit }
        : {}),
      ...(billingInterval ? { billingInterval } : {}),
      ...(status ? { status } : {}),
      ...(typeof payload.seatLimit === "number" && payload.seatLimit > 0
        ? { seatLimit: Math.floor(payload.seatLimit) }
        : {}),
    };

    let subscription;
    if (existing) {
      if (Object.keys(baseData).length === 0) {
        throw new ApiError(400, "No updatable fields supplied");
      }

      subscription = await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          ...baseData,
          ...(status === SubscriptionStatus.ACTIVE
            ? { trialEndsAt: null }
            : {}),
          ...(shouldEndSubscription ? { canceledAt: now } : {}),
          version: { increment: 1 },
        },
        include: { plan: true },
      });
    } else {
      const fallbackPlan =
        selectedPlan ??
        (await prisma.plan.findUnique({
          where: { code: PlanCode.STARTER },
        }));

      if (!fallbackPlan) {
        throw new ApiError(404, "No plan available");
      }

      subscription = await prisma.subscription.create({
        data: {
          tenantId,
          planId: fallbackPlan.id,
          billingInterval: billingInterval ?? BillingInterval.MONTHLY,
          status: status ?? SubscriptionStatus.TRIALING,
          seatLimit:
            typeof payload.seatLimit === "number" && payload.seatLimit > 0
              ? Math.floor(payload.seatLimit)
              : fallbackPlan.seatLimit,
          trialEndsAt: status === SubscriptionStatus.ACTIVE ? null : periodEnd,
          canceledAt: shouldEndSubscription ? now : null,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          metadata: { source: "route-handler" },
        },
        include: { plan: true },
      });
    }

    await prisma.subscriptionEvent.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        eventType: existing
          ? SubscriptionEventType.UPDATED
          : SubscriptionEventType.CREATED,
        status: "success",
        actorUserId: auth.sub,
        metadata: {
          planCode: selectedPlan?.code,
          billingInterval,
          status,
          seatLimit: payload.seatLimit,
          source: "api/tenants/[tenantId]/subscription",
        },
      },
    });

    if (shouldActivateTenant) {
      await prisma.$executeRaw(
        Prisma.sql`UPDATE tenants SET is_active = TRUE WHERE id = ${tenantId}`,
      );
    }

    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      entityType: "subscription",
      entityId: subscription.id,
      action: existing ? "subscription_updated" : "subscription_created",
      details: "Subscription updated from platform API",
      metadataJson: {
        planCode: selectedPlan?.code,
        billingInterval,
        status,
        seatLimit:
          typeof payload.seatLimit === "number" && payload.seatLimit > 0
            ? Math.floor(payload.seatLimit)
            : undefined,
        activeSeats,
        pendingSeats,
      },
      request,
    });

    if (typeof payload.seatLimit === "number" && payload.seatLimit > 0) {
      await writeAuditLog({
        tenantId,
        userId: auth.sub,
        entityType: "subscription",
        entityId: subscription.id,
        action: "seat_limit_changed",
        details: `Seat limit changed to ${Math.floor(payload.seatLimit)}`,
        metadataJson: {
          seatLimit: Math.floor(payload.seatLimit),
          activeSeats,
        },
        request,
      });
    }

    return NextResponse.json(toJsonSafe(subscription));
  } catch (error) {
    return handleApiError(error);
  }
}
