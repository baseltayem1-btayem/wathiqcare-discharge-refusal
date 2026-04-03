import { MembershipStatus, UserType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
<<<<<<< HEAD
import { getPrisma } from "@/lib/server/prisma";
=======
import { prisma } from "@/lib/server/prisma";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

export const runtime = "nodejs";

/**
 * GET /api/platform/users
 * List all platform-level users (platform_admin, platform_operator, support_viewer).
 * Gated: PLATFORM_ADMIN only.
 */
export async function GET(request: NextRequest) {
    try {
<<<<<<< HEAD
        const prisma = getPrisma();

        await requirePlatformAccess(request);

        const platformTenant = await getPrisma().tenant.findUnique({
=======
        await requirePlatformAccess(request);

        const platformTenant = await prisma.tenant.findUnique({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            where: { code: "wathiqcare" },
            select: { id: true },
        });

        if (!platformTenant) {
            throw new ApiError(500, "Platform tenant not found");
        }

<<<<<<< HEAD
        const users = await getPrisma().user.findMany({
=======
        const users = await prisma.user.findMany({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            where: {
                OR: [
                    { userType: UserType.PLATFORM_ADMIN },
                    {
                        tenantId: platformTenant.id,
<<<<<<< HEAD
                        role: {
                            in: [
                                "platform_superadmin",
                                "platform_admin",
                                "platform_operator",
                                "support_viewer",
                            ],
                        },
=======
                        role: { in: ["platform_superadmin", "platform_admin", "platform_operator", "support_viewer"] },
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
<<<<<<< HEAD
                    where: {
                        tenantId: platformTenant.id,
                        status: MembershipStatus.ACTIVE,
                    },
                    select: {
                        role: true,
                        status: true,
                    },
=======
                    where: { tenantId: platformTenant.id, status: MembershipStatus.ACTIVE },
                    select: { role: true, status: true },
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
                    take: 1,
                },
            },
            orderBy: { createdAt: "desc" },
            take: 200,
        });

<<<<<<< HEAD
        return NextResponse.json(
            toJsonSafe({
                success: true,
                users,
            }),
        );
=======
        return NextResponse.json(toJsonSafe({ success: true, users }));
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    } catch (error) {
        return handleApiError(error);
    }
}
