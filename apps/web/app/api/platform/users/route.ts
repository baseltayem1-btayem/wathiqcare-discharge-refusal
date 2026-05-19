import { MembershipStatus, UserType } from "@/lib/server/prisma-enums";
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPlatformTenant } from "@/lib/server/platform-tenant";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

/**
 * GET /api/platform/users
 * List all platform-level users (platform_admin, platform_operator, support_viewer).
 * Gated: PLATFORM_ADMIN only.
 */
export async function GET(request: NextRequest) {
    try {
        await requirePlatformAccess(request);
        const prisma = getPrisma();
        const platformTenant = await getPlatformTenant();
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { userType: UserType.PLATFORM_ADMIN },
                    {
                        tenantId: platformTenant.id,
                        role: { in: ["platform_superadmin", "platform_admin", "platform_operator", "support_viewer"] },
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
                    where: { tenantId: platformTenant.id, status: MembershipStatus.ACTIVE },
                    select: { role: true, status: true },
                    take: 1,
                },
            },
            orderBy: { createdAt: "desc" },
            take: 200,
        });
        return NextResponse.json(toJsonSafe({ success: true, users }));
    } catch (error) {
        return handleApiError(error);
    }
}
