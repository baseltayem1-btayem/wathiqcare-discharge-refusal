
import { TenantRoleStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { hasPlatformAccess, requireAuth, requireTenantAccess, requireTenantPermission } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

type RouteContext = {
    params: Promise<{ tenantId: string; roleId: string }>;
};

type UpdateTenantRolePayload = {
    name?: string;
    description?: string | null;
    status?: string;
};

function parseStatus(input: unknown): TenantRoleStatus | null {
    if (typeof input !== "string") {
        return null;
    }
    const normalized = input.trim().toUpperCase();
    if (
        normalized === TenantRoleStatus.ACTIVE ||
        normalized === TenantRoleStatus.INACTIVE
    ) {
        return normalized as TenantRoleStatus;
    }
    return null;
}

async function authorizeRoleManagement(request: NextRequest, tenantId: string) {
    const auth = await requireAuth(request);
    if (!hasPlatformAccess(auth)) {
        await requireTenantPermission(request, tenantId, "roles.manage");
    } else {
        await requireTenantAccess(request, tenantId);
    }
    return auth;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const prisma = getPrisma();
        const { tenantId, roleId } = await params;
        const auth = await authorizeRoleManagement(request, tenantId);
        const payload = (await request.json().catch(() => null)) as UpdateTenantRolePayload | null;
        if (!payload) {
            throw new ApiError(400, "Invalid JSON body");
        }
        const data: {
            name?: string;
            description?: string | null;
            status?: TenantRoleStatus;
        } = {};
        if (typeof payload.name === "string") {
            const name = payload.name.trim();
            if (!name) {
                throw new ApiError(400, "name cannot be empty");
            }
            data.name = name;
        }
        if (payload.description === null || typeof payload.description === "string") {
            data.description = payload.description ? payload.description.trim() : null;
        }
        const status = parseStatus(payload.status);
        if (status) {
            data.status = status;
        }
        if (Object.keys(data).length === 0) {
            throw new ApiError(400, "No fields to update");
        }
        const role = await prisma.tenantRole.update({
            where: {
                id: roleId,
                tenantId,
            },
            data,
        });
        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            entityType: "tenant_role",
            entityId: role.id,
            action: "tenant_role_updated",
            details: `Role ${role.code} updated`,
            metadataJson: {
                updatedFields: Object.keys(data),
            },
            request,
        });
        return NextResponse.json(toJsonSafe(role));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const prisma = getPrisma();
        const { tenantId, roleId } = await params;
        const auth = await authorizeRoleManagement(request, tenantId);
        const role = await prisma.tenantRole.findFirst({
            where: {
                id: roleId,
                tenantId,
            },
            select: {
                id: true,
                code: true,
                name: true,
            },
        });
        if (!role) {
            throw new ApiError(404, "Role not found");
        }
        const assignmentCount = await prisma.userRoleAssignment.count({
            where: {
                tenantId,
                tenantRoleId: role.id,
            },
        });
        if (assignmentCount > 0) {
            throw new ApiError(409, "Role is assigned to users and cannot be deleted");
        }
        await prisma.tenantRole.delete({
            where: {
                id: role.id,
            },
        });
        await writeAuditLog({
            tenantId,
            userId: auth.sub,
            entityType: "tenant_role",
            entityId: role.id,
            action: "tenant_role_deleted",
            details: `Role ${role.code} deleted`,
            metadataJson: {
                roleCode: role.code,
                roleName: role.name,
            },
            request,
        });
        return NextResponse.json(
            toJsonSafe({
                deleted: true,
                roleId: role.id,
            }),
        );
    } catch (error) {
        return handleApiError(error);
    }
}
