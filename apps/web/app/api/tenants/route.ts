import {
  BillingInterval,
  MembershipStatus,
  PlanCode,
  SubscriptionStatus,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { hasPlatformAccess, requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError, jsonSuccess } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { ensureBasePlans } from "@/lib/server/admin-bootstrap";
import {
  DEFAULT_TENANT_AUTH_CONFIG,
  normalizeTenantAuthConfig,
} from "@/lib/server/tenant-auth-config";
import { bootstrapTenantAdminConfiguration } from "@/lib/server/tenant-admin";
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
  country?: string | null;
  timezone?: string | null;
  authConfig?: {
    password_enabled?: boolean;
    microsoft_sso_enabled?: boolean;
    secure_link_enabled?: boolean;
  };
  subscription?: {
    planCode?: string;
    billingInterval?: string;
    status?: string;
    seatLimit?: number;
    trialDays?: number;
  };
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

async function generateTenantCode(prisma: ReturnType<typeof getPrisma>, name: string): Promise<string> {
  const base = slugifyTenantCode(name) || "TENANT";
  let candidate = base;
  let suffix = 1;
  while (await prisma.tenant.findUnique({ where: { code: candidate } })) {
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
      const memberships = await prisma.tenantMembership.findMany({
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
    const tenants = await prisma.tenant.findMany({
      where: platformAccess ? undefined : { id: { in: tenantIds } },
      // Select stable columns explicitly to tolerate DBs that have not yet
      // applied newer optional tenant columns.
      select: {
        id: true,
        name: true,
        code: true,
        domain: true,
        authConfig: true,
        isActive: true,
        timezone: true,
        country: true,
        billingEmail: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
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
    return jsonSuccess(toJsonSafe(tenants));
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
    const normalizedBillingEmail = payload.billingEmail?.trim().toLowerCase() ?? null;
    if (
      normalizedBillingEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedBillingEmail)
    ) {
      throw new ApiError(400, "billingEmail is invalid");
    }
    const code = payload.code?.trim()
      ? slugifyTenantCode(payload.code)
      : await generateTenantCode(prisma, tenantName);
    if (!code) {
      throw new ApiError(400, "Tenant code is invalid");
    }

    await ensureBasePlans();

    const requestedPlanCodeRaw = payload.subscription?.planCode?.toUpperCase();
    const requestedPlanCode =
      requestedPlanCodeRaw && Object.values(PlanCode).includes(requestedPlanCodeRaw as PlanCode)
        ? (requestedPlanCodeRaw as PlanCode)
        : null;

    const plan =
      (requestedPlanCode
        ? await prisma.plan.findUnique({ where: { code: requestedPlanCode } })
        : await prisma.plan.findUnique({ where: { code: PlanCode.STARTER } })) ||
      (await prisma.plan.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } }));
    if (!plan) throw new ApiError(404, "No active plan available");
    const now = new Date();
    const requestedTrialDays = Number(payload.subscription?.trialDays ?? 14);
    const trialDays = Number.isFinite(requestedTrialDays) && requestedTrialDays >= 0 && requestedTrialDays <= 60
      ? Math.floor(requestedTrialDays)
      : 14;
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    const billingIntervalRaw = payload.subscription?.billingInterval?.toUpperCase();
    const billingInterval =
      billingIntervalRaw && Object.values(BillingInterval).includes(billingIntervalRaw as BillingInterval)
        ? (billingIntervalRaw as BillingInterval)
        : BillingInterval.MONTHLY;
    const statusRaw = payload.subscription?.status?.toUpperCase();
    const subscriptionStatus =
      statusRaw && Object.values(SubscriptionStatus).includes(statusRaw as SubscriptionStatus)
        ? (statusRaw as SubscriptionStatus)
        : SubscriptionStatus.TRIALING;
    const ownerEmail = payload.initialOwner?.email?.trim().toLowerCase();
    const ownerFullName = payload.initialOwner?.fullName?.trim() || "Tenant Owner";
    const ownerRole = canonicalizeUserRole(payload.initialOwner?.role ?? "tenant_admin");
    if (!ownerEmail) {
      throw new ApiError(400, "initialOwner.email is required");
    }
    if (ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      throw new ApiError(400, "initialOwner.email is invalid");
    }
    const created = await prisma.$transaction(async (tx) => {
      const authConfig = payload.authConfig
        ? normalizeTenantAuthConfig(payload.authConfig)
        : DEFAULT_TENANT_AUTH_CONFIG;

      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          code,
          country: payload.country ?? null,
          timezone: payload.timezone ?? "UTC",
          billingEmail: normalizedBillingEmail,
          authConfig,
          isActive: payload.isActive ?? true,
        },
      });
      const activeMembershipCount = 1;
      const requestedSeatLimit = Number(payload.subscription?.seatLimit ?? plan.seatLimit);
      const seatLimit = Number.isFinite(requestedSeatLimit) && requestedSeatLimit > 0
        ? Math.max(Math.floor(requestedSeatLimit), activeMembershipCount)
        : Math.max(plan.seatLimit, activeMembershipCount);
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: subscriptionStatus,
          billingInterval,
          seatLimit,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: subscriptionStatus === SubscriptionStatus.ACTIVE ? null : trialEndsAt,
          metadata: {
            source: "tenant_create_api",
          },
        },
      });
      const ownerUser = await tx.user.upsert({
        where: { email: ownerEmail },
        update: {
          fullName: ownerFullName,
          isActive: true,
          role: ownerRole,
          userType: userTypeForUserRole(ownerRole, ownerEmail),
        },
        create: {
          tenantId: tenant.id,
          email: ownerEmail,
          fullName: ownerFullName,
          role: ownerRole,
          userType: userTypeForUserRole(ownerRole, ownerEmail),
          isActive: true,
          hashedPassword: null,
        },
      });
      await tx.tenantMembership.upsert({
        where: {
          tenantId_userId: {
            tenantId: tenant.id,
            userId: ownerUser.id,
          },
        },
        update: {
          role: membershipRoleForUserRole(ownerRole),
          status: MembershipStatus.ACTIVE,
        },
        create: {
          tenantId: tenant.id,
          userId: ownerUser.id,
          role: membershipRoleForUserRole(ownerRole),
          status: MembershipStatus.ACTIVE,
        },
      });
      return { tenant, ownerUserId: ownerUser.id };
    }, {
      maxWait: 10_000,
      timeout: 30_000,
    });
    try {
      await bootstrapTenantAdminConfiguration(created.tenant.id);
    } catch (bootstrapError) {
      console.error("tenant-create: tenant RBAC bootstrap failed (non-fatal)", {
        tenantId: created.tenant.id,
        error: bootstrapError instanceof Error ? bootstrapError.message : String(bootstrapError),
      });
    }
    try {
      await writeAuditLog({
        tenantId: created.tenant.id,
        userId: auth.sub,
        entityType: "tenant",
        entityId: created.tenant.id,
        action: "tenant_created",
        details: "Tenant created from admin panel",
        metadataJson: {
          code: created.tenant.code,
          ownerEmail,
          planCode: plan.code,
          status: subscriptionStatus,
        },
        request,
      });
      if (created.ownerUserId) {
        await writeAuditLog({
          tenantId: created.tenant.id,
          userId: auth.sub,
          entityType: "user",
          entityId: created.ownerUserId,
          action: "tenant_admin_created",
          details: "Initial tenant admin account created",
          metadataJson: {
            ownerEmail,
            ownerRole,
          },
          request,
        });
      }
    } catch (auditError) {
      console.error("tenant-create: audit logging failed (non-fatal)", {
        tenantId: created.tenant.id,
        error: auditError instanceof Error ? auditError.message : String(auditError),
      });
    }
    return jsonSuccess(toJsonSafe(created.tenant), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
