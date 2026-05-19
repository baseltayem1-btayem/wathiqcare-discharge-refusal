import { NextRequest, NextResponse } from "next/server";
import { UserType } from "@/lib/server/prisma-enums";
import { requirePlatformAccess } from "@/lib/server/auth";
import { setUserPasswordByAdmin } from "@/lib/server/admin-password-reset";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPlatformTenant } from "@/lib/server/platform-tenant";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

export const runtime = "nodejs";

type DirectResetPayload = {
    password?: string;
};

const PLATFORM_USER_ROLES = ["platform_superadmin", "platform_admin", "platform_operator", "support_viewer"];

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> },
) {
    try {
        const auth = await requirePlatformAccess(request);
        const prisma = getPrisma();
        const { userId } = await context.params;

        const payload = (await request.json().catch(() => null)) as DirectResetPayload | null;
        const password = payload?.password ?? "";

        if (!userId || !password) {
            throw new ApiError(400, "userId and password are required");
        }

        const platformTenant = await getPlatformTenant();
        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                OR: [
                    { userType: UserType.PLATFORM_ADMIN },
                    {
                        tenantId: platformTenant.id,
                        role: { in: PLATFORM_USER_ROLES },
                    },
                ],
            },
            select: {
                id: true,
                email: true,
                tenantId: true,
            },
        });

        if (!user) {
            throw new ApiError(404, "Platform user not found");
        }

        await setUserPasswordByAdmin(prisma, user.id, password);

        await writeAuditLog({
            tenantId: user.tenantId,
            userId: auth.sub,
            entityType: "USER",
            entityId: user.id,
            action: "PLATFORM_PASSWORD_RESET_SET_BY_ADMIN",
            details: `Password set directly by platform admin for ${user.email}`,
            metadataJson: {
                mode: "direct",
                email: user.email,
            },
            request,
        });

        return NextResponse.json({
            success: true,
            message: "Password updated successfully",
            email: user.email,
        });
    } catch (error) {
        return handleApiError(error);
    }
}