import { NextResponse } from "next/server";
import { getConfiguredBackendApiBaseUrl } from "@/lib/server/backend";
import { ApiError, handleApiError } from "@/lib/server/http";

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
    const sameOriginUrl = new URL("/auth/login", request.url).toString();
    const targets = [
      configuredBaseUrl ? `${configuredBaseUrl}/auth/login` : null,
      sameOriginUrl,
    ].filter((value, index, array): value is string => {
      if (!value) {
        return false;
      }
      return array.indexOf(value) === index;
    });

    let backendResponse: Response | null = null;
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
        });

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
      backendResponse = lastServerErrorResponse;
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

      if (backendResponse.status === 400 || backendResponse.status === 401) {
        throw new ApiError(backendResponse.status, backendDetail || "Invalid credentials");
      }

      throw new ApiError(backendResponse.status, backendDetail || "Authentication request failed");
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
