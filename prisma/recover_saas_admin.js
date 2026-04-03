const {
    PrismaClient,
    PlanCode,
    BillingInterval,
    SubscriptionStatus,
    MembershipRole,
    MembershipStatus,
} = require("@prisma/client");

const prisma = new PrismaClient();

const SUPERUSER_EMAIL = "admin@wathiqcare.online";
const SUPERUSER_NAME = "WathiqCare Platform Superadmin";

function getRequiredEnv(name) {
    const value = (process.env[name] || "").trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function logStep(message) {
    console.log(`[recover] ${message}`);
}

async function ensurePlans() {
    const plans = [
        {
            code: PlanCode.STARTER,
            name: "Starter",
            description: "For small care teams getting started.",
            priceMonthlyCents: 9900,
            priceYearlyCents: 99000,
            seatLimit: 10,
            features: {
                maxCasesPerMonth: 200,
                maxDocumentsPerMonth: 1000,
            },
        },
        {
            code: PlanCode.PROFESSIONAL,
            name: "Professional",
            description: "For hospitals with growing discharge workflow volume.",
            priceMonthlyCents: 29900,
            priceYearlyCents: 299000,
            seatLimit: 50,
            features: {
                maxCasesPerMonth: 5000,
                maxDocumentsPerMonth: 25000,
            },
        },
        {
            code: PlanCode.ENTERPRISE,
            name: "Enterprise",
            description: "For large health systems needing advanced controls.",
            priceMonthlyCents: 99900,
            priceYearlyCents: 999000,
            seatLimit: 500,
            features: {
                maxCasesPerMonth: 100000,
                maxDocumentsPerMonth: 500000,
            },
        },
    ];

    for (const plan of plans) {
        await prisma.plan.upsert({
            where: { code: plan.code },
            update: {
                ...plan,
                isActive: true,
            },
            create: {
                ...plan,
                isActive: true,
            },
        });
    }
}

async function ensureTenantWithSubscription(args) {
    const tenant = await prisma.tenant.upsert({
        where: { code: args.code },
        update: {
            name: args.name,
            country: args.country || null,
            timezone: args.timezone || "UTC",
            billingEmail: args.billingEmail || null,
            isActive: true,
            metadata: {
                source: "recover_saas_admin",
                repairedAt: new Date().toISOString(),
            },
        },
        create: {
            name: args.name,
            code: args.code,
            country: args.country || null,
            timezone: args.timezone || "UTC",
            billingEmail: args.billingEmail || null,
            isActive: true,
            metadata: {
                source: "recover_saas_admin",
                repairedAt: new Date().toISOString(),
            },
        },
    });

    const plan = await prisma.plan.findUnique({ where: { code: args.planCode || PlanCode.STARTER } });
    if (!plan) {
        throw new Error("No plan available for tenant recovery");
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const existing = await prisma.subscription.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
    });

    const activeMemberships = await prisma.tenantMembership.count({
        where: {
            tenantId: tenant.id,
            status: MembershipStatus.ACTIVE,
        },
    });

    const seatLimit = Math.max(plan.seatLimit, activeMemberships || 1);

    const subscription = existing
        ? await prisma.subscription.update({
            where: { id: existing.id },
            data: {
                planId: plan.id,
                status: args.status || SubscriptionStatus.ACTIVE,
                billingInterval: BillingInterval.MONTHLY,
                seatLimit,
                trialEndsAt: args.status === SubscriptionStatus.ACTIVE ? null : trialEndsAt,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                canceledAt: null,
            },
        })
        : await prisma.subscription.create({
            data: {
                tenantId: tenant.id,
                planId: plan.id,
                status: args.status || SubscriptionStatus.ACTIVE,
                billingInterval: BillingInterval.MONTHLY,
                seatLimit,
                trialEndsAt: args.status === SubscriptionStatus.ACTIVE ? null : trialEndsAt,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
            },
        });

    return { tenant, subscription };
}

async function ensurePlatformSuperuser() {
    const { tenant } = await ensureTenantWithSubscription({
        code: "wathiqcare",
        name: "WathiqCare",
        country: "SA",
        timezone: "Asia/Riyadh",
        billingEmail: SUPERUSER_EMAIL,
        status: SubscriptionStatus.ACTIVE,
        planCode: PlanCode.STARTER,
    });

    const user = await prisma.user.upsert({
        where: { email: SUPERUSER_EMAIL },
        update: {
            fullName: SUPERUSER_NAME,
            role: "platform_superadmin",
            isActive: true,
            hashedPassword: getRequiredEnv("PLATFORM_SUPERUSER_PASSWORD_HASH"),
            tenantId: tenant.id,
        },
        create: {
            tenantId: tenant.id,
            email: SUPERUSER_EMAIL,
            fullName: SUPERUSER_NAME,
            role: "platform_superadmin",
            isActive: true,
            hashedPassword: getRequiredEnv("PLATFORM_SUPERUSER_PASSWORD_HASH"),
        },
    });

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

    return { user, tenant };
}

async function maybeRepairTenantFromEnv() {
    const code = (process.env.REPAIR_TENANT_CODE || "").trim();
    if (!code) {
        return null;
    }

    const name = (process.env.REPAIR_TENANT_NAME || code).trim();
    const ownerEmail = (process.env.REPAIR_TENANT_OWNER_EMAIL || "").trim().toLowerCase();
    const ownerFullName = (process.env.REPAIR_TENANT_OWNER_NAME || "Tenant Owner").trim();

    const { tenant, subscription } = await ensureTenantWithSubscription({
        code,
        name,
        country: process.env.REPAIR_TENANT_COUNTRY || "SA",
        timezone: process.env.REPAIR_TENANT_TIMEZONE || "Asia/Riyadh",
        billingEmail: process.env.REPAIR_TENANT_BILLING_EMAIL || ownerEmail || null,
        status: SubscriptionStatus.ACTIVE,
        planCode: (process.env.REPAIR_TENANT_PLAN_CODE || PlanCode.STARTER),
    });

    if (ownerEmail) {
        const owner = await prisma.user.upsert({
            where: { email: ownerEmail },
            update: {
                fullName: ownerFullName,
                isActive: true,
                role: "tenant_owner",
                tenantId: tenant.id,
            },
            create: {
                tenantId: tenant.id,
                email: ownerEmail,
                fullName: ownerFullName,
                role: "tenant_owner",
                isActive: true,
                hashedPassword: null,
            },
        });

        await prisma.tenantMembership.upsert({
            where: {
                tenantId_userId: {
                    tenantId: tenant.id,
                    userId: owner.id,
                },
            },
            update: {
                role: MembershipRole.OWNER,
                status: MembershipStatus.ACTIVE,
            },
            create: {
                tenantId: tenant.id,
                userId: owner.id,
                role: MembershipRole.OWNER,
                status: MembershipStatus.ACTIVE,
            },
        });
    }

    return { tenant, subscription };
}

async function main() {
    logStep("Ensuring billing plans");
    await ensurePlans();

    logStep(`Ensuring platform superuser ${SUPERUSER_EMAIL}`);
    const { user, tenant } = await ensurePlatformSuperuser();

    const repairedTenant = await maybeRepairTenantFromEnv();

    console.log("recovery_complete=true");
    console.log(`superuser_email=${user.email}`);
    console.log(`superuser_role=${user.role}`);
    console.log(`superuser_active=${user.isActive}`);
    console.log(`superuser_tenant_code=${tenant.code}`);

    if (repairedTenant) {
        console.log(`repaired_tenant_code=${repairedTenant.tenant.code}`);
        console.log(`repaired_subscription_status=${repairedTenant.subscription.status}`);
    }
}

main()
    .catch((error) => {
        console.error("recovery_failed", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
