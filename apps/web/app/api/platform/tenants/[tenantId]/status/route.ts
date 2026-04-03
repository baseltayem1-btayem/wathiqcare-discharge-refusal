import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{ tenantId: string }>;
};

type PatchTenantStatusPayload = {
    isActive?: boolean;
};

/**
 * PATCH /api/platform/tenants/[tenantId]/status
 * Activate or deactivate a tenant.
 * Gated: PLATFORM_ADMIN only.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const prisma = getPrisma();

        const auth = await requirePlatformAccess(request);
        const { tenantId } = await context.params;

        if (!tenantId) {
            throw new ApiError(400, "tenantId is required");
        }

        const body = (await request.json().catch(() => null)) as PatchTenantStatusPayload | null;

        if (!body || typeof body.isActive !== "boolean") {
            throw new ApiError(400, "body.isActive (boolean) is required");
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                id: true,
                name: true,
                isActive: true,
            },
        });

        if (!tenant) {
            throw new ApiError(404, "Tenant not found");
        }

        if (tenant.isActive === body.isActive) {
            return NextResponse.json(
                toJsonSafe({
                    success: true,
                    id: tenant.id,
                    name: tenant.name,
                    isActive: tenant.isActive,
                    changed: false,
                }),
            );
        }

        const updated = await prisma.tenant.update({
            where: { id: tenantId },
            data: { isActive: body.isActive },
            select: {
                id: true,
                name: true,
                isActive: true,
            },
        });

        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            entityType: "TENANT",
            entityId: tenantId,
            action: body.isActive ? "TENANT_ACTIVATED" : "TENANT_DEACTIVATED",
            details: `Tenant "${tenant.name}" ${body.isActive ? "activated" : "deactivated"} by platform admin`,
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