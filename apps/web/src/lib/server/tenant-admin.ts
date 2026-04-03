import { Prisma, TenantRoleStatus } from "@prisma/client";
import { getPrisma } from "@/lib/server/prisma";

const DEFAULT_DEPARTMENTS = [
    { code: "DOCTOR", name: "Doctor" },
    { code: "NURSING", name: "Nursing" },
    { code: "LAB_TECH", name: "Lab Tech" },
    { code: "PHARMACIST", name: "Pharmacist" },
    { code: "FINANCE_OFFICER", name: "Finance Officer" },
    { code: "LEGAL_ADMIN", name: "Legal Admin" },
    { code: "IT_ADMIN", name: "IT Admin" },
    { code: "MEDICAL_DIRECTOR", name: "Medical Director" },
    { code: "BED_MANAGER", name: "Bed Manager" },
] as const;

const PERMISSION_CATALOG = [
    { key: "clinical.case.read", name: "View Clinical Cases", module: "clinical" },
    { key: "clinical.case.assign", name: "Assign Case Ownership", module: "clinical" },
    { key: "discharge.approve", name: "Approve Discharge Decision", module: "clinical" },
    { key: "clinical.step.execute", name: "Execute Workflow Steps", module: "clinical" },
    { key: "legal.escalate", name: "Trigger Legal Escalation", module: "legal" },
    { key: "legal.review", name: "Review Legal Queue", module: "legal" },
    { key: "users.read", name: "View Users", module: "admin" },
    { key: "users.create", name: "Create Users", module: "admin" },
    { key: "users.activate", name: "Activate Users", module: "admin" },
    { key: "users.deactivate", name: "Deactivate Users", module: "admin" },
    { key: "departments.read", name: "View Departments", module: "admin" },
    { key: "departments.manage", name: "Manage Departments", module: "admin" },
    { key: "roles.read", name: "View Roles", module: "admin" },
    { key: "roles.manage", name: "Manage Roles", module: "admin" },
    { key: "roles.assign", name: "Assign Roles To Users", module: "admin" },
    { key: "permissions.read", name: "View Permission Matrix", module: "admin" },
    { key: "permissions.manage", name: "Manage Permission Matrix", module: "admin" },
    { key: "subscription.read", name: "View Subscription Summary", module: "finance" },
    { key: "usage.read", name: "View Seat Usage", module: "finance" },
    { key: "system.integrations.read", name: "View System Integrations", module: "system" },
] as const;

type RoleTemplate = {
    code: string;
    name: string;
    description: string;
    permissionKeys: string[];
};

const DEFAULT_ROLE_TEMPLATES: RoleTemplate[] = [
    {
        code: "tenant_admin",
        name: "Tenant Admin",
        description: "Tenant-level administration",
        permissionKeys: PERMISSION_CATALOG.map((item) => item.key),
    },
    {
        code: "doctor",
        name: "Doctor",
        description: "Clinical doctor role",
        permissionKeys: [
            "clinical.case.read",
            "discharge.approve",
            "clinical.step.execute",
            "users.read",
            "departments.read",
            "subscription.read",
        ],
    },
    {
        code: "nursing",
        name: "Nursing",
        description: "Nursing role",
        permissionKeys: ["clinical.case.read", "clinical.step.execute", "users.read", "departments.read", "subscription.read"],
    },
    {
        code: "lab_tech",
        name: "Lab Tech",
        description: "Laboratory role",
        permissionKeys: ["users.read", "departments.read", "subscription.read"],
    },
    {
        code: "pharmacist",
        name: "Pharmacist",
        description: "Pharmacy role",
        permissionKeys: ["users.read", "departments.read", "subscription.read"],
    },
    {
        code: "finance_officer",
        name: "Finance Officer",
        description: "Finance and billing operations",
        permissionKeys: ["users.read", "roles.read", "subscription.read", "usage.read"],
    },
    {
        code: "legal_admin",
        name: "Legal Admin",
        description: "Legal and compliance oversight",
        permissionKeys: ["legal.review", "legal.escalate", "users.read", "roles.read", "subscription.read"],
    },
    {
        code: "it_admin",
        name: "IT Admin",
        description: "Technical administration",
        permissionKeys: ["users.read", "roles.read", "permissions.read", "system.integrations.read", "subscription.read"],
    },
    {
        code: "medical_director",
        name: "Medical Director",
        description: "Clinical leadership",
        permissionKeys: ["clinical.case.read", "discharge.approve", "clinical.step.execute", "roles.read", "permissions.read", "subscription.read"],
    },
    {
        code: "bed_manager",
        name: "Bed Manager",
        description: "Bed operations and flow",
        permissionKeys: ["users.read", "departments.read", "subscription.read"],
    },
];

export function slugRoleCode(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40);
}

export async function ensurePermissionCatalog(tx: Prisma.TransactionClient): Promise<void> {
    for (const permission of PERMISSION_CATALOG) {
        await tx.permission.upsert({
            where: { key: permission.key },
            update: {
                name: permission.name,
                module: permission.module,
                isActive: true,
            },
            create: {
                key: permission.key,
                name: permission.name,
                module: permission.module,
                isActive: true,
            },
        });
    }
}

export async function ensureTenantDepartments(tx: Prisma.TransactionClient, tenantId: string): Promise<void> {
    for (const department of DEFAULT_DEPARTMENTS) {
        await tx.department.upsert({
            where: {
                tenantId_code: {
                    tenantId,
                    code: department.code,
                },
            },
            update: {
                name: department.name,
                isActive: true,
            },
            create: {
                tenantId,
                code: department.code,
                name: department.name,
                isActive: true,
            },
        });
    }
}

export async function ensureTenantRoleTemplates(tx: Prisma.TransactionClient, tenantId: string): Promise<void> {
    await ensurePermissionCatalog(tx);
    const permissions = await tx.permission.findMany({
        where: { isActive: true },
    });
    const permissionByKey = new Map(permissions.map((item) => [item.key, item.id]));

    for (const template of DEFAULT_ROLE_TEMPLATES) {
        const role = await tx.tenantRole.upsert({
            where: {
                tenantId_code: {
                    tenantId,
                    code: template.code,
                },
            },
            update: {
                name: template.name,
                description: template.description,
                status: TenantRoleStatus.ACTIVE,
            },
            create: {
                tenantId,
                code: template.code,
                name: template.name,
                description: template.description,
                status: TenantRoleStatus.ACTIVE,
                isTemplate: true,
            },
        });

        for (const key of template.permissionKeys) {
            const permissionId = permissionByKey.get(key);
            if (!permissionId) continue;

            await tx.tenantRolePermission.upsert({
                where: {
                    tenantRoleId_permissionId: {
                        tenantRoleId: role.id,
                        permissionId,
                    },
                },
                update: {
                    allowed: true,
                },
                create: {
                    tenantRoleId: role.id,
                    permissionId,
                    allowed: true,
                },
            });
        }
    }
}

export async function bootstrapTenantAdminConfiguration(tenantId: string): Promise<void> {
    const prisma = getPrisma();
    await getPrisma().$transaction(async (tx) => {
        await ensureTenantDepartments(tx, tenantId);
        await ensureTenantRoleTemplates(tx, tenantId);

        const tenantAdminRole = await tx.tenantRole.findUnique({
            where: {
                tenantId_code: {
                    tenantId,
                    code: "tenant_admin",
                },
            },
            select: {
                id: true,
            },
        });

        if (tenantAdminRole) {
            const adminMemberships = await tx.tenantMembership.findMany({
                where: {
                    tenantId,
                    status: "ACTIVE",
                    role: {
                        in: ["OWNER", "ADMIN"],
                    },
                },
                select: {
                    userId: true,
                },
            });

            for (const membership of adminMemberships) {
                await tx.userRoleAssignment.upsert({
                    where: {
                        tenantId_userId_tenantRoleId: {
                            tenantId,
                            userId: membership.userId,
                            tenantRoleId: tenantAdminRole.id,
                        },
                    },
                    update: {
                        isPrimary: true,
                    },
                    create: {
                        tenantId,
                        userId: membership.userId,
                        tenantRoleId: tenantAdminRole.id,
                        isPrimary: true,
                    },
                });
            }
        }
    });
}

export async function getTenantRoleByCode(tenantId: string, code: string) {
    const prisma = getPrisma();
    return getPrisma().tenantRole.findUnique({
        where: {
            tenantId_code: {
                tenantId,
                code,
            },
        },
    });
}
