import {
  BillingInterval,
  PlanCode,
  SubscriptionEventType,
  SubscriptionStatus,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
<<<<<<< HEAD
import {
  hasPlatformAccess,
  requireAuth,
  requireTenantAccess,
} from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import {
  countActiveSeatUsers,
  countPendingSeatUsers,
  getTenantSubscriptionSummary,
  writeAuditLog,
} from "@/lib/server/saas-services";

type RouteContext = {
  params: Promise<{ tenantId: string }>;
};

type PatchSubscriptionPayload = {
  planCode?: string;
  billingInterval?: string;
  status?: string;
  seatLimit?: number;
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

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const prisma = getPrisma();

    const { tenantId } = await params;
    const auth = await requireAuth(request);

=======
import { hasPlatformAccess, requireAuth, requireTenantAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { countActiveSeatUsers, countPendingSeatUsers, getTenantSubscriptionSummary, writeAuditLog } from "@/lib/server/saas-services";

function parsePlanCode(value: unknown): PlanCode | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  return Object.values(PlanCode).includes(normalized as PlanCode)
    ? (normalized as PlanCode)
    : null;
}

function parseBillingInterval(value: unknown): BillingInterval | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  return Object.values(BillingInterval).includes(normalized as BillingInterval)
    ? (normalized as BillingInterval)
    : null;
}

function parseSubscriptionStatus(value: unknown): SubscriptionStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  return Object.values(SubscriptionStatus).includes(normalized as SubscriptionStatus)
    ? (normalized as SubscriptionStatus)
    : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    const auth = await requireAuth(request);
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
  } catch (error) {
    return handleApiError(error);
  }
}

<<<<<<< HEAD
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const prisma = getPrisma();

    const { tenantId } = await params;
    const auth = await requireAuth(request);

=======
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    const auth = await requireAuth(request);
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    if (!hasPlatformAccess(auth)) {
      throw new ApiError(403, "Only platform admins can update subscriptions");
    }

<<<<<<< HEAD
    const payload = (await request.json().catch(() => null)) as PatchSubscriptionPayload | null;
=======
    const payload = (await request.json().catch(() => null)) as
      | {
        planCode?: string;
        billingInterval?: string;
        status?: string;
        seatLimit?: number;
      }
      | null;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

    if (!payload) {
      throw new ApiError(400, "Invalid JSON body");
    }

<<<<<<< HEAD
    const planCode = parseEnum(payload.planCode, PlanCode);
    const billingInterval = parseEnum(payload.billingInterval, BillingInterval);
    const status = parseEnum(payload.status, SubscriptionStatus);

    let selectedPlan = null;

=======
    const planCode = parsePlanCode(payload.planCode);
    const billingInterval = parseBillingInterval(payload.billingInterval);
    const status = parseSubscriptionStatus(payload.status);

    let selectedPlan = null;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
<<<<<<< HEAD
    const shouldEndSubscription =
      status === SubscriptionStatus.CANCELED ||
      status === SubscriptionStatus.EXPIRED;

    const baseData = {
      ...(selectedPlan
        ? { planId: selectedPlan.id, seatLimit: selectedPlan.seatLimit }
        : {}),
=======
    const shouldEndSubscription = status === SubscriptionStatus.CANCELED || status === SubscriptionStatus.EXPIRED;

    const baseData = {
      ...(selectedPlan ? { planId: selectedPlan.id, seatLimit: selectedPlan.seatLimit } : {}),
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
      ...(billingInterval ? { billingInterval } : {}),
      ...(status ? { status } : {}),
      ...(typeof payload.seatLimit === "number" && payload.seatLimit > 0
        ? { seatLimit: Math.floor(payload.seatLimit) }
        : {}),
    };

    let subscription;
<<<<<<< HEAD

=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    if (existing) {
      if (Object.keys(baseData).length === 0) {
        throw new ApiError(400, "No updatable fields supplied");
      }

      subscription = await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          ...baseData,
<<<<<<< HEAD
          ...(status === SubscriptionStatus.ACTIVE
            ? { trialEndsAt: null }
            : {}),
=======
          ...(status === SubscriptionStatus.ACTIVE ? { trialEndsAt: null } : {}),
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
          ...(shouldEndSubscription ? { canceledAt: now } : {}),
          version: { increment: 1 },
        },
        include: { plan: true },
      });
    } else {
      const fallbackPlan =
        selectedPlan ??
<<<<<<< HEAD
        (await prisma.plan.findUnique({
          where: { code: PlanCode.STARTER },
        }));

      if (!fallbackPlan) {
        throw new ApiError(404, "No plan available");
=======
        (await prisma.plan.findUnique({ where: { code: PlanCode.STARTER } }));

      if (!fallbackPlan) {
        throw new ApiError(404, "No plan available to create subscription");
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
<<<<<<< HEAD
          metadata: { source: "route-handler" },
=======
          metadata: {
            source: "route-handler",
          },
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        },
        include: { plan: true },
      });
    }

    await prisma.subscriptionEvent.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
<<<<<<< HEAD
        eventType: existing
          ? SubscriptionEventType.UPDATED
          : SubscriptionEventType.CREATED,
=======
        eventType: existing ? SubscriptionEventType.UPDATED : SubscriptionEventType.CREATED,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        status: "success",
        actorUserId: auth.sub,
        metadata: {
          planCode: selectedPlan?.code,
          billingInterval,
          status,
          seatLimit: payload.seatLimit,
<<<<<<< HEAD
=======
          source: "api/tenants/[tenantId]/subscription",
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        },
      },
    });

    if (shouldActivateTenant) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive: true },
      });
    }

    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      entityType: "subscription",
      entityId: subscription.id,
      action: existing ? "subscription_updated" : "subscription_created",
<<<<<<< HEAD
      request,
    });

=======
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

>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    return NextResponse.json(toJsonSafe(subscription));
  } catch (error) {
    return handleApiError(error);
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
