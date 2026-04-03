import { TenantRoleStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
<<<<<<< HEAD
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
import {
    bootstrapTenantAdminConfiguration,
    slugRoleCode,
} from "@/lib/server/tenant-admin";

type RouteContext = {
    params: Promise<{ tenantId: string }>;
};
=======
import { hasPlatformAccess, requireAuth, requireTenantAccess, requireTenantPermission } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { bootstrapTenantAdminConfiguration, slugRoleCode } from "@/lib/server/tenant-admin";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

function parseStatus(input: unknown): TenantRoleStatus {
    if (typeof input !== "string") {
        return TenantRoleStatus.ACTIVE;
    }
<<<<<<< HEAD

    const normalized = input.trim().toUpperCase();

    return normalized === TenantRoleStatus.INACTIVE
        ? TenantRoleStatus.INACTIVE
        : TenantRoleStatus.ACTIVE;
}

async function authorize(
    request: NextRequest,
    tenantId: string,
    permissions: string | string[],
) {
    const auth = await requireAuth(request);

    if (hasPlatformAccess(auth)) {
        await requireTenantAccess(request, tenantId);
    } else {
        await requireTenantPermission(request, tenantId, permissions);
    }

    return auth;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const prisma = getPrisma();

        const { tenantId } = await params;
        await authorize(request, tenantId, ["roles.read", "permissions.read"]);
=======
    const normalized = input.trim().toUpperCase();
    return normalized === TenantRoleStatus.INACTIVE ? TenantRoleStatus.INACTIVE : TenantRoleStatus.ACTIVE;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> },
) {
    try {
        const { tenantId } = await params;
        const auth = await requireAuth(request);
        if (!hasPlatformAccess(auth)) {
            await requireTenantPermission(request, tenantId, ["roles.read", "permissions.read"]);
        } else {
            await requireTenantAccess(request, tenantId);
        }
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

        await bootstrapTenantAdminConfiguration(tenantId);

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
                orderBy: [{ status: "asc" }, { name: "asc" }],
            }),
            prisma.permission.findMany({
                where: { isActive: true },
                orderBy: [{ module: "asc" }, { key: "asc" }],
            }),
        ]);

        return NextResponse.json(toJsonSafe({ roles, permissions }));
    } catch (error) {
        return handleApiError(error);
    }
}

<<<<<<< HEAD
export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const prisma = getPrisma();

        const { tenantId } = await params;
        const auth = await authorize(request, tenantId, "roles.manage");

        const payload = (await request.json().catch(() => null)) as
            | {
                  code?: string;
                  name?: string;
                  description?: string;
                  cloneFromRoleId?: string;
                  status?: string;
              }
=======
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> },
) {
    try {
        const { tenantId } = await params;
        const auth = await requireAuth(request);
        if (!hasPlatformAccess(auth)) {
            await requireTenantPermission(request, tenantId, "roles.manage");
        } else {
            await requireTenantAccess(request, tenantId);
        }

        const payload = (await request.json().catch(() => null)) as
            | {
                code?: string;
                name?: string;
                description?: string;
                cloneFromRoleId?: string;
                status?: string;
            }
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            | null;

        const name = payload?.name?.trim() ?? "";
        const code = slugRoleCode(payload?.code || name);
<<<<<<< HEAD

=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        if (!name || !code) {
            throw new ApiError(400, "Role name is required");
        }

        const status = parseStatus(payload?.status);

        const role = await prisma.$transaction(async (tx) => {
            const createdRole = await tx.tenantRole.create({
                data: {
                    tenantId,
                    code,
                    name,
                    description: payload?.description?.trim() || null,
                    status,
                    isTemplate: false,
                    clonedFromRoleId: payload?.cloneFromRoleId || null,
                },
            });

            if (payload?.cloneFromRoleId) {
                const sourceRole = await tx.tenantRole.findFirst({
                    where: {
                        id: payload.cloneFromRoleId,
                        tenantId,
                    },
                    include: {
                        permissions: true,
                    },
                });

                if (!sourceRole) {
                    throw new ApiError(404, "Clone source role not found");
                }

                if (sourceRole.permissions.length > 0) {
                    await tx.tenantRolePermission.createMany({
                        data: sourceRole.permissions.map((item) => ({
                            tenantRoleId: createdRole.id,
                            permissionId: item.permissionId,
                            allowed: item.allowed,
                        })),
                    });
                }
            }

            return tx.tenantRole.findUniqueOrThrow({
                where: { id: createdRole.id },
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
            entityId: role.id,
            action: "tenant_role_created",
            details: `Role ${role.code} created`,
            metadataJson: {
                code: role.code,
                cloneFromRoleId: payload?.cloneFromRoleId || null,
            },
            request,
        });

        return NextResponse.json(toJsonSafe(role), { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
<<<<<<< HEAD
}
=======
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
