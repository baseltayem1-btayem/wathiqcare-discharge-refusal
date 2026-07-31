import { canAccessModule, type ModuleKey } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect, type PageAuthClaims } from "@/lib/server/pageAuth";

export type InformedConsentsPageAccessResult =
  | { kind: "authenticated"; auth: PageAuthClaims }
  | { kind: "access_denied" };

export type InformedConsentsPageAuthDependencies = {
  requirePageAuthClaimsOrRedirect: typeof requirePageAuthClaimsOrRedirect;
  canAccessModule: typeof canAccessModule;
};

const defaultDeps: InformedConsentsPageAuthDependencies = {
  requirePageAuthClaimsOrRedirect,
  canAccessModule,
};

/**
 * Enforces the same server-side authentication and module RBAC boundary used
 * by the main informed-consents module pages. Anonymous callers are redirected
 * to /login with next/reason query parameters by the underlying page-auth
 * helper. Authenticated users without an informed-consents role are surfaced
 * as access_denied so the page can render an explicit 403 UI.
 */
export async function requireInformedConsentsPageAccess(
  nextPath: string,
  deps: InformedConsentsPageAuthDependencies = defaultDeps,
): Promise<InformedConsentsPageAccessResult> {
  const auth = await deps.requirePageAuthClaimsOrRedirect(nextPath);
  const allowed = deps.canAccessModule("informed-consents" as ModuleKey, {
    role: auth.role,
    platformRole: auth.platform_role,
  });

  if (!allowed) {
    return { kind: "access_denied" };
  }

  return { kind: "authenticated", auth };
}
