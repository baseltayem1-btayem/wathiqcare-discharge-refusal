import { NextRequest, NextResponse } from "next/server";
import { UserType } from "@/lib/server/prisma-enums";
import { requirePlatformAccess } from "@/lib/server/auth";
import { forceLogoutUserByAdmin } from "@/lib/server/admin-password-reset";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPlatformTenant } from "@/lib/server/platform-tenant";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

export const runtime = "nodejs";

const PLATFORM_USER_ROLES = ["platform_superadmin", "platform_admin", "platform_operator", "support_viewer"];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const auth = await requirePlatformAccess(request);
    const prisma = getPrisma();
    const { userId } = await context.params;

    if (!userId) {
      throw new ApiError(400, "User ID is required");
    }

    const platformTenant = await getPlatformTenant();
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        OR: [
          { userType: UserType.PLATFORM_ADMIN },
          { tenantId: platformTenant.id, role: { in: PLATFORM_USER_ROLES } },
        ],
      },
      select: { id: true, tenantId: true, email: true },
    });

    if (!user) {
      throw new ApiError(404, "Platform user not found");
    }

    await forceLogoutUserByAdmin(prisma, user.id);

    await writeAuditLog({
      tenantId: user.tenantId,
      userId: auth.sub,
      entityType: "USER",
      entityId: user.id,
      action: "PLATFORM_USER_FORCE_LOGOUT_BY_ADMIN",
      details: `Platform admin forced logout for ${user.email}`,
      metadataJson: { email: user.email },
      request,
    });

    return NextResponse.json({ success: true, message: "User sessions revoked", email: user.email });
  } catch (error) {
    return handleApiError(error);
  }
}