import { NextResponse } from "next/server";

const AUTH_DEBUG = process.env.AUTH_DEBUG === "true";

function authDebugLog(event: string, details: Record<string, unknown> = {}): void {
  if (!AUTH_DEBUG) {
    return;
  }
  console.info("[auth-debug]", event, details);
}

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  const isProd = process.env.NODE_ENV === "production";
  const requestHost = new URL(request.url).hostname.toLowerCase();
  const cookieDomain = isProd && requestHost.endsWith("wathiqcare.online")
    ? ".wathiqcare.online"
    : undefined;

  response.cookies.set("wathiqcare_access_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    domain: cookieDomain,
    path: "/",
    maxAge: 0,
  });

  authDebugLog("logout_cookie_cleared", {
    requestHost,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    domain: cookieDomain ?? "host-only",
  });

  return response;
}
