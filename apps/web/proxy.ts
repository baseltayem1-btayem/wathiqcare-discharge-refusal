import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME || "wathiqcare_access_token";

const PLATFORM_ONLY_HOME = "/platform";
const TENANT_HOME = "/dashboard";

const PLATFORM_BLOCKED_PREFIXES = [
  "/dashboard",
  "/cases",
  "/emr",
  "/emr-integration",
  "/workflow",
  "/operations",
  "/admin",
  "/refusal-forms",
  "/legal-escalation",
  "/escalation-timeline",
  "/legal-case-file",
  "/audit-log",
  "/icd11-validator",
  "/consents",
  "/compliance",
  "/bundles",
  "/launch-status",
  "/tenant",
];

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      "=",
    );
    const payload = JSON.parse(atob(padded));

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return null;
    }

    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveUserType(
  payload: Record<string, unknown>,
): "platform_admin" | "tenant_admin" | "tenant_user" {
  const explicitType = payload.user_type;

  if (
    explicitType === "platform_admin" ||
    explicitType === "tenant_admin" ||
    explicitType === "tenant_user"
  ) {
    return explicitType;
  }

  const platformRole = payload.platform_role;
  if (platformRole === "platform_admin" || platformRole === "platform_superadmin") {
    return "platform_admin";
  }

  return "tenant_user";
}

function isPlatformBlockedPath(pathname: string): boolean {
  return PLATFORM_BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.next();
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return NextResponse.next();
  }

  const userType = resolveUserType(payload);

  if (userType === "platform_admin") {
    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = PLATFORM_ONLY_HOME;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (isPlatformBlockedPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = PLATFORM_ONLY_HOME;
      url.search = "";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = TENANT_HOME;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/platform" || pathname.startsWith("/platform/")) {
    const url = request.nextUrl.clone();
    url.pathname = TENANT_HOME;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};