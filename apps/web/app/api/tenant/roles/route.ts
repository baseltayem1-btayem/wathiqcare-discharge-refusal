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