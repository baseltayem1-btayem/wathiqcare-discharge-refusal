import { NextRequest, NextResponse } from "next/server";
import { TenantRoleStatus } from "@/lib/server/prisma-enums";
import { requireAuth, requireTenantPermissionForAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { bootstrapTenantAdminConfiguration } from "@/lib/server/tenant-admin";
import { toJsonSafe } from "@/lib/server/json";
import { writeAuditLog } from "@/lib/server/saas-services";

const WATHIQNOTE_ROLES = [
  { code: "NOTE_ISSUER", name: "مصدر السند", description: "Creates and issues promissory notes" },
  { code: "NOTE_REVIEWER", name: "مراجع السند", description: "Reviews promissory notes before issuance" },
  { code: "FINANCE", name: "المالية", description: "Handles settlement and financial verification" },
  { code: "LEGAL", name: "الشؤون القانونية", description: "Handles legal review and void actions" },
  { code: "ADMIN", name: "مشرف النظام", description: "Full WathiqNote administration" },
  { code: "AUDITOR", name: "مدقق", description: "Reads audit and evidence records" },
];

const WATHIQNOTE_PERMISSIONS = [
  { key: "promissory_notes.create", name: "إنشاء مسودة", module: "promissory_notes" },
  { key: "promissory_notes.update", name: "تعديل مسودة", module: "promissory_notes" },
  { key: "promissory_notes.review", name: "مراجعة السند", module: "promissory_notes" },
  { key: "promissory_notes.issue", name: "إصدار السند", module: "promissory_notes" },
  { key: "promissory_notes.signature.send", name: "إرسال رابط التوقيع", module: "promissory_notes" },
  { key: "promissory_notes.otp.resend", name: "إعادة إرسال الرابط / OTP", module: "promissory_notes" },
  { key: "promissory_notes.settle", name: "إقفال بالوفاء", module: "promissory_notes" },
  { key: "promissory_notes.void", name: "إلغاء السند", module: "promissory_notes" },
  { key: "promissory_notes.pdf.download", name: "تحميل PDF", module: "promissory_notes" },
  { key: "promissory_notes.audit.read", name: "عرض سجل التدقيق", module: "promissory_notes" },
  { key: "users.manage", name: "إدارة المستخدمين", module: "tenant_admin" },
  { key: "roles.read", name: "قراءة الصلاحيات", module: "tenant_admin" },
  { key: "roles.manage", name: "إدارة الصلاحيات", module: "tenant_admin" },
];

function findSeedRole(roleCode: string | undefined) {
  return WATHIQNOTE_ROLES.find((item) => item.code === roleCode);
}

function findSeedPermission(permissionKey: string | undefined) {
  return WATHIQNOTE_PERMISSIONS.find((item) => item.key === permissionKey);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const tenantId = auth.tenant_id;

    if (!tenantId) {
      throw new ApiError(403, "Tenant context is required");
    }

    await requireTenantPermissionForAuth(auth, tenantId, "roles.read", {
      allowPlatform: false,
    });

    await bootstrapTenantAdminConfiguration(tenantId);

    const prisma = getPrisma();

    const [roles, permissions] = await Promise.all([
      prisma.tenantRole.findMany({
        where: {
          tenantId,
          status: TenantRoleStatus.ACTIVE,
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
        orderBy: [{ isTemplate: "desc" }, { name: "asc" }],
      }),
      prisma.permission.findMany({
        where: { isActive: true },
        orderBy: [{ module: "asc" }, { name: "asc" }],
      }),
    ]);

    return NextResponse.json(toJsonSafe({ roles, permissions }));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const tenantId = auth.tenant_id;

    if (!tenantId) {
      throw new ApiError(403, "Tenant context is required");
    }

    await requireTenantPermissionForAuth(auth, tenantId, "roles.manage", {
      allowPlatform: false,
    });

    const payload = (await request.json().catch(() => null)) as
      | {
          roleId?: string;
          roleCode?: string;
          permissionId?: string;
          permissionKey?: string;
          allowed?: boolean;
        }
      | null;

    const roleId = payload?.roleId?.trim();
    const roleCode = payload?.roleCode?.trim();
    const permissionId = payload?.permissionId?.trim();
    const permissionKey = payload?.permissionKey?.trim();

    if ((!roleId && !roleCode) || (!permissionId && !permissionKey) || typeof payload?.allowed !== "boolean") {
      throw new ApiError(400, "roleId or roleCode, permissionId or permissionKey, and allowed are required");
    }

    const prisma = getPrisma();

    const seedRole = findSeedRole(roleCode);
    const seedPermission = findSeedPermission(permissionKey);

    const role = roleId
      ? await prisma.tenantRole.findFirst({
          where: {
            id: roleId,
            tenantId,
          },
        })
      : await prisma.tenantRole.upsert({
          where: {
            tenantId_code: {
              tenantId,
              code: roleCode!,
            },
          },
          update: seedRole
            ? {
                name: seedRole.name,
                description: seedRole.description,
                status: TenantRoleStatus.ACTIVE,
              }
            : {},
          create: {
            tenantId,
            code: roleCode!,
            name: seedRole?.name ?? roleCode!,
            description: seedRole?.description ?? null,
            status: TenantRoleStatus.ACTIVE,
            isTemplate: false,
          },
        });

    const permission = permissionId
      ? await prisma.permission.findFirst({
          where: {
            id: permissionId,
            isActive: true,
          },
        })
      : await prisma.permission.upsert({
          where: {
            key: permissionKey!,
          },
          update: seedPermission
            ? {
                name: seedPermission.name,
                module: seedPermission.module,
                description: seedPermission.name,
                isActive: true,
              }
            : {
                isActive: true,
              },
          create: {
            key: permissionKey!,
            name: seedPermission?.name ?? permissionKey!,
            module: seedPermission?.module ?? "promissory_notes",
            description: seedPermission?.name ?? permissionKey!,
            isActive: true,
          },
        });

    if (!role) {
      throw new ApiError(404, "Role not found");
    }

    if (!permission) {
      throw new ApiError(404, "Permission not found");
    }

    const rolePermission = await prisma.tenantRolePermission.upsert({
      where: {
        tenantRoleId_permissionId: {
          tenantRoleId: role.id,
          permissionId: permission.id,
        },
      },
      update: {
        allowed: payload.allowed,
      },
      create: {
        tenantRoleId: role.id,
        permissionId: permission.id,
        allowed: payload.allowed,
      },
      include: {
        tenantRole: true,
        permission: true,
      },
    });

    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      entityType: "tenant_role_permission",
      entityId: rolePermission.id,
      action: payload.allowed ? "tenant_role_permission_enabled" : "tenant_role_permission_disabled",
      details: `Permission ${permission.key} ${payload.allowed ? "enabled" : "disabled"} for role ${role.code}`,
      metadataJson: {
        roleId: role.id,
        roleCode: role.code,
        permissionId: permission.id,
        permissionKey: permission.key,
        allowed: payload.allowed,
      },
      request,
    });

    return NextResponse.json(toJsonSafe(rolePermission));
  } catch (error) {
    return handleApiError(error);
  }
}