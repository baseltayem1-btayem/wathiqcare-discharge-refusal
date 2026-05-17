import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAndDecodeJwt } from "@/lib/server/jwt";
import { getSessionCookieName } from "@/lib/server/sessionCookie";
import { getPrisma } from "@/lib/server/prisma";
import { platformRoleForUserRole } from "@/lib/server/roles";
import { canAccessModule, resolveModuleKeyFromPath } from "@/lib/modules/catalog";
import { logRuntimeIncident, recordRuntimeMetric } from "@/lib/server/runtime-observability";

const FALLBACK_COOKIE_NAMES = ["wathiqcare_access_token", "token"] as const;
const prisma = () => getPrisma();

export type PageAuthClaims = {
  sub: string;
  email?: string;
  role?: string;
  user_type?: "platform_admin" | "tenant_admin" | "tenant_user";
  tenant_id?: string;
  tenant_code?: string;
  platform_role?: "platform_superadmin" | "platform_admin" | null;
  iat?: number;
  exp?: number;
};

async function resolveDbBackedPageClaims(claims: PageAuthClaims, nextPath?: string): Promise<PageAuthClaims> {
  const user = await prisma().user.findUnique({
    where: { id: claims.sub },
    include: {
      primaryTenant: {
        select: {
          id: true,
          code: true,
          isActive: true,
        },
      },
      memberships: {
        where: { status: "ACTIVE" },
        select: { tenantId: true },
      },
    },
  });

  if (!user || !user.isActive) {
    logRuntimeIncident({
      module: "session",
      type: "AUTH_FAILURE",
      details: {
        reason: !user ? "page_auth_user_missing" : "page_auth_user_inactive",
        userId: claims.sub,
        nextPath: nextPath ?? null,
      },
    });
    redirectToLogin(nextPath, "session_invalid");
  }

  if (claims.tenant_id && user.tenantId !== claims.tenant_id) {
    logRuntimeIncident({
      module: "session",
      type: "AUTH_FAILURE",
      details: {
        reason: "page_auth_tenant_claim_mismatch",
        userId: user.id,
        claimedTenantId: claims.tenant_id,
        actualTenantId: user.tenantId,
        nextPath: nextPath ?? null,
      },
    });
    redirectToLogin(nextPath, "session_invalid");
  }

  const platformRole =
    user.userType === "PLATFORM_ADMIN"
      ? platformRoleForUserRole(user.role) ?? "platform_admin"
      : platformRoleForUserRole(user.role);
  const tenantActive = user.primaryTenant?.isActive === true;
  const membershipActive = user.memberships.some((item) => item.tenantId === user.tenantId);

  if (!platformRole && !tenantActive) {
    logRuntimeIncident({
      module: "session",
      type: "AUTH_FAILURE",
      details: {
        reason: "page_auth_tenant_inactive",
        userId: user.id,
        tenantId: user.tenantId,
        nextPath: nextPath ?? null,
      },
    });
    redirectToLogin(nextPath, "session_invalid");
  }

  if (!platformRole && !membershipActive) {
    logRuntimeIncident({
      module: "session",
      type: "AUTH_FAILURE",
      details: {
        reason: "page_auth_membership_inactive",
        userId: user.id,
        tenantId: user.tenantId,
        nextPath: nextPath ?? null,
      },
    });
    redirectToLogin(nextPath, "session_invalid");
  }

  return {
    ...claims,
    email: user.email,
    role: user.role,
    user_type:
      user.userType === "PLATFORM_ADMIN"
        ? "platform_admin"
        : user.userType === "TENANT_ADMIN"
          ? "tenant_admin"
          : "tenant_user",
    tenant_id: user.tenantId,
    tenant_code: user.primaryTenant?.code,
    platform_role: platformRole,
  };
}

function readSessionTokenFromCookies(cookieStore: Awaited<ReturnType<typeof cookies>>): string | null {
  const primary = cookieStore.get(getSessionCookieName())?.value?.trim();
  if (primary) {
    return primary;
  }

  for (const cookieName of FALLBACK_COOKIE_NAMES) {
    const token = cookieStore.get(cookieName)?.value?.trim();
    if (token) {
      return token;
    }
  }

  return null;
}

function redirectToLogin(nextPath: string | undefined, reason: string): never {
  const params = new URLSearchParams();
  if (nextPath) {
    params.set("next", nextPath);
  }
  params.set("reason", reason);
  redirect(`/login?${params.toString()}`);
}

export async function requirePageSessionOrRedirect(nextPath?: string): Promise<void> {
  await requirePageAuthClaimsOrRedirect(nextPath);
}

export async function requirePageAuthClaimsOrRedirect(nextPath?: string): Promise<PageAuthClaims> {
  const startedAt = Date.now();
  let token: string | null = null;

  try {
    const cookieStore = await cookies();
    token = readSessionTokenFromCookies(cookieStore);
  } catch (error) {
    logRuntimeIncident({
      module: "session",
      type: "AUTH_FAILURE",
      error,
      details: {
        reason: "cookie_read_failed",
        nextPath: nextPath ?? null,
      },
    });
    redirectToLogin(nextPath, "session_cookie_error");
  }

  if (!token) {
    logRuntimeIncident({
      module: "session",
      type: "AUTH_FAILURE",
      details: {
        reason: "session_cookie_missing",
        nextPath: nextPath ?? null,
      },
    });
    redirectToLogin(nextPath, "session_missing");
  }

  try {
    const tokenClaims = verifyAndDecodeJwt(token) as PageAuthClaims;

    if (!tokenClaims || typeof tokenClaims.sub !== "string" || !tokenClaims.sub.trim()) {
      logRuntimeIncident({
        module: "session",
        type: "AUTH_FAILURE",
        details: {
          reason: "session_claims_invalid",
          nextPath: nextPath ?? null,
        },
      });
      redirectToLogin(nextPath, "session_invalid_claims");
    }

    const claims = await resolveDbBackedPageClaims(tokenClaims, nextPath);

    if (nextPath) {
      const moduleKey = resolveModuleKeyFromPath(nextPath);
      if (moduleKey) {
        const allowed = canAccessModule(moduleKey, {
          role: claims.role ?? null,
          platformRole: claims.platform_role ?? null,
        });

        if (!allowed) {
          redirect("/modules");
        }
      }
    }

    recordRuntimeMetric("session_validation_duration_ms", Date.now() - startedAt);
    return claims;
  } catch (error) {
    logRuntimeIncident({
      module: "session",
      type: "AUTH_FAILURE",
      error,
      details: {
        reason: "session_invalid",
        nextPath: nextPath ?? null,
      },
    });
    redirectToLogin(nextPath, "session_invalid");
  }
}
