const {
  PrismaClient,
  PlanCode,
  BillingInterval,
  SubscriptionStatus,
  MembershipRole,
  MembershipStatus,
  UsageMetric,
  InvoiceStatus,
  SubscriptionEventType,
} = require("@prisma/client");

const prisma = new PrismaClient();

const DEMO_PASSWORD_HASH = "$2b$12$UDpU/m7nylRxuya184DaUO0nR/W/axLZf0yYR2cIJlElFRerSiGZq";
const PRODUCTION_ADMIN_PASSWORD_HASH = "$2b$12$qLNuStRuC7vGTJMn7L4WyuVuLSj/UnTceQQkS8uOCQ5RjgObOOEgG";

async function seedPlans() {
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
        sla: "standard",
        support: "email",
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
        sla: "priority",
        support: "email+chat",
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
        sla: "24x7",
        support: "dedicated",
      },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthlyCents: plan.priceMonthlyCents,
        priceYearlyCents: plan.priceYearlyCents,
        seatLimit: plan.seatLimit,
        features: plan.features,
        isActive: true,
      },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        priceMonthlyCents: plan.priceMonthlyCents,
        priceYearlyCents: plan.priceYearlyCents,
        seatLimit: plan.seatLimit,
        features: plan.features,
        isActive: true,
      },
    });
  }
}

async function seedDemoTenant() {
  const tenant = await prisma.tenant.upsert({
    where: { code: "demo-hospital" },
    update: {
      name: "Demo Hospital Group",
      domain: "demo.wathiqcare.local",
      timezone: "Asia/Riyadh",
      country: "SA",
      billingEmail: "billing@demo.wathiqcare.local",
      isActive: true,
      metadata: {
        seededBy: "prisma-seed",
        environment: "local",
      },
    },
    create: {
      name: "Demo Hospital Group",
      code: "demo-hospital",
      domain: "demo.wathiqcare.local",
      timezone: "Asia/Riyadh",
      country: "SA",
      billingEmail: "billing@demo.wathiqcare.local",
      isActive: true,
      metadata: {
        seededBy: "prisma-seed",
        environment: "local",
      },
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@demo.wathiqcare.local" },
    update: {
      tenantId: tenant.id,
      fullName: "Demo Owner",
      role: "ADMIN",
      isActive: true,
      hashedPassword: DEMO_PASSWORD_HASH,
    },
    create: {
      tenantId: tenant.id,
      email: "owner@demo.wathiqcare.local",
      fullName: "Demo Owner",
      role: "ADMIN",
      isActive: true,
      hashedPassword: DEMO_PASSWORD_HASH,
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

  const starterPlan = await prisma.plan.findUniqueOrThrow({
    where: { code: PlanCode.STARTER },
  });

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const existingSubscription = await prisma.subscription.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });

  let subscription;
  if (existingSubscription) {
    subscription = await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        planId: starterPlan.id,
        status: SubscriptionStatus.TRIALING,
        billingInterval: BillingInterval.MONTHLY,
        seatLimit: starterPlan.seatLimit,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd,
      },
    });
  } else {
    subscription = await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: starterPlan.id,
        status: SubscriptionStatus.TRIALING,
        billingInterval: BillingInterval.MONTHLY,
        seatLimit: starterPlan.seatLimit,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd,
      },
    });
  }

  const existingEvent = await prisma.subscriptionEvent.findFirst({
    where: {
      tenantId: tenant.id,
      subscriptionId: subscription.id,
      eventType: SubscriptionEventType.CREATED,
    },
  });

  if (!existingEvent) {
    await prisma.subscriptionEvent.create({
      data: {
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        eventType: SubscriptionEventType.CREATED,
        status: "success",
        actorUserId: owner.id,
        metadata: {
          source: "seed",
        },
      },
    });
  }

  const usageDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  await prisma.usageRecord.upsert({
    where: {
      tenantId_metric_periodDate: {
        tenantId: tenant.id,
        metric: UsageMetric.ACTIVE_USERS,
        periodDate: usageDate,
      },
    },
    update: {
      value: BigInt(1),
      unit: "count",
      metadata: { source: "seed" },
    },
    create: {
      tenantId: tenant.id,
      metric: UsageMetric.ACTIVE_USERS,
      value: BigInt(1),
      unit: "count",
      periodDate: usageDate,
      metadata: { source: "seed" },
    },
  });

  await prisma.invoice.upsert({
    where: {
      tenantId_invoiceNumber: {
        tenantId: tenant.id,
        invoiceNumber: "INV-DEMO-0001",
      },
    },
    update: {
      status: InvoiceStatus.OPEN,
      subtotalCents: starterPlan.priceMonthlyCents,
      totalCents: starterPlan.priceMonthlyCents,
      amountDueCents: starterPlan.priceMonthlyCents,
      amountPaidCents: 0,
      dueAt: currentPeriodEnd,
    },
    create: {
      tenantId: tenant.id,
      subscriptionId: subscription.id,
      invoiceNumber: "INV-DEMO-0001",
      status: InvoiceStatus.OPEN,
      currency: "USD",
      subtotalCents: starterPlan.priceMonthlyCents,
      taxCents: 0,
      totalCents: starterPlan.priceMonthlyCents,
      amountDueCents: starterPlan.priceMonthlyCents,
      amountPaidCents: 0,
      dueAt: currentPeriodEnd,
      metadata: { source: "seed" },
    },
  });

  return { tenant, owner };
}

async function seedProductionAdmin() {
  const tenant = await prisma.tenant.upsert({
    where: { code: "wathiqcare" },
    update: {
      name: "WathiqCare",
      domain: "wathiqcare.online",
      isActive: true,
      metadata: {
        seededBy: "prisma-seed",
        environment: "production",
      },
    },
    create: {
      name: "WathiqCare",
      code: "wathiqcare",
      domain: "wathiqcare.online",
      isActive: true,
      metadata: {
        seededBy: "prisma-seed",
        environment: "production",
      },
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "admin@wathiqcare.online" },
    update: {
      tenantId: tenant.id,
      fullName: "WathiqCare Admin",
      role: "tenant_admin",
      isActive: true,
      hashedPassword: PRODUCTION_ADMIN_PASSWORD_HASH,
    },
    create: {
      tenantId: tenant.id,
      email: "admin@wathiqcare.online",
      fullName: "WathiqCare Admin",
      role: "tenant_admin",
      isActive: true,
      hashedPassword: PRODUCTION_ADMIN_PASSWORD_HASH,
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
      role: MembershipRole.ADMIN,
      status: MembershipStatus.ACTIVE,
    },
    create: {
      tenantId: tenant.id,
      userId: user.id,
      role: MembershipRole.ADMIN,
      status: MembershipStatus.ACTIVE,
    },
  });

  const starterPlan = await prisma.plan.findUniqueOrThrow({
    where: { code: PlanCode.STARTER },
  });

  const now = new Date();
  const currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const activeSeats = await prisma.tenantMembership.count({
    where: {
      tenantId: tenant.id,
      status: MembershipStatus.ACTIVE,
    },
  });

  const existingSubscription = await prisma.subscription.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });

  let subscription;
  if (existingSubscription) {
    subscription = await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        planId: starterPlan.id,
        status: SubscriptionStatus.ACTIVE,
        billingInterval: BillingInterval.MONTHLY,
        seatLimit: Math.max(starterPlan.seatLimit, activeSeats),
        trialEndsAt: null,
        currentPeriodStart: now,
        currentPeriodEnd,
      },
    });
  } else {
    subscription = await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: starterPlan.id,
        status: SubscriptionStatus.ACTIVE,
        billingInterval: BillingInterval.MONTHLY,
        seatLimit: Math.max(starterPlan.seatLimit, activeSeats),
        trialEndsAt: null,
        currentPeriodStart: now,
        currentPeriodEnd,
      },
    });
  }

  const existingSeedEvent = await prisma.subscriptionEvent.findFirst({
    where: {
      tenantId: tenant.id,
      subscriptionId: subscription.id,
      eventType: SubscriptionEventType.UPDATED,
    },
  });

  if (!existingSeedEvent) {
    await prisma.subscriptionEvent.create({
      data: {
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        eventType: SubscriptionEventType.UPDATED,
        status: "success",
        actorUserId: user.id,
        metadata: {
          source: "seed",
          note: "Default active subscription seeded for production admin tenant",
        },
      },
    });
  }

  return { tenant, user, subscription };
}

async function main() {
  await seedPlans();
  const { tenant, owner } = await seedDemoTenant();
  const {
    tenant: productionTenant,
    user: productionAdmin,
    subscription: productionSubscription,
  } = await seedProductionAdmin();

  console.log("Seed complete");
  console.log(`tenant_code=${tenant.code}`);
  console.log(`owner_email=${owner.email}`);
  console.log("owner_password=DemoOwner@123");
  console.log(`production_tenant_code=${productionTenant.code}`);
  console.log(`production_admin_email=${productionAdmin.email}`);
  console.log(`production_subscription_status=${productionSubscription.status}`);
  console.log("production_admin_password=WCare@2026");
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
