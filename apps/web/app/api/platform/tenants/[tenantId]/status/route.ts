import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
<<<<<<< HEAD
import { getPrisma } from "@/lib/server/prisma";
=======
import { prisma } from "@/lib/server/prisma";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
import { writeAuditLog } from "@/lib/server/saas-services";

export const runtime = "nodejs";

<<<<<<< HEAD
type RouteContext = {
    params: Promise<{ tenantId: string }>;
};

type PatchTenantStatusPayload = {
    isActive?: boolean;
};

=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
/**
 * PATCH /api/platform/tenants/[tenantId]/status
 * Activate or deactivate a tenant.
 * Gated: PLATFORM_ADMIN only.
 */
<<<<<<< HEAD
export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const prisma = getPrisma();

=======
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ tenantId: string }> },
) {
    try {
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        const auth = await requirePlatformAccess(request);
        const { tenantId } = await context.params;

        if (!tenantId) {
            throw new ApiError(400, "tenantId is required");
        }

<<<<<<< HEAD
        const body = (await request.json().catch(() => null)) as PatchTenantStatusPayload | null;

=======
        const body = (await request.json().catch(() => null)) as { isActive?: boolean } | null;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        if (!body || typeof body.isActive !== "boolean") {
            throw new ApiError(400, "body.isActive (boolean) is required");
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
<<<<<<< HEAD
            select: {
                id: true,
                name: true,
                isActive: true,
            },
        });

=======
            select: { id: true, name: true, isActive: true },
        });
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        if (!tenant) {
            throw new ApiError(404, "Tenant not found");
        }

        if (tenant.isActive === body.isActive) {
            return NextResponse.json(
<<<<<<< HEAD
                toJsonSafe({
                    success: true,
                    id: tenant.id,
                    name: tenant.name,
                    isActive: tenant.isActive,
                    changed: false,
                }),
=======
                toJsonSafe({ success: true, id: tenant.id, isActive: tenant.isActive, changed: false }),
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            );
        }

        const updated = await prisma.tenant.update({
            where: { id: tenantId },
            data: { isActive: body.isActive },
<<<<<<< HEAD
            select: {
                id: true,
                name: true,
                isActive: true,
            },
=======
            select: { id: true, name: true, isActive: true },
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        });

        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            entityType: "TENANT",
            entityId: tenantId,
            action: body.isActive ? "TENANT_ACTIVATED" : "TENANT_DEACTIVATED",
            details: `Tenant "${tenant.name}" ${body.isActive ? "activated" : "deactivated"} by platform admin`,
<<<<<<< HEAD
            metadataJson: {
                previousStatus: tenant.isActive,
                newStatus: body.isActive,
            },
            request,
        });

        return NextResponse.json(
            toJsonSafe({
                success: true,
                ...updated,
                changed: true,
            }),
        );
    } catch (error) {
        return handleApiError(error);
    }
}
=======
            metadataJson: { previousStatus: tenant.isActive, newStatus: body.isActive },
            request,
        });

        return NextResponse.json(toJsonSafe({ success: true, ...updated, changed: true }));
    } catch (error) {
        return handleApiError(error);
    }
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
