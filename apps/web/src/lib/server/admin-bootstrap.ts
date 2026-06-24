import {
  Prisma,
  $Enums,
  BillingInterval,
  MembershipRole,
  MembershipStatus,
  PlanCode,
  SubscriptionStatus,
} from "@prisma/client";
import { getPrisma } from "@/lib/server/prisma";
import { ApiError } from "@/lib/server/http";
import { canonicalizeUserRole, membershipRoleForUserRole } from "@/lib/server/roles";
import { getPlatformTenant } from "@/lib/server/platform-tenant";

export type AdminDepartment = {
  code: string;
  name: string;
  isActive: boolean;
};

export type RoleTemplate = {
  code: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
};

export const DEFAULT_IMC_DEPARTMENTS: AdminDepartment[] = [
  { code: "EMERGENCY", name: "Emergency", isActive: true },
  { code: "INPATIENT", name: "Inpatient", isActive: true },
  { code: "ICU", name: "ICU", isActive: true },
  { code: "OPD", name: "OPD", isActive: true },
  { code: "NURSING", name: "Nursing", isActive: true },
  { code: "PHARMACY", name: "Pharmacy", isActive: true },
  { code: "LABORATORY", name: "Laboratory", isActive: true },
  { code: "FINANCE", name: "Finance", isActive: true },
  { code: "LEGAL_AFFAIRS", name: "Legal Affairs", isActive: true },
  { code: "MEDICAL_AFFAIRS", name: "Medical Affairs", isActive: true },
  { code: "PATIENT_RELATIONS", name: "Patient Relations", isActive: true },
  { code: "QUALITY_COMPLIANCE", name: "Quality / Compliance", isActive: true },
];

export const DEFAULT_ROLE_TEMPLATES: RoleTemplate[] = [
  { code: "platform_superadmin", name: "Platform Superadmin", isSystem: true, permissions: ["platform:*", "tenants:*", "subscriptions:*", "users:*", "roles:*", "billing:*", "audit:*"] },
  { code: "platform_admin", name: "Platform Admin", isSystem: true, permissions: ["tenants:read", "tenants:write", "subscriptions:*", "users:*", "roles:*", "billing:*", "audit:read"] },
  { code: "tenant_owner", name: "Tenant Owner", isSystem: true, permissions: ["tenant:manage", "departments:*", "users:*", "memberships:*", "roles:read", "roles:assign", "audit:read"] },
  { code: "tenant_admin", name: "Tenant Admin", isSystem: true, permissions: ["tenant:read", "departments:*", "users:*", "memberships:*", "roles:read", "roles:assign", "audit:read"] },
  { code: "medical_director", name: "Medical Director", isSystem: true, permissions: ["cases:read_all", "clinical:oversight", "dashboards:clinical"] },
  { code: "bed_manager", name: "Bed Manager", isSystem: true, permissions: ["workflow:coordination", "dashboard:operations"] },
  { code: "doctor", name: "Doctor", isSystem: true, permissions: ["cases:create", "workflow:medical_update", "workflow:medical_sign"] },
  { code: "nursing", name: "Nursing", isSystem: true, permissions: ["workflow:nursing_update", "workflow:patient_education"] },
  { code: "reception", name: "Reception", isSystem: true, permissions: ["patient:register", "cases:demographics_update"] },
  { code: "pharmacist", name: "Pharmacist", isSystem: true, permissions: ["workflow:medication_view"] },
  { code: "lab_tech", name: "Lab Tech", isSystem: true, permissions: ["workflow:lab_results_upload"] },
  { code: "finance_officer", name: "Finance Officer", isSystem: true, permissions: ["workflow:finance_view", "billing:tenant_view"] },
  { code: "legal_admin", name: "Legal Admin", isSystem: true, permissions: ["escalation:*", "evidence_bundle:*", "audit:read"] },
  { code: "patient_relations", name: "Patient Relations", isSystem: true, permissions: ["patient_relations:*", "workflow:case_support"] },
  { code: "quality", name: "Quality", isSystem: true, permissions: ["compliance:review", "dashboards:quality"] },
  { code: "compliance", name: "Compliance", isSystem: true, permissions: ["compliance:review", "audit:read"] },
  { code: "viewer", name: "Viewer", isSystem: true, permissions: ["read:limited"] },
];

function uniqueByCode<T extends { code: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const code = item.code.trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    result.push({ ...item, code } as T);
  }
  return result;
}

function asObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export async function getSetupStatus() {
  const prisma = () => getPrisma();
  const [tenantCount, userCount, platformAdminCount, subscriptionCount] = await Promise.all([
    prisma().tenant.count(),
    prisma().user.count(),
    prisma().user.count({
      where: {
        userType: "PLATFORM_ADMIN",
        isActive: true,
      },
    }),
    prisma().subscription.count(),
  ]);

  return {
    initialized: tenantCount > 0 && platformAdminCount > 0 && subscriptionCount > 0,
    tenantCount,
    userCount,
    platformAdminCount,
    subscriptionCount,
  };
}

export async function ensureBasePlans() {
  const defaults = [
    {
      code: $Enums.PlanCode.STARTER,
      name: "Starter",
      description: "Starter tier",
      seatLimit: 150,
      priceMonthlyCents: 9900,
      priceYearlyCents: 99000,
      features: { maxCasesPerMonth: 5000, maxDocumentsPerMonth: 20000, support: "standard" },
    },
    {
      code: $Enums.PlanCode.PROFESSIONAL,
      name: "Professional",
      description: "Professional tier",
      seatLimit: 900,
      priceMonthlyCents: 29900,
      priceYearlyCents: 299000,
      features: { maxCasesPerMonth: 30000, maxDocumentsPerMonth: 120000, support: "priority" },
    },
    {
      code: $Enums.PlanCode.ENTERPRISE,
      name: "Enterprise",
      description: "Enterprise tier",
      seatLimit: 3000,
      priceMonthlyCents: 99900,
      priceYearlyCents: 999000,
      features: { maxCasesPerMonth: 150000, maxDocumentsPerMonth: 600000, support: "24x7" },
    },
  ] as const;

  const prisma = () => getPrisma();
  for (const plan of defaults) {
    await prisma().plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        seatLimit: plan.seatLimit,
        priceMonthlyCents: plan.priceMonthlyCents,
        priceYearlyCents: plan.priceYearlyCents,
        isActive: true,
        features: plan.features as JsonInputValue,
      },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        seatLimit: plan.seatLimit,
        priceMonthlyCents: plan.priceMonthlyCents,
        priceYearlyCents: plan.priceYearlyCents,
        isActive: true,
        features: plan.features as JsonInputValue,
      },
    });
  }
}

export async function ensureImcBootstrap(input: {
  adminEmail: string;
  adminFullName: string;
  passwordHash: string;
  actorUserId?: string;
}) {
  if (!input.passwordHash) {
    throw new ApiError(409, "setup_password_hash_missing");
  }

  const prisma = () => getPrisma();
  await ensureBasePlans();
  await getPlatformTenant();

  const tenant = await prisma().tenant.upsert({
    where: { code: "IMC" },
    update: {
      name: "International Medical Center",
      domain: "wathiqcare.online",
      timezone: "Asia/Riyadh",
      country: "SA",
      billingEmail: input.adminEmail,
      isActive: true,
      metadata: {
        bootstrap: {
          initializedAt: new Date().toISOString(),
          source: "admin_setup_wizard",
        },
      },
    },
    create: {
      code: "IMC",
      name: "International Medical Center",
      domain: "wathiqcare.online",
      timezone: "Asia/Riyadh",
      country: "SA",
      billingEmail: input.adminEmail,
      isActive: true,
      metadata: {
        bootstrap: {
          initializedAt: new Date().toISOString(),
          source: "admin_setup_wizard",
        },
      },
    },
  });

  const superAdmin = await prisma().user.upsert({
    where: { email: input.adminEmail.toLowerCase() },
    update: {
      fullName: input.adminFullName,
      role: "platform_superadmin",
      userType: "PLATFORM_ADMIN",
      isActive: true,
      tenantId: tenant.id,
      hashedPassword: input.passwordHash,
    },
    create: {
      tenantId: tenant.id,
      email: input.adminEmail.toLowerCase(),
      fullName: input.adminFullName,
      role: "platform_superadmin",
      userType: "PLATFORM_ADMIN",
      isActive: true,
      hashedPassword: input.passwordHash,
    },
  });

  await prisma().user.upsert({
    where: { email: "admin@wathiqcare.online" },
    update: {
      tenantId: tenant.id,
      fullName: "WathiqCare Platform Admin",
      role: "platform_admin",
      userType: "PLATFORM_ADMIN",
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      email: "admin@wathiqcare.online",
      fullName: "WathiqCare Platform Admin",
      role: "platform_admin",
      userType: "PLATFORM_ADMIN",
      isActive: true,
      hashedPassword: input.passwordHash,
    },
  });

  await prisma().tenantMembership.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: superAdmin.id,
      },
    },
    update: {
      role: $Enums.MembershipRole.OWNER,
      status: $Enums.MembershipStatus.ACTIVE,
    },
    create: {
      tenantId: tenant.id,
      userId: superAdmin.id,
      role: $Enums.MembershipRole.OWNER,
      status: $Enums.MembershipStatus.ACTIVE,
    },
  });

  const starterPlan = await prisma().plan.findUnique({ where: { code: $Enums.PlanCode.ENTERPRISE } });
  if (!starterPlan) {
    throw new ApiError(409, "enterprise_plan_missing");
  }

  const subscription = await prisma().subscription.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });

  const periodStart = new Date();
  const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

  const ensuredSubscription = subscription
    ? await prisma().subscription.update({
      where: { id: subscription.id },
      data: {
        planId: starterPlan.id,
        status: $Enums.SubscriptionStatus.ACTIVE,
        billingInterval: $Enums.BillingInterval.MONTHLY,
        seatLimit: Math.max(subscription.seatLimit, 1200),
        trialEndsAt: null,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        canceledAt: null,
        metadata: {
          source: "admin_setup_wizard",
          tenantTier: "imc_300_bed",
        },
      },
    })
    : await prisma().subscription.create({
      data: {
        tenantId: tenant.id,
        planId: starterPlan.id,
        status: $Enums.SubscriptionStatus.ACTIVE,
        billingInterval: $Enums.BillingInterval.MONTHLY,
        seatLimit: 1200,
        trialEndsAt: null,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        metadata: {
          source: "admin_setup_wizard",
          tenantTier: "imc_300_bed",
        },
      },
    });

  await prisma().subscriptionEvent.create({
    data: {
      tenantId: tenant.id,
      subscriptionId: ensuredSubscription.id,
      eventType: "UPDATED",
      status: "success",
      actorUserId: input.actorUserId ?? superAdmin.id,
      metadata: {
        source: "admin_setup_wizard",
        seatLimit: ensuredSubscription.seatLimit,
      },
    },
  });

  await setTenantAdminConfig(tenant.id, {
    departments: DEFAULT_IMC_DEPARTMENTS,
    roleTemplates: DEFAULT_ROLE_TEMPLATES,
    permissionMatrixVersion: 1,
    bootstrapComplete: true,
  });

  return {
    tenant,
    superAdmin,
    subscription: ensuredSubscription,
  };
}

export async function getTenantAdminConfig(tenantId: string) {
  const prisma = () => getPrisma();
  const tenant = await prisma().tenant.findUnique({ where: { id: tenantId }, select: { metadata: true } });
  if (!tenant) {
    throw new ApiError(404, "Tenant not found");
  }

  const metadata = asObject(tenant.metadata as Prisma.JsonValue);
  const adminConfigRaw = asObject(metadata.adminConfig as Prisma.JsonValue);

  const departments = Array.isArray(adminConfigRaw.departments)
    ? uniqueByCode((adminConfigRaw.departments as Array<Record<string, unknown>>).map((item) => ({
      code: String(item.code ?? "").toUpperCase(),
      name: String(item.name ?? "").trim() || String(item.code ?? "").toUpperCase(),
      isActive: item.isActive !== false,
    })))
    : [];

  const roleTemplates = Array.isArray(adminConfigRaw.roleTemplates)
    ? uniqueByCode((adminConfigRaw.roleTemplates as Array<Record<string, unknown>>).map((item) => ({
      code: String(item.code ?? "").toLowerCase(),
      name: String(item.name ?? item.code ?? "").trim(),
      isSystem: item.isSystem !== false,
      permissions: Array.isArray(item.permissions) ? item.permissions.map((p) => String(p)) : [],
    })))
    : [];

  return {
    departments: departments.length > 0 ? departments : DEFAULT_IMC_DEPARTMENTS,
    roleTemplates: roleTemplates.length > 0 ? roleTemplates : DEFAULT_ROLE_TEMPLATES,
    permissionMatrixVersion: Number(adminConfigRaw.permissionMatrixVersion ?? 1),
    bootstrapComplete: adminConfigRaw.bootstrapComplete === true,
  };
}

export async function setTenantAdminConfig(
  tenantId: string,
  input: {
    departments?: AdminDepartment[];
    roleTemplates?: RoleTemplate[];
    permissionMatrixVersion?: number;
    bootstrapComplete?: boolean;
  },
) {
  const prisma = () => getPrisma();
  const tenant = await prisma().tenant.findUnique({ where: { id: tenantId }, select: { metadata: true } });
  if (!tenant) {
    throw new ApiError(404, "Tenant not found");
  }

  const metadata = asObject(tenant.metadata as Prisma.JsonValue);
  const currentAdminConfig = asObject(metadata.adminConfig as Prisma.JsonValue);

  const mergedAdminConfig: Record<string, unknown> = {
    ...currentAdminConfig,
    ...(typeof input.permissionMatrixVersion === "number"
      ? { permissionMatrixVersion: input.permissionMatrixVersion }
      : {}),
    ...(typeof input.bootstrapComplete === "boolean"
      ? { bootstrapComplete: input.bootstrapComplete }
      : {}),
    ...(input.departments
      ? {
        departments: uniqueByCode(input.departments).map((d) => ({
          code: d.code.toUpperCase(),
          name: d.name,
          isActive: d.isActive,
        })),
      }
      : {}),
    ...(input.roleTemplates
      ? {
        roleTemplates: uniqueByCode(input.roleTemplates).map((role) => ({
          code: role.code.toLowerCase(),
          name: role.name,
          isSystem: role.isSystem,
          permissions: role.permissions,
        })),
      }
      : {}),
  };

  const nextMetadata = {
    ...metadata,
    adminConfig: mergedAdminConfig,
  };

  await prisma().tenant.update({
    where: { id: tenantId },
    data: {
      metadata: nextMetadata as JsonInputValue,
    },
  });

  return getTenantAdminConfig(tenantId);
}

export function parseRoleForUser(inputRole: string | null | undefined): { userRole: string; membershipRole: MembershipRole } {
  const role = canonicalizeUserRole(inputRole);
  return {
    userRole: role,
    membershipRole: membershipRoleForUserRole(role),
  };
}
