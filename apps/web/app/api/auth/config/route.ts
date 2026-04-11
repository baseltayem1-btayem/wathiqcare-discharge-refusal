import { NextRequest } from "next/server";
import { verifyAndDecodeJwt } from "@/lib/server/jwt";
import { jsonSuccess } from "@/lib/server/http";
import { getSessionCookieName } from "@/lib/server/sessionCookie";
import {
  DEFAULT_TENANT_AUTH_CONFIG,
  normalizeTenantAuthConfig,
  readTenantAuthConfig,
  resolveTenantAuthConfigByEmail,
} from "@/lib/server/tenant-auth-config";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim() ?? "";

  const token = request.cookies.get(getSessionCookieName())?.value;
  let tenantIdFromToken: string | null = null;

  if (token) {
    try {
      const payload = verifyAndDecodeJwt(token) as { tenant_id?: unknown };
      tenantIdFromToken = typeof payload.tenant_id === "string" ? payload.tenant_id : null;
    } catch {
      tenantIdFromToken = null;
    }
  }

  if (tenantIdFromToken) {
    const authConfig = await readTenantAuthConfig(tenantIdFromToken);
    return jsonSuccess({
      tenantId: tenantIdFromToken,
      auth_config: normalizeTenantAuthConfig(authConfig),
    });
  }

  if (!email) {
    return jsonSuccess({
      tenantId: null,
      auth_config: { ...DEFAULT_TENANT_AUTH_CONFIG },
    });
  }

  const resolved = await resolveTenantAuthConfigByEmail(email);

  return jsonSuccess({
    tenantId: resolved.tenantId,
    auth_config: resolved.authConfig,
  });
}
