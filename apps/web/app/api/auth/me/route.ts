import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { platformRoleForUserRole } from "@/lib/server/roles";
import { resolveTenantBranding } from "@/lib/server/tenantBranding";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                code: true,
                domain: true,
                timezone: true,
                country: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({
        authenticated: true,
        claims: auth,
        platformRole: null,
        user: null,
      });
    }

    const effectiveTenantId = auth.tenant_id ?? user.tenantId;

    const [subscription, tenant] = await Promise.all([
      effectiveTenantId
        ? prisma.subscription.findFirst({
          where: { tenantId: effectiveTenantId },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        })
        : null,
      effectiveTenantId
        ? prisma.tenant.findUnique({
          where: { id: effectiveTenantId },
          select: {
            id: true,
            name: true,
            code: true,
            metadata: true,
          },
        })
        : null,
    ]);

    const platformRole =
      auth.platform_role ??
      (user.userType === "PLATFORM_ADMIN" ? platformRoleForUserRole(user.role) ?? "platform_admin" : platformRoleForUserRole(user.role));
    const userType =
      user.userType === "PLATFORM_ADMIN"
        ? "platform_admin"
        : user.userType === "TENANT_ADMIN"
          ? "tenant_admin"
          : "tenant_user";
    const homePath = userType === "platform_admin" ? "/platform" : "/dashboard";

    return NextResponse.json(
      toJsonSafe({
        authenticated: true,
        claims: auth,
        platformRole,
        userType,
        homePath,
        tenant: tenant ? resolveTenantBranding(tenant) : null,
        user,
        subscription,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
