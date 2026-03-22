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
    const steps: string[] = [];
    try {
        const body = (await request.json().catch(() => null)) as ProvisionPayload | null;
        if (!body || typeof body !== "object") {
            throw new ApiError(400, "Invalid JSON body");
        }

        // ---- Secret validation ----
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

        // ---- Step 1: Ensure PROFESSIONAL plan exists ----
        steps.push("plan_upsert");
        const plan = await prisma.plan.upsert({
            where: { code: PlanCode.PROFESSIONAL },
            update: { isActive: true },
            create: {
                code: PlanCode.PROFESSIONAL,
                name: "Professional",
                description: "Professional tier",
                seatLimit: 900,
                priceMonthlyCents: 29900,
                priceYearlyCents: 299000,
                isActive: true,
                features: { maxCasesPerMonth: 30000, maxDocumentsPerMonth: 120000, support: "priority" },
            },
        });
        steps.push("plan_ok");

        // ---- Step 2: Create or update tenant ----
        steps.push("tenant_upsert");
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
        steps.push("tenant_ok:" + tenant.id);

        // ---- Step 3: Create or update allowed domain ----
        steps.push("domain_upsert");
        await prisma.$executeRaw`
            INSERT INTO tenant_allowed_domains (id, tenant_id, domain, is_active, created_at, updated_at)
            VALUES (${randomUUID()}, ${tenant.id}, ${domain}, TRUE, NOW(), NOW())
            ON CONFLICT (tenant_id, domain) DO UPDATE SET is_active = TRUE, updated_at = NOW()
        `;
        steps.push("domain_ok");

        // ---- Step 4: Subscription (ACTIVE, PROFESSIONAL plan) ----
        steps.push("subscription_upsert");
        const periodStart = new Date();
        const periodEnd = new Date(periodStart.getTime() + 365 * 24 * 60 * 60 * 1000);

        const existingSub = await prisma.subscription.findFirst({
            where: { tenantId: tenant.id },
            orderBy: { createdAt: "desc" },
        });

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
        steps.push("subscription_ok:" + subscription.id);

        // ---- Step 5: Create or update user ----
        steps.push("user_upsert");
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
        steps.push("user_ok:" + user.id);

        // ---- Step 6: Tenant membership ----
        steps.push("membership_upsert");
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
        steps.push("membership_ok");

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
            steps,
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
        console.error("PROVISION_TENANT_FAILED", { steps, error });
        if (error instanceof ApiError) return handleApiError(error);
        // Surface more info in the error response to aid debugging
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ ok: false, steps, error: msg }, { status: 500 });
    }
}
