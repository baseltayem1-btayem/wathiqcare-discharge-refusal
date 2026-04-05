import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME || "wathiqcare_access_token";

const PLATFORM_HOME = "/platform";
const TENANT_HOME = "/dashboard";
const LOGIN_PATH = "/login";

const PUBLIC_PATHS = new Set([
  "/",
  LOGIN_PATH,
]);

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
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(padded));

    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
      return null;
    }

    return decoded as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isTokenExpired(payload: Record<string, unknown>): boolean {
  const exp = payload.exp;
  if (typeof exp !== "number") return true;

  const now = Math.floor(Date.now() / 1000);
  return exp <= now;
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

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  return false;
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.next();
  }

  const payload = decodeJwtPayload(token);

  if (!payload || isTokenExpired(payload)) {
    const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    clearSessionCookie(response);
    return response;
  }

  const userType = resolveUserType(payload);

  if (pathname === LOGIN_PATH) {
    return NextResponse.redirect(
      new URL(userType === "platform_admin" ? PLATFORM_HOME : TENANT_HOME, request.url),
    );
  }

  if (userType === "platform_admin") {
    if (isPlatformBlockedPath(pathname)) {
      return NextResponse.redirect(new URL(PLATFORM_HOME, request.url));
    }

    return NextResponse.next();
  }

  if (pathname === PLATFORM_HOME || pathname.startsWith(`${PLATFORM_HOME}/`)) {
    return NextResponse.redirect(new URL(TENANT_HOME, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};