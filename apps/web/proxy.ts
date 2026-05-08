import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "wathiqcare_access_token";
const LANGUAGE_COOKIE_NAME = "wathiqcare_lang";
const SUPPORTED_LOCALES = ["ar", "en"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = "ar";
const EDGE_PROTECTED_PREFIXES = [
  "/modules",
  "/dashboard",
  "/platform",
  "/cases",
  "/tenant",
  "/admin",
  "/operations",
  "/reports",
  "/compliance",
  "/archive",
  "/escalation-timeline",
  "/consents",
  "/bundles",
  "/refusal-forms",
  "/audit-log",
  "/emr-integration",
  "/icd11-validator",
  "/launch-status",
  "/legal-case-file",
  "/legal-alerts",
  "/legal-escalation",
  "/dashboards",
] as const;
const PLATFORM_ONLY_PREFIXES = ["/platform"] as const;
const PLATFORM_BLOCKED_PREFIXES = [
  "/dashboard",
  "/cases",
  "/tenant",
  "/admin",
  "/operations",
  "/reports",
  "/compliance",
  "/archive",
  "/escalation-timeline",
  "/consents",
  "/bundles",
  "/refusal-forms",
  "/audit-log",
  "/emr-integration",
  "/icd11-validator",
  "/launch-status",
  "/legal-case-file",
  "/legal-alerts",
  "/legal-escalation",
  "/dashboards",
] as const;

function isTruthyEnv(value: string | undefined): boolean {
  const normalized = (value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function shouldAllowPlatformAdminCaseAccess(): boolean {
  if (isTruthyEnv(process.env.ALLOW_PLATFORM_ADMIN_CASE_ACCESS)) {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}

function splitLocaleFromPath(pathname: string): { locale: Locale | null; pathWithoutLocale: string } {
  for (const locale of SUPPORTED_LOCALES) {
    if (pathname === `/${locale}`) {
      return { locale, pathWithoutLocale: "/" };
    }

    if (pathname.startsWith(`/${locale}/`)) {
      const stripped = pathname.slice(locale.length + 1);
      return {
        locale,
        pathWithoutLocale: stripped.startsWith("/") ? stripped : `/${stripped}`,
      };
    }
  }

  return { locale: null, pathWithoutLocale: pathname };
}

function buildLocalizedPath(path: string, locale: Locale | null): string {
  if (!locale || path.startsWith(`/${locale}/`) || path === `/${locale}`) {
    return path;
  }

  if (path === "/") {
    return `/${locale}`;
  }

  return `/${locale}${path}`;
}

type DecodedSessionClaims = {
  user_type?: string;
};

function decodeSessionClaims(token: string | undefined): DecodedSessionClaims | null {
  if (!token) {
    return null;
  }

  const segments = token.split(".");
  if (segments.length < 2) {
    return null;
  }

  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(padded);
    return JSON.parse(json) as DecodedSessionClaims;
  } catch {
    return null;
  }
}

function detectLocale(request: NextRequest): Locale {
  const cookie = request.cookies.get(LANGUAGE_COOKIE_NAME)?.value;
  if (cookie === "ar" || cookie === "en") {
    return cookie;
  }

  const acceptLang = request.headers.get("accept-language") || "";
  if (acceptLang.toLowerCase().startsWith("en")) {
    return "en";
  }

  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { locale, pathWithoutLocale } = splitLocaleFromPath(pathname);
  const alreadyLocale = SUPPORTED_LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/${detectLocale(request)}`;
    return NextResponse.redirect(url);
  }

  // Legacy path hotfix: keep old dashboard URLs working after pluralized route migration.
  if (pathWithoutLocale === "/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = buildLocalizedPath("/dashboards", locale);
    return NextResponse.redirect(url, 308);
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isProtectedPath = EDGE_PROTECTED_PREFIXES.some(
    (prefix) => pathWithoutLocale === prefix || pathWithoutLocale.startsWith(`${prefix}/`),
  );
  const sessionClaims = decodeSessionClaims(token);
  const userType = sessionClaims?.user_type;
  const isPlatformOnlyPath = PLATFORM_ONLY_PREFIXES.some(
    (prefix) => pathWithoutLocale === prefix || pathWithoutLocale.startsWith(`${prefix}/`),
  );
  const isPlatformBlockedPath = PLATFORM_BLOCKED_PREFIXES.some(
    (prefix) => pathWithoutLocale === prefix || pathWithoutLocale.startsWith(`${prefix}/`),
  );
  const isLoginPath = pathWithoutLocale === "/login";

  if (!token) {
    if (isProtectedPath) {
      const loginUrl = request.nextUrl.clone();
      const nextPath = `${pathname}${request.nextUrl.search}`;
      loginUrl.pathname = buildLocalizedPath("/login", locale);
      loginUrl.search = "";
      loginUrl.searchParams.set("next", nextPath || "/dashboard");
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (userType === "platform_admin") {
    if (isLoginPath) {
      const url = request.nextUrl.clone();
      url.pathname = buildLocalizedPath("/platform", locale);
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (isPlatformBlockedPath) {
      const caseRouteForTesting =
        pathWithoutLocale === "/cases" || pathWithoutLocale.startsWith("/cases/");
      if (caseRouteForTesting && shouldAllowPlatformAdminCaseAccess()) {
        return NextResponse.next();
      }

      const url = request.nextUrl.clone();
      url.pathname = buildLocalizedPath("/platform", locale);
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (userType !== "platform_admin" && isPlatformOnlyPath) {
    const url = request.nextUrl.clone();
    url.pathname = buildLocalizedPath("/dashboard", locale);
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isLoginPath) {
    // Keep /login reachable even when a cookie exists.
    // Client/session checks decide whether to continue or re-authenticate.
    return NextResponse.next();
  }

  // Locale-prefixed dashboard routes are URL aliases; rewrite to concrete app routes.
  if (
    locale &&
    (pathWithoutLocale === "/dashboard" ||
      pathWithoutLocale === "/dashboards" ||
      pathWithoutLocale.startsWith("/dashboard/") ||
      pathWithoutLocale.startsWith("/dashboards/"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = pathWithoutLocale;
    return NextResponse.rewrite(url);
  }

  if (alreadyLocale) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images/).*)"],
};