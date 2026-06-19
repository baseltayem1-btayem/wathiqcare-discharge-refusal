import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { createSignedJwt } from "@/lib/server/jwt";
import { verifyPassword } from "@/lib/server/password";
import { getSessionCookieName, buildSessionCookieOptions } from "@/lib/server/sessionCookie";
import { buildPostLoginRedirect, normalizeLoginIdentifier } from "@/lib/server/password-login-policy";
import { platformRoleForUserRole } from "@/lib/server/roles";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function toJwtUserType(userType: string | null | undefined): "platform_admin" | "tenant_admin" | "tenant_user" {
  const normalized = (userType || "").trim().toUpperCase();

  if (normalized === "PLATFORM_ADMIN") {
    return "platform_admin";
  }

  if (normalized === "TENANT_ADMIN") {
    return "tenant_admin";
  }

  return "tenant_user";
}

function safeRedirectPath(value: FormDataEntryValue | string | null | undefined): string | null {
  const raw = typeof value === "string" ? value.trim() : "";

  if (!raw) {
    return null;
  }

  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return null;
  }

  return raw;
}

function buildLoginRedirect(request: NextRequest, error: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const email = normalizeLoginIdentifier(String(formData.get("email") || ""));
    const password = String(formData.get("password") || "");
    const requestedNext = safeRedirectPath(formData.get("next"));

    if (!email || !password) {
      return buildLoginRedirect(request, "missing_credentials");
    }

    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        userType: true,
        tenantId: true,
        hashedPassword: true,
        isActive: true,
        primaryTenant: {
          select: {
            code: true,
            isActive: true,
          },
        },
      },
    });

    if (!user || !user.hashedPassword) {
      return buildLoginRedirect(request, "invalid_credentials");
    }

    const passwordValid = await verifyPassword(password, user.hashedPassword);

    if (!passwordValid) {
      return buildLoginRedirect(request, "invalid_credentials");
    }

    if (!user.isActive) {
      return buildLoginRedirect(request, "inactive_user");
    }

    const now = Math.floor(Date.now() / 1000);
    const jwtUserType = toJwtUserType(user.userType);
    const platformRole =
      jwtUserType === "platform_admin"
        ? platformRoleForUserRole(user.role) ?? "platform_admin"
        : platformRoleForUserRole(user.role);

    const token = createSignedJwt({
      sub: user.id,
      email: user.email,
      role: user.role || undefined,
      user_type: jwtUserType,
      tenant_id: user.tenantId || undefined,
      tenant_code: user.primaryTenant?.code ?? null,
      platform_role: platformRole,
      iat: now,
      exp: now + SESSION_MAX_AGE_SECONDS,
    });

    const fallbackRedirect = buildPostLoginRedirect(user.role, user.email);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = requestedNext || fallbackRedirect || "/modules";
    redirectUrl.search = "";

    const response = NextResponse.redirect(redirectUrl, 303);

    response.cookies.set(
      getSessionCookieName(),
      token,
      buildSessionCookieOptions(SESSION_MAX_AGE_SECONDS, request),
    );

    return response;
  } catch (error) {
    console.error("POST /api/auth/login failed", error);
    return buildLoginRedirect(request, "login_failed");
  }
}
