import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { getConfiguredBackendApiBaseUrl } from "@/lib/server/backend";

type BackendValidateResponse = {
  authenticated?: boolean;
  claims?: {
    sub?: string;
    id?: string;
    email?: string;
    role?: string;
    tenant_id?: string;
    tenant_code?: string;
  };
  id?: string;
  email?: string;
  role?: string;
  tenant_id?: string;
  tenant_code?: string;
};

type BackendClaims = {
  sub?: string;
  id?: string;
  email?: string;
  role?: string;
  tenant_id?: string;
  tenant_code?: string;
};

function buildBackendUrl(pathname: string): URL {
  const baseUrl = (getConfiguredBackendApiBaseUrl() || "").trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(baseUrl)) {
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

async function validateTokenWithBackend(token: string): Promise<{
  sub: string;
  email?: string;
  role?: string;
  tenant_id: string;
  tenant_code?: string;
}> {
  const endpoint = buildBackendUrl("/auth/validate");
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, "Invalid access token");
  }

  const payload = (await response.json().catch(() => null)) as BackendValidateResponse | null;
  const claims: BackendClaims | null = payload?.claims ?? payload;
  const sub = (claims?.sub || claims?.id || "").trim();
  const tenantId = (claims?.tenant_id || "").trim();

  if (!sub || !tenantId) {
    throw new ApiError(401, "Invalid access token claims");
  }

  return {
    sub,
    email: claims?.email,
    role: claims?.role,
    tenant_id: tenantId,
    tenant_code: claims?.tenant_code,
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("wathiqcare_access_token")?.value?.trim();
    if (!token) {
      throw new ApiError(401, "Missing access token");
    }

    const auth = await validateTokenWithBackend(token);

    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      include: {
        memberships: {
          where: { tenantId: auth.tenant_id },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                code: true,
                domain: true,
                timezone: true,
                country: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({
        authenticated: true,
        claims: auth,
        user: null,
      });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId: auth.tenant_id },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      toJsonSafe({
        authenticated: true,
        claims: auth,
        user,
        subscription,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
