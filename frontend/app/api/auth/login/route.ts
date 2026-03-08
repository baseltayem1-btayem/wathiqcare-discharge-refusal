import { NextResponse } from "next/server";
import { getConfiguredBackendApiBaseUrl } from "@/lib/server/backend";
import { ApiError, handleApiError } from "@/lib/server/http";

function normalizeUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function buildLoginTargets(request: Request, configuredBaseUrl: string | null): string[] {
  const targets = new Set<string>();
  const currentRequestUrl = normalizeUrl(request.url);

  const addTarget = (value: string) => {
    const normalized = normalizeUrl(value);
    if (normalized === currentRequestUrl) {
      return;
    }
    targets.add(normalized);
  };

  if (configuredBaseUrl) {
    const normalizedBase = normalizeUrl(configuredBaseUrl);
    addTarget(`${normalizedBase}/auth/login`);
    addTarget(`${normalizedBase}/api/auth/login`);

    if (normalizedBase.endsWith("/api")) {
      const withoutApiSuffix = normalizedBase.slice(0, -4);
      if (withoutApiSuffix.length > 0) {
        addTarget(`${withoutApiSuffix}/auth/login`);
        addTarget(`${withoutApiSuffix}/api/auth/login`);
      }
    }

    // If the configured base URL contains path segments (for example /v1 or /api/v1),
    // also try the host root to handle mismatched deployment path prefixes.
    try {
      const parsed = new URL(normalizedBase);
      const origin = normalizeUrl(parsed.origin);
      addTarget(`${origin}/auth/login`);
      addTarget(`${origin}/api/auth/login`);
    } catch {
      // Ignore malformed URLs and rely on the direct configured base value.
    }
  }

  // Same-origin fallback relies on Next.js rewrite rules.
  addTarget(new URL("/auth/login", request.url).toString());

  return [...targets];
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as {
      email?: string;
      password?: string;
    } | null;

    if (!payload?.email || !payload?.password) {
      throw new ApiError(400, "Email and password are required");
    }

    const configuredBaseUrl = getConfiguredBackendApiBaseUrl();
    const targets = buildLoginTargets(request, configuredBaseUrl);

    let backendResponse: Response | null = null;
    let lastNotFoundResponse: Response | null = null;
    let lastRedirectResponse: Response | null = null;
    let lastServerErrorResponse: Response | null = null;

    for (const target of targets) {
      try {
        const response = await fetch(target, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          cache: "no-store",
          redirect: "manual",
        });

        if (isRedirectStatus(response.status)) {
          lastRedirectResponse = response;
          continue;
        }

        if (response.status === 404 || response.status === 405) {
          lastNotFoundResponse = response;
          continue;
        }

        if (response.status >= 500) {
          lastServerErrorResponse = response;
          continue;
        }

        backendResponse = response;
        break;
      } catch {
        backendResponse = null;
      }
    }

    if (!backendResponse) {
      backendResponse = lastNotFoundResponse ?? lastRedirectResponse ?? lastServerErrorResponse;
    }

    if (!backendResponse) {
      throw new ApiError(502, "Authentication service is unavailable");
    }

    const body = await backendResponse.json().catch(() => ({}));
    if (!backendResponse.ok) {
      const backendDetail =
        typeof body?.detail === "string" && body.detail.trim().length > 0
          ? body.detail
          : "";

      if (backendResponse.status >= 500) {
        throw new ApiError(502, "Authentication service is unavailable");
      }

      if (isRedirectStatus(backendResponse.status)) {
        throw new ApiError(502, "Authentication service redirected unexpectedly");
      }

      if (backendResponse.status === 404 || backendResponse.status === 405) {
        throw new ApiError(502, "Authentication service endpoint is unavailable");
      }

      if (backendResponse.status === 400 || backendResponse.status === 401) {
        throw new ApiError(backendResponse.status, backendDetail || "Invalid credentials");
      }

      throw new ApiError(backendResponse.status, backendDetail || "Authentication request failed");
    }

    const contentType = backendResponse.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new ApiError(502, "Authentication service returned non-JSON response");
    }

    const accessToken = body?.access_token;
    if (typeof accessToken !== "string" || accessToken.length === 0) {
      throw new ApiError(502, "Backend auth response missing token");
    }

    const response = NextResponse.json({ access_token: accessToken });
    response.cookies.set("wathiqcare_access_token", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
