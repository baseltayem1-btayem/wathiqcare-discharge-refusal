import { MembershipStatus, UserType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

/**
 * GET /api/platform/users
 * List all platform-level users (platform_admin, platform_operator, support_viewer).
 * Gated: PLATFORM_ADMIN only.
 */
export async function GET(request: NextRequest) {
    try {
        const prisma = getPrisma();

        await requirePlatformAccess(request);

        const platformTenant = await getPrisma().tenant.findUnique({
            where: { code: "wathiqcare" },
            select: { id: true },
        });

        if (!platformTenant) {
            throw new ApiError(500, "Platform tenant not found");
        }

        const users = await getPrisma().user.findMany({
            where: {
                OR: [
                    { userType: UserType.PLATFORM_ADMIN },
                    {
                        tenantId: platformTenant.id,
                        role: {
                            in: [
                                "platform_superadmin",
                                "platform_admin",
                                "platform_operator",
                                "support_viewer",
                            ],
                        },
                    },
                ],
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                userType: true,
                isActive: true,
                status: true,
                lastLoginAt: true,
                createdAt: true,
                memberships: {
                    where: {
                        tenantId: platformTenant.id,
                        status: MembershipStatus.ACTIVE,
                    },
                    select: {
                        role: true,
                        status: true,
                    },
                    take: 1,
                },
            },
            orderBy: { createdAt: "desc" },
            take: 200,
        });

        return NextResponse.json(
            toJsonSafe({
                success: true,
                users,
            }),
        );
    } catch (error) {
        return handleApiError(error);
    }
}
