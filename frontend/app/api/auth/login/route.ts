import { NextResponse } from "next/server";
import { getBackendApiBaseUrl } from "@/lib/server/backend";
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

    const backendUrl = `${getBackendApiBaseUrl()}/auth/login`;
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const body = await backendResponse.json().catch(() => ({}));
    if (!backendResponse.ok) {
      const detail =
        typeof body?.detail === "string" && body.detail.trim().length > 0
          ? body.detail
          : "Invalid credentials";
      throw new ApiError(backendResponse.status, detail);
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
