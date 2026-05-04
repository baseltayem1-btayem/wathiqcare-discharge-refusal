import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError, jsonSuccess } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { platformRoleForUserRole } from "@/lib/server/roles";
import { getStepUpStatusFromRequest } from "@/lib/server/security-policy-service";
import { resolveTenantBrandingWithProfile } from "@/lib/server/tenantBranding";
import { getTenantBrandingProfile } from "@/lib/server/tenantBrandingStore";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    const prisma = getPrisma();
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
      return jsonSuccess({
        authenticated: true,
        claims: auth,
        platformRole: null,
        user: null,
      });
    }

    const effectiveTenantId = auth.tenant_id ?? user.tenantId;

    const [subscriptionResult, tenantResult, brandingResult] = await Promise.allSettled([
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
      effectiveTenantId ? getTenantBrandingProfile(effectiveTenantId) : null,
    ]);

    if (subscriptionResult.status === "rejected") {
      console.error("AUTH_ME_SUBSCRIPTION_FETCH_FAILED", subscriptionResult.reason);
    }
    if (tenantResult.status === "rejected") {
      console.error("AUTH_ME_TENANT_FETCH_FAILED", tenantResult.reason);
    }
    if (brandingResult.status === "rejected") {
      console.error("AUTH_ME_BRANDING_FETCH_FAILED", brandingResult.reason);
    }

    const subscription = subscriptionResult.status === "fulfilled" ? subscriptionResult.value : null;
    const tenant = tenantResult.status === "fulfilled" ? tenantResult.value : null;
    const brandingProfile = brandingResult.status === "fulfilled" ? brandingResult.value : null;

    const platformRole =
      auth.platform_role ??
      (user.userType === "PLATFORM_ADMIN" ? platformRoleForUserRole(user.role) ?? "platform_admin" : platformRoleForUserRole(user.role));
    const stepUp = await getStepUpStatusFromRequest({
      request,
      auth,
      tenantId: effectiveTenantId ?? "platform",
    });
    const userType =
      user.userType === "PLATFORM_ADMIN"
        ? "platform_admin"
        : user.userType === "TENANT_ADMIN"
          ? "tenant_admin"
          : "tenant_user";
    const homePath = userType === "platform_admin" ? "/platform" : "/dashboard";

    return jsonSuccess(
      toJsonSafe({
        authenticated: true,
        claims: auth,
        platformRole,
        userType,
        homePath,
        stepUp,
        tenant: tenant ? resolveTenantBrandingWithProfile(tenant, brandingProfile) : undefined,
        user,
        subscription,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
