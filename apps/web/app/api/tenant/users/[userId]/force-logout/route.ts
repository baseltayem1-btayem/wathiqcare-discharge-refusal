import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { forceLogoutUserByAdmin } from "@/lib/server/admin-password-reset";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const prisma = getPrisma();
    const { userId } = await context.params;
    const auth = await requireAuth(request);
    const tenantId = auth.tenant_id;

    if (!tenantId || !userId) {
      throw new ApiError(400, "tenantId and userId are required");
    }

    if (!["tenant_admin", "tenant_owner"].includes((auth.role || "").toLowerCase())) {
      throw new ApiError(403, "Only tenant admins can force logout users");
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, email: true, tenantId: true },
    });

    if (!user) {
      throw new ApiError(404, "User not found in this tenant");
    }

    await forceLogoutUserByAdmin(prisma, user.id);

    await writeAuditLog({
      tenantId,
      userId: auth.sub,
      entityType: "USER",
      entityId: user.id,
      action: "USER_FORCE_LOGOUT_BY_ADMIN",
      details: `Tenant admin forced logout for ${user.email}`,
      metadataJson: { email: user.email },
      request,
    });

    return NextResponse.json({ success: true, message: "User sessions revoked", email: user.email });
  } catch (error) {
    return handleApiError(error);
  }
}