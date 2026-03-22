import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { ApiError, handleApiError } from "@/lib/server/http";
import bcrypt from "bcryptjs";
import { buildSessionCookieOptions, getSessionCookieName } from "@/lib/server/sessionCookie";
import { platformRoleForUserRole, userTypeForUserRole } from "@/lib/server/roles";
import { createAccessToken, getJwtSecret, getTokenTtlSeconds } from "@/lib/server/auth-token";

type LoginPayload = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      throw new ApiError(500, "DATABASE_URL is not configured");
    }

    const payload = (await request.json().catch(() => null)) as LoginPayload | null;
    const email = payload?.email?.trim().toLowerCase();
    const password = payload?.password;

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        primaryTenant: {
          select: {
            code: true,
          },
        },
      },
    });

    if (!user || !user.hashedPassword || !user.isActive) {
      throw new ApiError(401, "Invalid credentials");
    }

    const validPassword = await bcrypt.compare(password, user.hashedPassword);
    if (!validPassword) {
      throw new ApiError(401, "Invalid credentials");
    }

    const effectiveUserType = userTypeForUserRole(user.role, user.email);
    const platformRole = effectiveUserType === "PLATFORM_ADMIN" ? platformRoleForUserRole(user.role) ?? "platform_admin" : null;
    const allowTenantPasswordLogin = process.env.ALLOW_TENANT_PASSWORD_LOGIN === "true";
    if (!platformRole && !allowTenantPasswordLogin) {
      throw new ApiError(403, "Password login is disabled for tenant users. Use Microsoft sign-in.");
    }

    if (user.userType !== effectiveUserType) {
      await prisma.user.update({
        where: { id: user.id },
        data: { userType: effectiveUserType },
      });
    }

    const secret = getJwtSecret();
    const now = Math.floor(Date.now() / 1000);
    const exp = now + getTokenTtlSeconds();

    const accessToken = createAccessToken(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        user_type:
          effectiveUserType === "PLATFORM_ADMIN"
            ? "platform_admin"
            : effectiveUserType === "TENANT_ADMIN"
              ? "tenant_admin"
              : "tenant_user",
        platform_role: platformRole,
        tenant_id: user.tenantId,
        tenant_code: user.primaryTenant?.code ?? null,
        exp,
      },
      secret,
    );

    const response = NextResponse.json({
      authenticated: true,
      redirectTo: effectiveUserType === "PLATFORM_ADMIN" ? "/platform" : "/dashboard",
      userType:
        effectiveUserType === "PLATFORM_ADMIN"
          ? "platform_admin"
          : effectiveUserType === "TENANT_ADMIN"
            ? "tenant_admin"
            : "tenant_user",
    });
    response.cookies.set(
      getSessionCookieName(),
      accessToken,
      buildSessionCookieOptions(getTokenTtlSeconds(), request),
    );

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
