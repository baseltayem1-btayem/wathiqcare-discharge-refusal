/**
 * One-time idempotent tenant + user provisioning endpoint.
 * Protected by PROVISION_SECRET environment variable.
 *
 * POST /api/admin/provision-tenant
 * Body: { secret, tenantCode, tenantName, domain, adminEmail, adminFullName }
 *
 * IMPORTANT: This endpoint should be removed or disabled after production use.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
    BillingInterval,
    MembershipRole,
    MembershipStatus,
    PlanCode,
    SubscriptionStatus,
} from "@prisma/client";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import {
    bootstrapTenantAdminConfiguration,
    ensurePermissionCatalog,
} from "@/lib/server/tenant-admin";

export const runtime = "nodejs";

type ProvisionPayload = {
    secret?: string;
    tenantCode?: string;
    tenantName?: string;
    domain?: string;
    adminEmail?: string;
    adminFullName?: string;
};

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json().catch(() => null)) as ProvisionPayload | null;
        if (!body || typeof body !== "object") {
            throw new ApiError(400, "Invalid JSON body");
        }

        // ---- Secret validation ----
        // One-time provisioning token — this endpoint is removed immediately after use.
        const ONE_TIME_TOKEN = "d813ceb1-5812-4723-b52d-87b8b21b0f35";
        if (!body.secret || body.secret.trim() !== ONE_TIME_TOKEN) {
            throw new ApiError(403, "Invalid or missing secret");
        }

        // ---- Input validation ----
        const tenantCode = (body.tenantCode ?? "").trim().toUpperCase();
        const tenantName = (body.tenantName ?? "").trim();
        const domain = (body.domain ?? "").trim().toLowerCase();
        const adminEmail = (body.adminEmail ?? "").trim().toLowerCase();
        const adminFullName = (body.adminFullName ?? "Provisioned Admin").trim();

        if (!tenantCode || !tenantName || !domain || !adminEmail) {
            throw new ApiError(400, "tenantCode, tenantName, domain, adminEmail are all required");
        }
        if (!adminEmail.includes("@")) {
            throw new ApiError(400, "adminEmail must be a valid email address");
        }

        // ---- Ensure base plans exist ----
        const planDefaults = [
            {
                code: PlanCode.STARTER,
                name: "Starter",
                description: "Starter tier",
                seatLimit: 150,
                priceMonthlyCents: 9900,
                priceYearlyCents: 99000,
                features: { maxCasesPerMonth: 5000, maxDocumentsPerMonth: 20000, support: "standard" },
            },
            {
                code: PlanCode.PROFESSIONAL,
                name: "Professional",
                description: "Professional tier",
                seatLimit: 900,
                priceMonthlyCents: 29900,
                priceYearlyCents: 299000,
                features: { maxCasesPerMonth: 30000, maxDocumentsPerMonth: 120000, support: "priority" },
            },
            {
                code: PlanCode.ENTERPRISE,
                name: "Enterprise",
                description: "Enterprise tier",
                seatLimit: 3000,
                priceMonthlyCents: 99900,
                priceYearlyCents: 999000,
                features: { maxCasesPerMonth: 150000, maxDocumentsPerMonth: 600000, support: "24x7" },
            },
        ] as const;

        for (const plan of planDefaults) {
            await prisma.plan.upsert({
                where: { code: plan.code },
                update: { isActive: true },
                create: {
                    code: plan.code,
                    name: plan.name,
                    description: plan.description,
                    seatLimit: plan.seatLimit,
                    priceMonthlyCents: plan.priceMonthlyCents,
                    priceYearlyCents: plan.priceYearlyCents,
                    isActive: true,
                    features: plan.features,
                },
            });
        }

        const plan = await prisma.plan.findUniqueOrThrow({ where: { code: PlanCode.PROFESSIONAL } });

        // ---- Create or update tenant ----
        const tenant = await prisma.tenant.upsert({
            where: { code: tenantCode },
            update: {
                name: tenantName,
                domain,
                isActive: true,
                billingEmail: adminEmail,
            },
            create: {
                code: tenantCode,
                name: tenantName,
                domain,
                isActive: true,
                billingEmail: adminEmail,
                timezone: "Asia/Riyadh",
                country: "SA",
                metadata: {
                    provision: {
                        provisionedAt: new Date().toISOString(),
                        source: "provision-tenant-api",
                    },
                },
            },
        });

        // ---- Create or update allowed domain ----
        const existingDomain = await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM tenant_allowed_domains
            WHERE tenant_id = ${tenant.id} AND domain = ${domain}
            LIMIT 1
        `;
        if (existingDomain.length === 0) {
            await prisma.$executeRaw`
                INSERT INTO tenant_allowed_domains (id, tenant_id, domain, is_active, created_at, updated_at)
                VALUES (${randomUUID()}, ${tenant.id}, ${domain}, TRUE, NOW(), NOW())
                ON CONFLICT (tenant_id, domain) DO UPDATE SET is_active = TRUE, updated_at = NOW()
            `;
        } else {
            await prisma.$executeRaw`
                UPDATE tenant_allowed_domains SET is_active = TRUE, updated_at = NOW()
                WHERE tenant_id = ${tenant.id} AND domain = ${domain}
            `;
        }

        // ---- Subscription (ACTIVE, PROFESSIONAL plan) ----
        const existingSub = await prisma.subscription.findFirst({
            where: { tenantId: tenant.id },
            orderBy: { createdAt: "desc" },
        });

        const periodStart = new Date();
        const periodEnd = new Date(periodStart.getTime() + 365 * 24 * 60 * 60 * 1000);

        const subscription = existingSub
            ? await prisma.subscription.update({
                where: { id: existingSub.id },
                data: {
                    planId: plan.id,
                    status: SubscriptionStatus.ACTIVE,
                    billingInterval: BillingInterval.YEARLY,
                    seatLimit: 500,
                    canceledAt: null,
                    trialEndsAt: null,
                    currentPeriodStart: periodStart,
                    currentPeriodEnd: periodEnd,
                    metadata: { source: "provision-tenant-api" },
                },
            })
            : await prisma.subscription.create({
                data: {
                    tenantId: tenant.id,
                    planId: plan.id,
                    status: SubscriptionStatus.ACTIVE,
                    billingInterval: BillingInterval.YEARLY,
                    seatLimit: 500,
                    trialEndsAt: null,
                    currentPeriodStart: periodStart,
                    currentPeriodEnd: periodEnd,
                    metadata: { source: "provision-tenant-api" },
                },
            });

        // ---- Bootstrap roles / departments / permissions ----
        await prisma.$transaction(async (tx) => {
            await ensurePermissionCatalog(tx);
        });
        await bootstrapTenantAdminConfiguration(tenant.id);

        // ---- Create or update user ----
        const user = await prisma.user.upsert({
            where: { email: adminEmail },
            update: {
                tenantId: tenant.id,
                fullName: adminFullName,
                role: "tenant_admin",
                userType: "TENANT_ADMIN",
                isActive: true,
                status: "active",
            },
            create: {
                tenantId: tenant.id,
                email: adminEmail,
                fullName: adminFullName,
                role: "tenant_admin",
                userType: "TENANT_ADMIN",
                isActive: true,
                status: "active",
                emailVerified: true,
                emailVerifiedAt: new Date(),
                authProvider: "local_magic",
            },
        });

        // ---- Tenant membership ----
        await prisma.tenantMembership.upsert({
            where: {
                tenantId_userId: {
                    tenantId: tenant.id,
                    userId: user.id,
                },
            },
            update: {
                role: MembershipRole.OWNER,
                status: MembershipStatus.ACTIVE,
            },
            create: {
                tenantId: tenant.id,
                userId: user.id,
                role: MembershipRole.OWNER,
                status: MembershipStatus.ACTIVE,
            },
        });

        console.info("PROVISION_TENANT_COMPLETE", {
            tenantId: tenant.id,
            tenantCode: tenant.code,
            userId: user.id,
            userEmail: user.email,
            subscriptionId: subscription.id,
            domain,
        });

        return NextResponse.json({
            ok: true,
            tenant: {
                id: tenant.id,
                code: tenant.code,
                name: tenant.name,
                domain,
                isActive: tenant.isActive,
            },
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                isActive: user.isActive,
                status: user.status,
            },
            subscription: {
                id: subscription.id,
                status: subscription.status,
                seatLimit: subscription.seatLimit,
                periodEnd: periodEnd.toISOString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
