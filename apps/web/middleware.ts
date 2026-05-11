import { NextRequest, NextResponse } from "next/server";
import { INFORMED_CONSENTS_ALLOWED_ROLE_ALIASES } from "@/lib/modules/informed-consents-release";

const DEFAULT_SESSION_COOKIE_NAME = "wathiqcare_access_token";
const FALLBACK_COOKIE_NAMES = [DEFAULT_SESSION_COOKIE_NAME, "token"] as const;
const ALLOWED_ROLE_ALIASES: ReadonlySet<string> = new Set(INFORMED_CONSENTS_ALLOWED_ROLE_ALIASES);

function isTruthyEnvFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function getSessionToken(request: NextRequest): string | null {
  const configuredCookieName = process.env.AUTH_COOKIE_NAME?.trim();
  const primaryCookieName = configuredCookieName || DEFAULT_SESSION_COOKIE_NAME;
  const configuredToken = request.cookies.get(primaryCookieName)?.value?.trim();
  if (configuredToken) return configuredToken;

  if (configuredCookieName) {
    return null;
  }

  for (const cookieName of FALLBACK_COOKIE_NAMES) {
    const token = request.cookies.get(cookieName)?.value?.trim();
    if (token) return token;
  }

  return null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const segments = token.split(".");
  if (segments.length < 2) return null;

  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeRole(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function hasAllowedInformedConsentRole(payload: Record<string, unknown> | null): boolean {
  if (!payload) return false;
  const platformRole = normalizeRole(payload.platform_role);
  if (platformRole === "platform_admin" || platformRole === "platform_superadmin") {
    return true;
  }

  const role = normalizeRole(payload.role);
  return ALLOWED_ROLE_ALIASES.has(role);
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export function middleware(request: NextRequest) {
  const enabled = isTruthyEnvFlag(process.env.ENABLE_INFORMED_CONSENTS, false);
  const pathname = request.nextUrl.pathname;
  const apiPath = isApiPath(pathname);

  if (!enabled) {
    if (apiPath) {
      return NextResponse.json({ ok: false, error: "Informed Consents module is disabled." }, { status: 503 });
    }
    return NextResponse.rewrite(new URL("/404", request.url));
  }

  const token = getSessionToken(request);
  if (!token) {
    if (apiPath) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!hasAllowedInformedConsentRole(decodeJwtPayload(token))) {
    if (apiPath) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/modules", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/modules/informed-consents/:path*",
    "/api/informed-consents/:path*",
  ],
};
