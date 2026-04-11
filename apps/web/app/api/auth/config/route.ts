import { NextRequest, NextResponse } from "next/server";
import { verifyAndDecodeJwt } from "@/lib/server/jwt";
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
    return NextResponse.json({
      tenantId: tenantIdFromToken,
      auth_config: normalizeTenantAuthConfig(authConfig),
    });
  }

  if (!email) {
    return NextResponse.json({
      tenantId: null,
      auth_config: { ...DEFAULT_TENANT_AUTH_CONFIG },
    });
  }

  const resolved = await resolveTenantAuthConfigByEmail(email);

  return NextResponse.json({
    tenantId: resolved.tenantId,
    auth_config: resolved.authConfig,
  });
}
