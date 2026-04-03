import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { platformRoleForUserRole } from "@/lib/server/roles";
import { resolveTenantBrandingWithProfile } from "@/lib/server/tenantBranding";
import { getTenantBrandingProfile } from "@/lib/server/tenantBrandingStore";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

<<<<<<< HEAD
    const user = await getPrisma().user.findUnique({
=======
    const user = await prisma.user.findUnique({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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

    const [subscription, tenant, brandingProfile] = await Promise.all([
      effectiveTenantId
<<<<<<< HEAD
        ? getPrisma().subscription.findFirst({
=======
        ? prisma.subscription.findFirst({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
          where: { tenantId: effectiveTenantId },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        })
        : null,
      effectiveTenantId
<<<<<<< HEAD
        ? getPrisma().tenant.findUnique({
=======
        ? prisma.tenant.findUnique({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
          where: { id: effectiveTenantId },
          select: {
            id: true,
            name: true,
            code: true,
            metadata: true,
          },
        })
        : null,
      effectiveTenantId ? getTenantBrandingProfile(effectiveTenantId) : null,
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
        tenant: tenant ? resolveTenantBrandingWithProfile(tenant, brandingProfile) : undefined,
        user,
        subscription,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
