import { NextRequest, NextResponse } from "next/server";
import { UserType } from "@prisma/client";
import { ApiError, handleApiError, jsonSuccess } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import {
  buildSessionCookieOptions,
  getSessionCookieName,
} from "@/lib/server/sessionCookie";
import {
  createAccessToken,
  getJwtSecret,
  getTokenTtlSeconds,
} from "@/lib/server/auth-token";
import {
  platformRoleForUserRole,
  userTypeForUserRole,
} from "@/lib/server/roles";
import { normalizeEmail } from "@/lib/server/auth-domain-policy";
import { verifyPassword } from "@/lib/server/password";
import { normalizeTenantAuthConfig } from "@/lib/server/tenant-auth-config";
import { getUserResetState } from "@/lib/server/auth-reset";

type PasswordLoginPayload = {
  email?: string;
  password?: string;
};

type RateLimitResult = {
  limited: boolean;
  waitSeconds?: number;
};

type FoundUser = {
  id: string;
  email: string;
  userType: UserType;
  authConfig: unknown;
  hashedPassword: string | null;
  isActive: boolean;
  lockedUntil: Date | null;
  tenantId: string | null;
  tenantIsActive: boolean;
  membershipStatus: string | null;
  role: string | null;
};

type PasswordSessionResult = {
  accessToken: string;
  redirectTo: string;
  userType: "platform_admin" | "tenant_admin" | "tenant_user";
};

const GENERIC_LOGIN_ERROR = "Invalid email or password";
const TOO_MANY_ATTEMPTS_ERROR = "Too many login attempts. Please try again later";
const AUTH_SERVICE_UNAVAILABLE_ERROR = "Login service is temporarily unavailable. Please try again shortly";
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_FAILURES = 5;
const ACCOUNT_LOCK_MINUTES = 15;

function isPrismaConnectivityError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const e = error as { name?: unknown; message?: unknown };
  const name = typeof e.name === "string" ? e.name : "";
  const message = typeof e.message === "string" ? e.message : "";

  if (name.includes("PrismaClientInitializationError")) {
    return true;
  }

  return (
    message.includes("Authentication failed against database server") ||
    message.includes("Can't reach database server") ||
    message.includes("timed out")
  );
}

function readClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const firstForwardedIp = forwardedFor.split(",")[0]?.trim();
  return firstForwardedIp || request.headers.get("x-real-ip") || "unknown";
}

function toSessionUserTypeFromStored(
  storedUserType: UserType | null | undefined,
  userRole: string | null | undefined,
  email: string,
): "platform_admin" | "tenant_admin" | "tenant_user" {
  if (storedUserType === UserType.PLATFORM_ADMIN) {
    return "platform_admin";
  }

  if (storedUserType === UserType.TENANT_ADMIN) {
    return "tenant_admin";
  }

  if (storedUserType === UserType.TENANT_USER) {
    return "tenant_user";
  }

  return toSessionUserType(userRole, email);
}

function toSessionUserType(
  userRole: string | null | undefined,
  email: string,
): "platform_admin" | "tenant_admin" | "tenant_user" {
  const computedUserType = userTypeForUserRole(userRole ?? "", email);

  if (computedUserType === "PLATFORM_ADMIN") {
    return "platform_admin";
  }

  if (computedUserType === "TENANT_ADMIN") {
    return "tenant_admin";
  }

  return "tenant_user";
}

async function recordLoginAttempt(args: {
  prisma: ReturnType<typeof getPrisma>;
  email: string;
  success: boolean;
  reason: string | null;
  request: NextRequest;
}): Promise<void> {
  const { prisma, email, success, reason, request } = args;

  try {
    const ipAddress = readClientIp(request);
    const userAgent = request.headers.get("user-agent");

    await prisma.$executeRaw`
      INSERT INTO login_attempts (email, ip_address, user_agent, success, reason)
      VALUES (${email.toLowerCase()}, ${ipAddress}, ${userAgent}, ${success}, ${reason})
    `;
  } catch (error) {
    console.error("LOGIN_ATTEMPT_RECORD_FAILED", error);
  }
}

async function checkRateLimit(args: {
  prisma: ReturnType<typeof getPrisma>;
  email: string;
  request: NextRequest;
}): Promise<RateLimitResult> {
  const { prisma, email, request } = args;
  const ipAddress = readClientIp(request);
  const thresholdTime = new Date(Date.now() - LOGIN_RATE_LIMIT_WINDOW_MS);

  try {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count
      FROM login_attempts
      WHERE (email = ${email.toLowerCase()} OR ip_address = ${ipAddress})
        AND success = false
        AND created_at > ${thresholdTime}
    `;

    const count = Number(result[0]?.count ?? 0);

    if (count >= LOGIN_RATE_LIMIT_MAX_FAILURES) {
      return {
        limited: true,
        waitSeconds: ACCOUNT_LOCK_MINUTES * 60,
      };
    }

    return { limited: false };
  } catch (error) {
    console.error("RATE_LIMIT_CHECK_FAILED", error);
    return { limited: false };
  }
}

async function findUserByEmailWithDomain(
  prisma: ReturnType<typeof getPrisma>,
  email: string,
): Promise<FoundUser | null> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      userType: true,
      hashedPassword: true,
      isActive: true,
      lockedUntil: true,
      tenantId: true,
      role: true,
      primaryTenant: {
        select: {
          isActive: true,
          authConfig: true,
        },
      },
      memberships: {
        where: { status: "ACTIVE" },
        select: {
          status: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    userType: user.userType,
    authConfig: user.primaryTenant?.authConfig,
    hashedPassword: user.hashedPassword,
    isActive: user.isActive,
    lockedUntil: user.lockedUntil,
    tenantId: user.tenantId,
    tenantIsActive: user.primaryTenant?.isActive ?? false,
    membershipStatus: user.memberships?.[0]?.status ?? null,
    role: user.role,
  };
}

async function createSessionForPasswordUser(args: {
  prisma: ReturnType<typeof getPrisma>;
  userId: string;
  email: string;
  tenantId: string | null;
  role: string | null;
  userType: UserType;
}): Promise<PasswordSessionResult> {
  const { prisma, userId, email, tenantId, role, userType } = args;

  const tenant = tenantId
    ? await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { code: true },
      })
    : null;

  const normalizedRole = (role ?? "").trim();
  const ttlSeconds = getTokenTtlSeconds();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlSeconds;
  const sessionUserType = toSessionUserTypeFromStored(userType, normalizedRole, email);
  const redirectTo = sessionUserType === "platform_admin" ? "/platform" : "/dashboard";

  const accessToken = createAccessToken(
    {
      sub: userId,
      user_id: userId,
      email,
      role: normalizedRole,
      user_type: sessionUserType,
      platform_role: platformRoleForUserRole(normalizedRole),
      tenant_id: tenantId,
      tenant_code: tenant?.code ?? null,
      iat: now,
      exp,
    },
    getJwtSecret(),
  );

  await prisma.$executeRaw`
    UPDATE users
    SET auth_provider = 'local_password',
        last_login_at = NOW()
    WHERE id = ${userId}
  `;

  return {
    accessToken,
    redirectTo,
    userType: sessionUserType,
  };
}

async function incrementFailedPasswordAttempts(
  prisma: ReturnType<typeof getPrisma>,
  userId: string,
): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE users
      SET failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE
            WHEN failed_login_attempts + 1 >= ${LOGIN_RATE_LIMIT_MAX_FAILURES}
              THEN NOW() + INTERVAL '15 minutes'
            ELSE locked_until
          END
      WHERE id = ${userId}
    `;
  } catch (error) {
    console.error("FAILED_TO_INCREMENT_LOGIN_ATTEMPTS", error);
  }
}

async function resetFailedPasswordAttempts(
  prisma: ReturnType<typeof getPrisma>,
  userId: string,
): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE users
      SET failed_login_attempts = 0,
          locked_until = NULL,
          auth_provider = 'local_password',
          last_login_at = NOW()
      WHERE id = ${userId}
    `;
  } catch (error) {
    console.error("FAILED_TO_RESET_LOGIN_ATTEMPTS", error);
  }
}

function buildLoginSuccessResponse(args: {
  accessToken: string;
  redirectTo: string;
  userType: "platform_admin" | "tenant_admin" | "tenant_user";
  request: NextRequest;
}): NextResponse {
  const { accessToken, redirectTo, request, userType } = args;

  const response = jsonSuccess(
    {
      ok: true,
      accessToken,
      redirectTo,
      userType,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );

  const cookieName = getSessionCookieName();
  const ttl = getTokenTtlSeconds();

  response.cookies.set(
    cookieName,
    accessToken,
    buildSessionCookieOptions(ttl, request),
  );

  console.info("COOKIE_SET", {
    cookieName,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.AUTH_COOKIE_SAME_SITE || "lax",
    domain: process.env.AUTH_COOKIE_DOMAIN || "(auto)",
    path: "/",
    maxAgeSeconds: ttl,
    expiresAtIso: new Date(Date.now() + ttl * 1000).toISOString(),
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();

    const payload = (await request.json().catch(() => null)) as PasswordLoginPayload | null;
    if (!payload) {
      throw new ApiError(400, "Invalid JSON body");
    }

    const email = normalizeEmail(payload.email || "");
    const password = payload.password || "";

    if (!email || !password) {
      await recordLoginAttempt({
        prisma,
        email: email || payload.email || "",
        success: false,
        reason: "MISSING_CREDENTIALS",
        request,
      });

      throw new ApiError(401, GENERIC_LOGIN_ERROR);
    }

    const rateLimitCheck = await checkRateLimit({
      prisma,
      email,
      request,
    });

    if (rateLimitCheck.limited) {
      await recordLoginAttempt({
        prisma,
        email,
        success: false,
        reason: "RATE_LIMITED",
        request,
      });

      throw new ApiError(429, TOO_MANY_ATTEMPTS_ERROR);
    }

    const user = await findUserByEmailWithDomain(prisma, email);

    if (!user) {
      await recordLoginAttempt({
        prisma,
        email,
        success: false,
        reason: "USER_NOT_FOUND",
        request,
      });

      throw new ApiError(401, GENERIC_LOGIN_ERROR);
    }

    const authConfig = normalizeTenantAuthConfig(user.authConfig);
    if (!authConfig.password_enabled) {
      await recordLoginAttempt({
        prisma,
        email,
        success: false,
        reason: "PASSWORD_LOGIN_DISABLED",
        request,
      });
      throw new ApiError(403, "Password login is disabled for this tenant");
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      await recordLoginAttempt({
        prisma,
        email,
        success: false,
        reason: "ACCOUNT_LOCKED",
        request,
      });

      throw new ApiError(429, TOO_MANY_ATTEMPTS_ERROR);
    }

    if (!user.isActive) {
      await recordLoginAttempt({
        prisma,
        email,
        success: false,
        reason: "USER_INACTIVE",
        request,
      });

      throw new ApiError(401, GENERIC_LOGIN_ERROR);
    }

    if (!user.tenantIsActive) {
      console.warn(
        "[auth:login] tenant inactive — session will be created but access will be restricted post-login",
        {
          email,
          tenantId: user.tenantId,
        },
      );
    }

    if ((user.membershipStatus || "").toUpperCase() !== "ACTIVE") {
      console.warn(
        "[auth:login] membership not active — session will be created but access will be restricted post-login",
        {
          email,
          membershipStatus: user.membershipStatus,
        },
      );
    }

    if (!user.hashedPassword) {
      await recordLoginAttempt({
        prisma,
        email,
        success: false,
        reason: "NO_PASSWORD_SET",
        request,
      });

      throw new ApiError(401, GENERIC_LOGIN_ERROR);
    }

    const passwordValid = await verifyPassword(password, user.hashedPassword);

    if (!passwordValid) {
      await recordLoginAttempt({
        prisma,
        email,
        success: false,
        reason: "INVALID_PASSWORD",
        request,
      });

      await incrementFailedPasswordAttempts(prisma, user.id);
      throw new ApiError(401, GENERIC_LOGIN_ERROR);
    }

    const resetState = await getUserResetState(prisma, user.id);
    if (resetState.passwordResetRequired) {
      await recordLoginAttempt({
        prisma,
        email,
        success: false,
        reason: "PASSWORD_RESET_REQUIRED",
        request,
      });
      throw new ApiError(403, "Password reset required. Please reset your password using the secure link sent to your email.");
    }

    await resetFailedPasswordAttempts(prisma, user.id);

    const session = await createSessionForPasswordUser({
      prisma,
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      userType: user.userType,
    });

    await recordLoginAttempt({
      prisma,
      email,
      success: true,
      reason: null,
      request,
    });

    console.info("LOGIN_SUCCESS", {
      userId: user.id,
      email: user.email,
      role: user.role,
      userType: session.userType,
      tenantId: user.tenantId,
      membershipStatus: user.membershipStatus,
      isActive: user.isActive,
      redirectTo: session.redirectTo,
    });

    return buildLoginSuccessResponse({
      accessToken: session.accessToken,
      redirectTo: session.redirectTo,
      userType: session.userType,
      request,
    });
  } catch (error) {
    if (isPrismaConnectivityError(error)) {
      console.error("LOGIN_DATABASE_UNAVAILABLE", error);
      return NextResponse.json(
        { detail: AUTH_SERVICE_UNAVAILABLE_ERROR },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": "60",
          },
        },
      );
    }

    return handleApiError(error);
  }
}