import { BillingInterval, MembershipRole, MembershipStatus, PlanCode, SubscriptionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

function slugifyTenantCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

async function generateTenantCode(name: string): Promise<string> {
  const base = slugifyTenantCode(name) || "TENANT";
  let candidate = base;
  let suffix = 1;

  const prisma = getPrisma();
<<<<<<< HEAD
  while (await getPrisma().tenant.findUnique({ where: { code: candidate } })) {
=======
  while (await prisma.tenant.findUnique({ where: { code: candidate } })) {
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    suffix += 1;
    candidate = `${base}-${suffix}`.slice(0, 40);
  }

  return candidate;
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    requireRole(auth, ["OWNER", "ADMIN"]);

    const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit") ?? "50"), 1), 200);

    const prisma = getPrisma();
<<<<<<< HEAD
    const memberships = await getPrisma().tenantMembership.findMany({
=======
    const memberships = await prisma.tenantMembership.findMany({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
      where: {
        userId: auth.sub,
        status: MembershipStatus.ACTIVE,
      },
      select: { tenantId: true },
      take: limit,
    });

    const tenantIds = [...new Set([auth.tenant_id, ...memberships.map((item) => item.tenantId)])];

<<<<<<< HEAD
    const tenants = await getPrisma().tenant.findMany({
=======
    const tenants = await prisma.tenant.findMany({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
      where: {
        id: {
          in: tenantIds,
        },
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
    const auth = requireAuth(request);
    requireRole(auth, ["OWNER", "ADMIN"]);

    const payload = (await request.json().catch(() => null)) as
      | {
        name?: string;
        code?: string;
        country?: string | null;
        timezone?: string | null;
        billingEmail?: string | null;
      }
      | null;

    if (!payload) {
      throw new ApiError(400, "Invalid JSON body");
    }

    const tenantName = payload.name?.trim();
    if (!tenantName) {
      throw new ApiError(400, "Tenant name is required");
    }

    const code = payload.code?.trim()
      ? slugifyTenantCode(payload.code)
      : await generateTenantCode(tenantName);

    if (!code) {
      throw new ApiError(400, "Tenant code is invalid");
    }

    const plan =
<<<<<<< HEAD
      (await getPrisma().plan.findUnique({ where: { code: PlanCode.STARTER } })) ||
      (await getPrisma().plan.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } }));
=======
      (await prisma.plan.findUnique({ where: { code: PlanCode.STARTER } })) ||
      (await prisma.plan.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } }));
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

    if (!plan) {
      throw new ApiError(404, "No active plan available");
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

<<<<<<< HEAD
    const created = await getPrisma().$transaction(async (tx) => {
=======
    const created = await prisma.$transaction(async (tx) => {
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          code,
          country: payload.country ?? null,
          timezone: payload.timezone ?? "UTC",
          billingEmail: payload.billingEmail ?? null,
          isActive: true,
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
          currentPeriodEnd: periodEnd,
          trialEndsAt: periodEnd,
          metadata: {
            source: "tenant_create_api",
          },
        },
      });

      await tx.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: auth.sub,
          role: MembershipRole.OWNER,
          status: MembershipStatus.ACTIVE,
        },
      });

      return tenant;
    });

    await writeAuditLog({
      tenantId: created.id,
      userId: auth.sub,
      entityType: "tenant",
      entityId: created.id,
      action: "tenant_created",
      details: "Tenant created from admin panel",
      metadataJson: {
        code: created.code,
      },
      request,
    });

    return NextResponse.json(toJsonSafe(created), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
