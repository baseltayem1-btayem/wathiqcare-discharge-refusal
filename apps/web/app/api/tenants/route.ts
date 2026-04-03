import {
  BillingInterval,
  MembershipStatus,
  PlanCode,
  SubscriptionStatus,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { hasPlatformAccess, requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import {
  ensureTenantDepartments,
  ensureTenantRoleTemplates,
} from "@/lib/server/tenant-admin";
import {
  canonicalizeUserRole,
  membershipRoleForUserRole,
  userTypeForUserRole,
} from "@/lib/server/roles";

type CreateTenantPayload = {
  name?: string;
  billingEmail?: string;
  code?: string;
  isActive?: boolean;
  initialOwner?: {
    email?: string;
    role?: string;
    fullName?: string;
  };
};

function slugifyTenantCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

async function generateTenantCode(
  prisma: ReturnType<typeof getPrisma>,
  name: string,
): Promise<string> {
  const base = slugifyTenantCode(name) || "TENANT";
  let candidate = base;
  let suffix = 1;

  while (await getPrisma().tenant.findUnique({ where: { code: candidate } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`.slice(0, 40);
  }

  return candidate;
}

export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma();

    const auth = await requireAuth(request);
    const platformAccess = hasPlatformAccess(auth);

    const limit = Math.min(
      Math.max(Number(new URL(request.url).searchParams.get("limit") ?? "50"), 1),
      200,
    );

    let tenantIds: string[] = [];

    if (!platformAccess) {
      const memberships = await getPrisma().tenantMembership.findMany({
        where: {
          userId: auth.sub,
          status: MembershipStatus.ACTIVE,
        },
        select: { tenantId: true },
        take: limit,
      });

      tenantIds = [
        ...new Set([
          ...(auth.tenant_id ? [auth.tenant_id] : []),
          ...memberships.map((item) => item.tenantId),
        ]),
      ];

      if (tenantIds.length === 0) {
        throw new ApiError(403, "No tenant access available");
      }
    }

    const tenants = await getPrisma().tenant.findMany({
      where: platformAccess
        ? undefined
        : {
            id: { in: tenantIds },
          },
      include: {
        _count: {
          select: {
            memberships: true,
            cases: true,
            documents: true,
          },
        },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(toJsonSafe(tenants));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();

    const auth = await requireAuth(request);
    if (!hasPlatformAccess(auth)) {
      throw new ApiError(403, "Platform admin permissions required");
    }

    const payload = (await request.json().catch(() => null)) as CreateTenantPayload | null;
    if (!payload) throw new ApiError(400, "Invalid JSON body");

    const tenantName = payload.name?.trim();
    if (!tenantName) throw new ApiError(400, "Tenant name is required");

    const normalizedBillingEmail =
      payload.billingEmail?.trim().toLowerCase() ?? null;

    if (
      normalizedBillingEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedBillingEmail)
    ) {
      throw new ApiError(400, "billingEmail is invalid");
    }

    const code = payload.code?.trim()
      ? slugifyTenantCode(payload.code)
      : await generateTenantCode(prisma, tenantName);

    const plan =
      (await getPrisma().plan.findUnique({
        where: { code: PlanCode.STARTER },
      })) ||
      (await getPrisma().plan.findFirst({ where: { isActive: true } }));

    if (!plan) throw new ApiError(404, "No active plan available");

    const now = new Date();

    const created = await getPrisma().$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          code,
          billingEmail: normalizedBillingEmail,
          isActive: payload.isActive ?? true,
        },
      });

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: SubscriptionStatus.TRIALING,
          billingInterval: BillingInterval.MONTHLY,
          seatLimit: plan.seatLimit,
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await ensureTenantDepartments(tx, tenant.id);
      await ensureTenantRoleTemplates(tx, tenant.id);

      const ownerEmail = payload.initialOwner?.email?.toLowerCase();
      if (!ownerEmail) throw new ApiError(400, "initialOwner.email is required");

      const ownerRole = canonicalizeUserRole(
        payload.initialOwner?.role ?? "tenant_admin",
      );

      const owner = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: ownerEmail,
          fullName: payload.initialOwner?.fullName ?? "Tenant Owner",
          role: ownerRole,
          userType: userTypeForUserRole(ownerRole, ownerEmail),
          isActive: true,
        },
      });

      await tx.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: owner.id,
          role: membershipRoleForUserRole(ownerRole),
          status: MembershipStatus.ACTIVE,
        },
      });

      return tenant;
    });

    return NextResponse.json(toJsonSafe(created), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
