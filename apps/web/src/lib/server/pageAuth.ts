import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAndDecodeJwt } from "@/lib/server/jwt";
import { getSessionCookieName } from "@/lib/server/sessionCookie";
import { canAccessModule, resolveModuleKeyFromPath } from "@/lib/modules/catalog";

const FALLBACK_COOKIE_NAMES = ["wathiqcare_access_token", "token"] as const;

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

export async function requirePageSessionOrRedirect(nextPath?: string): Promise<void> {
  await requirePageAuthClaimsOrRedirect(nextPath);
}

export async function requirePageAuthClaimsOrRedirect(nextPath?: string): Promise<PageAuthClaims> {
  let token: string | null = null;

  try {
    const cookieStore = await cookies();
    token = readSessionTokenFromCookies(cookieStore);
  } catch (error) {
    console.error("PAGE_AUTH_COOKIE_READ_ERROR", { nextPath, error });
    const nextQuery = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${nextQuery}`);
  }

  if (!token) {
    const nextQuery = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${nextQuery}`);
  }

  try {
    const claims = verifyAndDecodeJwt(token) as PageAuthClaims;

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

    return claims;
  } catch (error) {
    console.error("PAGE_AUTH_RUNTIME_ERROR", { nextPath, error });
    const nextQuery = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${nextQuery}`);
  }
}
