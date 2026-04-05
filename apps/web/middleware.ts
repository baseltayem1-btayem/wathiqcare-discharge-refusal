import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "wathiqcare_access_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(COOKIE_NAME)?.value;

  // If not logged in -> allow access (handled elsewhere)
  if (!token) {
    return NextResponse.next();
  }

  // Prevent accessing login if already authenticated
  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
