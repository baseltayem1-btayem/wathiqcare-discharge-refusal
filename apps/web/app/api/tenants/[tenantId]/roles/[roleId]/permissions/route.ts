import { NextRequest, NextResponse } from "next/server";
import {
  hasPlatformAccess,
  requireAuth,
  requireTenantAccess,
  requireTenantPermission,
} from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

type RouteContext = {
  params: Promise<{ tenantId: string; roleId: string }>;
};

type UpdateRolePermissionsPayload = {
  permissionIds?: string[];
};

async function authorizePermissionManagement(
  request: NextRequest,
  tenantId: string,
) {
  const auth = await requireAuth(request);

  if (!hasPlatformAccess(auth)) {
    await requireTenantPermission(request, tenantId, "permissions.manage");
  } else {
    await requireTenantAccess(request, tenantId);
  }

  return auth;
}

function normalizePermissionIds(
  payload: UpdateRolePermissionsPayload | null,
): string[] {
  if (!Array.isArray(payload?.permissionIds)) {
    return [];
  }

  return payload.permissionIds
    .map((item) => String(item).trim())
    .filter(Boolean);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const prisma = getPrisma();
    const { tenantId, roleId } = await params;

    const auth = await authorizePermissionManagement(request, tenantId);

    const payload = (await request.json().catch(() => null)) as
      | UpdateRolePermissionsPayload
      | null;

    const permissionIds = normalizePermissionIds(payload);

    const role = await prisma.tenantRole.findFirst({
      where: {
        id: roleId,
        tenantId,
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (!role) {
      throw new ApiError(404, "Role not found");
    }

    const permissions = await prisma.permission.findMany({
      where: {
        id: {
          in: permissionIds,
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (permissions.length !== permissionIds.length) {
      throw new ApiError(400, "One or more permissions are invalid");
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.tenantRolePermission.deleteMany({
        where: {
          tenantRoleId: roleId,
        },
      });

      if (permissionIds.length > 0) {
        await tx.tenantRolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            tenantRoleId: roleId,
            permissionId,
            allowed: true,
          })),
        });
      }

      return tx.tenantRole.findUniqueOrThrow({
        where: { id: roleId },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    });

    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      entityType: "tenant_role",
      entityId: roleId,
      action: "permission_matrix_changed",
      details: `Permission matrix changed for role ${role.code}`,
      metadataJson: {
        permissionIds,
      },
      request,
    });

    return NextResponse.json(toJsonSafe(updated));
  } catch (error) {
    return handleApiError(error);
  }
}