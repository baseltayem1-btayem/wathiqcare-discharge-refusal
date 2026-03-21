import { NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getConfiguredBackendApiBaseUrl } from "@/lib/server/backend";

type LoginPayload = {
  email?: string;
  password?: string;
};

type BackendLoginResponse = {
  access_token?: string;
};

const AUTH_DEBUG = process.env.AUTH_DEBUG === "true";

function authDebugLog(event: string, details: Record<string, unknown> = {}): void {
  if (!AUTH_DEBUG) {
    return;
  }
  console.info("[auth-debug]", event, details);
}

function normalizeAbsoluteHttpUrl(raw: string | undefined): string | null {
  const normalized = (raw || "").trim().replace(/\/$/, "");
  if (!normalized) {
    return null;
  }

  if (!/^https?:\/\//i.test(normalized)) {
    return null;
  }

  return normalized;
}

function buildBackendUrl(pathname: string): URL {
  const baseUrl = normalizeAbsoluteHttpUrl(getConfiguredBackendApiBaseUrl() || undefined);
  if (!baseUrl) {
    throw new ApiError(503, "Backend authentication service is unavailable.");
  }

  const base = new URL(baseUrl);
  const baseWithPath = new URL(base.toString());
  baseWithPath.pathname = baseWithPath.pathname.endsWith("/")
    ? baseWithPath.pathname
    : `${baseWithPath.pathname}/`;
  const normalizedPath = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  return new URL(normalizedPath, baseWithPath);
}

function getTokenTtlSecondsFromJwt(accessToken: string): number {
  try {
    const [, payload] = accessToken.split(".");
    if (!payload) {
      return 30 * 60;
    }

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: number;
    };
    if (typeof decoded.exp !== "number") {
      return 30 * 60;
    }

    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;
    if (!Number.isFinite(ttl) || ttl <= 0) {
      return 5 * 60;
    }
    return Math.max(5 * 60, Math.min(24 * 60 * 60, Math.floor(ttl)));
  } catch {
    return 30 * 60;
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as LoginPayload | null;
    const email = payload?.email?.trim().toLowerCase();
    const password = payload?.password;

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const endpoint = buildBackendUrl("/auth/login");
    const backendResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const isJson = (backendResponse.headers.get("content-type") || "").includes("application/json");
    const backendPayload = isJson
      ? (await backendResponse.json().catch(() => null) as BackendLoginResponse | { detail?: unknown } | null)
      : null;

    if (!backendResponse.ok) {
      const detail = backendPayload && typeof backendPayload === "object" && "detail" in backendPayload
        ? String(backendPayload.detail ?? "")
        : "Invalid credentials";
      throw new ApiError(backendResponse.status, detail || "Invalid credentials");
    }

    const accessToken = (
      backendPayload && typeof backendPayload === "object" && "access_token" in backendPayload
        ? String((backendPayload as BackendLoginResponse).access_token || "")
        : ""
    ).trim();
    if (!accessToken) {
      throw new ApiError(502, "Backend authentication did not return an access token.");
    }

    const response = NextResponse.json({ access_token: accessToken });
    const isProd = process.env.NODE_ENV === "production";
    const requestHost = new URL(request.url).hostname.toLowerCase();
    const cookieDomain = isProd && requestHost.endsWith("wathiqcare.online")
      ? ".wathiqcare.online"
      : undefined;

    response.cookies.set("wathiqcare_access_token", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      domain: cookieDomain,
      path: "/",
      maxAge: getTokenTtlSecondsFromJwt(accessToken),
    });

    authDebugLog("login_cookie_set", {
      requestHost,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      domain: cookieDomain ?? "host-only",
      maxAgeSeconds: getTokenTtlSecondsFromJwt(accessToken),
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
