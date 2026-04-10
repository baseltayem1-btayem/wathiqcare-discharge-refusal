import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPPORTED_LOCALES = ["ar", "en"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = "ar";
const COOKIE_NAME = "wathiqcare_lang";

function detectLocale(request: NextRequest): Locale {
  // 1. Cookie
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie === "ar" || cookie === "en") return cookie;

  // 2. Accept-Language header
  const acceptLang = request.headers.get("accept-language") || "";
  if (acceptLang.toLowerCase().startsWith("en")) return "en";

  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip: already locale-prefixed, API routes, Next.js internals, static files
  const alreadyLocale = SUPPORTED_LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );

  if (
    alreadyLocale ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/images/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Redirect root to locale home
  if (pathname === "/") {
    const locale = detectLocale(request);
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  // All other non-locale paths pass through (dashboard, cases, login, etc.)
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|api/).*)",
  ],
};
