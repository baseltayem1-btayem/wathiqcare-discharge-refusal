import {
  BillingInterval,
  PlanCode,
  SubscriptionEventType,
  SubscriptionStatus,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireTenantAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

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
    requireTenantAccess(request, tenantId);

    const prisma = getPrisma();
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      throw new ApiError(404, "Subscription not found");
    }

    return NextResponse.json(toJsonSafe(subscription));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    const auth = requireTenantAccess(request, tenantId);
    requireRole(auth, ["OWNER", "ADMIN", "BILLING"]);

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

    const planCode = parsePlanCode(payload.planCode);
    const billingInterval = parseBillingInterval(payload.billingInterval);
    const status = parseSubscriptionStatus(payload.status);

    const prisma = getPrisma();
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

    const activeSeats = await prisma.tenantMembership.count({
      where: {
        tenantId,
        status: "ACTIVE",
      },
    });

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

    const baseData = {
      ...(selectedPlan ? { planId: selectedPlan.id, seatLimit: selectedPlan.seatLimit } : {}),
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
          version: { increment: 1 },
        },
        include: { plan: true },
      });
    } else {
      const fallbackPlan =
        selectedPlan ??
        (await prisma.plan.findUnique({ where: { code: PlanCode.STARTER } }));

      if (!fallbackPlan) {
        throw new ApiError(404, "No plan available to create subscription");
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
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          metadata: {
            source: "route-handler",
          },
        },
        include: { plan: true },
      });
    }

    await prisma.subscriptionEvent.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        eventType: SubscriptionEventType.UPDATED,
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

    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      entityType: "subscription",
      entityId: subscription.id,
      action: existing ? "subscription_updated" : "subscription_created",
      details: "Subscription updated from tenant API",
      metadataJson: {
        planCode: selectedPlan?.code,
        billingInterval,
        status,
        seatLimit:
          typeof payload.seatLimit === "number" && payload.seatLimit > 0
            ? Math.floor(payload.seatLimit)
            : undefined,
        activeSeats,
      },
      request,
    });

    return NextResponse.json(toJsonSafe(subscription));
  } catch (error) {
    return handleApiError(error);
  }
}
