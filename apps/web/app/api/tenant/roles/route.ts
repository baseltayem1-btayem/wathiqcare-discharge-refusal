import { NextRequest } from "next/server";
import { requireAuth, requireTenantPermissionForAuth } from "@/lib/server/auth";
import { ApiError, handleApiError, jsonSuccess } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { bootstrapTenantAdminConfiguration } from "@/lib/server/tenant-admin";
import { toJsonSafe } from "@/lib/server/json";

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
        where: { tenantId },
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

    return jsonSuccess(
      toJsonSafe({
        roles,
        permissions,
      }),
    );
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
          permissionId?: string;
          allowed?: boolean;
        }
      | null;

    const roleId = payload?.roleId?.trim();
    const permissionId = payload?.permissionId?.trim();

    if (!roleId || !permissionId || typeof payload?.allowed !== "boolean") {
      throw new ApiError(400, "roleId, permissionId, and allowed are required");
    }

    const prisma = getPrisma();

    const [role, permission] = await Promise.all([
      prisma.tenantRole.findFirst({
        where: {
          id: roleId,
          tenantId,
        },
      }),
      prisma.permission.findFirst({
        where: {
          id: permissionId,
          isActive: true,
        },
      }),
    ]);

    if (!role) {
      throw new ApiError(404, "Role not found");
    }

    if (!permission) {
      throw new ApiError(404, "Permission not found");
    }

    const rolePermission = await prisma.tenantRolePermission.upsert({
      where: {
        tenantRoleId_permissionId: {
          tenantRoleId: roleId,
          permissionId,
        },
      },
      update: {
        allowed: payload.allowed,
      },
      create: {
        tenantRoleId: roleId,
        permissionId,
        allowed: payload.allowed,
      },
      include: {
        permission: true,
        tenantRole: true,
      },
    });

    return jsonSuccess(toJsonSafe(rolePermission));
  } catch (error) {
    return handleApiError(error);
  }
}
