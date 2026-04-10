import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "wathiqcare_access_token";
const LANGUAGE_COOKIE_NAME = "wathiqcare_lang";
const SUPPORTED_LOCALES = ["ar", "en"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = "ar";
const EDGE_PROTECTED_PREFIXES = ["/dashboard", "/platform"] as const;

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
  const alreadyLocale = SUPPORTED_LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/${detectLocale(request)}`;
    return NextResponse.redirect(url);
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    const isProtectedPath = EDGE_PROTECTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

    if (isProtectedPath) {
      const loginUrl = request.nextUrl.clone();
      const nextPath = `${pathname}${request.nextUrl.search}`;
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", nextPath || "/dashboard");
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (pathname === "/login" || pathname === "/ar/login" || pathname === "/en/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (alreadyLocale) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images/).*)"],
};