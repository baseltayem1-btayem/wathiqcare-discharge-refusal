import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/server/http";
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

type PasswordLoginPayload = {
    email?: string;
    password?: string;
};

type RateLimitResult = {
    limited: boolean;
    waitSeconds?: number;
};

function readClientIp(request: NextRequest): string {
    const forwarded = request.headers.get("x-forwarded-for") ?? "";
    const first = forwarded.split(",")[0]?.trim();
    return first || request.headers.get("x-real-ip") || "unknown";
}

function buildRedirectPath(userRole: string | null | undefined, email: string): string {
    const userType = userTypeForUserRole(userRole ?? "", email);
    return userType === "PLATFORM_ADMIN" ? "/platform" : "/dashboard";
}

async function recordLoginAttempt(
    prisma: ReturnType<typeof getPrisma>,
    email: string,
    success: boolean,
    reason: string | null,
    request: NextRequest,
): Promise<void> {
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

async function checkRateLimit(
    prisma: ReturnType<typeof getPrisma>,
    email: string,
    request: NextRequest,
): Promise<RateLimitResult> {
    const ipAddress = readClientIp(request);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    try {
        const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) AS count
            FROM login_attempts
            WHERE (email = ${email.toLowerCase()} OR ip_address = ${ipAddress})
              AND success = false
              AND created_at > ${fifteenMinutesAgo}
        `;
        const count = Number(result[0]?.count || 0);
        if (count >= 5) {
            return { limited: true, waitSeconds: 15 * 60 };
        }
        return { limited: false };
    } catch (error) {
        console.error("RATE_LIMIT_CHECK_FAILED", error);
        return { limited: false };
    }
}

async function createSessionForPasswordUser(args: {
    prisma: ReturnType<typeof getPrisma>;
    userId: string;
    email: string;
    tenantId: string | null;
    role: string | null;
}): Promise<{
    accessToken: string;
    redirectTo: string;
    userType: string;
}> {
    const { prisma, userId, email, tenantId, role } = args;

    const tenant = tenantId
        ? await getPrisma().tenant.findUnique({
              where: { id: tenantId },
              select: { code: true },
          })
        : null;

    const normalizedRole = (role ?? "").trim();
    const ttlSeconds = getTokenTtlSeconds();
    const now = Math.floor(Date.now() / 1000);
    const exp = now + ttlSeconds;
    const accessToken = createAccessToken(
        {
            sub: userId,
            user_id: userId,
            email,
            role: normalizedRole,
            user_type:
                userTypeForUserRole(normalizedRole, email) === "PLATFORM_ADMIN"
                    ? "platform_admin"
                    : userTypeForUserRole(normalizedRole, email) === "TENANT_ADMIN"
                      ? "tenant_admin"
                      : "tenant_user",
            platform_role: platformRoleForUserRole(normalizedRole),
            tenant_id: tenantId,
            tenant_code: tenant?.code ?? null,
            exp,
        },
        getJwtSecret(),
    );

    await getPrisma().$executeRaw`
        UPDATE users
        SET auth_provider = 'local_password',
            last_login_at = NOW()
        WHERE id = ${userId}
    `;

    const computedUserType = userTypeForUserRole(normalizedRole, email);
    return {
        accessToken,
        redirectTo: buildRedirectPath(normalizedRole, email),
        userType:
            computedUserType === "PLATFORM_ADMIN"
                ? "platform_admin"
                : computedUserType === "TENANT_ADMIN"
                    ? "tenant_admin"
                    : "tenant_user",
    };
}

async function findUserByEmailWithDomain(email: string): Promise<{
    id: string;
    email: string;
    hashedPassword: string | null;
    isActive: boolean;
    lockedUntil: Date | null;
    tenantId: string | null;
    tenantIsActive: boolean;
    membershipStatus: string | null;
    role: string | null;
} | null> {
    const prisma = getPrisma();
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
            id: true,
            email: true,
            hashedPassword: true,
            isActive: true,
            lockedUntil: true,
            tenantId: true,
            role: true,
            primaryTenant: {
                select: {
                    isActive: true,
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
        hashedPassword: user.hashedPassword,
        isActive: user.isActive,
        lockedUntil: user.lockedUntil,
        tenantId: user.tenantId,
        tenantIsActive: user.primaryTenant?.isActive ?? false,
        membershipStatus: user.memberships?.[0]?.status ?? null,
        role: user.role,
    };
}

export async function POST(request: NextRequest) {
    try {
        const prisma = getPrisma();
        const genericErrorMessage = "Invalid email or password";

        const payload = (await request.json().catch(() => null)) as PasswordLoginPayload | null;
        if (!payload) {
            throw new ApiError(400, "Invalid JSON body");
        }

        const { email: emailInput, password } = payload;
        const email = normalizeEmail(emailInput || "");

        if (!email || !password) {
            await recordLoginAttempt(prisma, email || emailInput || "", false, "MISSING_CREDENTIALS", request);
            throw new ApiError(401, genericErrorMessage);
        }

        // Check rate limiting
        const rateLimitCheck = await checkRateLimit(prisma, email, request);
        if (rateLimitCheck.limited) {
            await recordLoginAttempt(prisma, email, false, "RATE_LIMITED", request);
            throw new ApiError(429, "Too many login attempts. Please try again later");
        }

        // Find user
        const user = await findUserByEmailWithDomain(email);
        if (!user) {
            await recordLoginAttempt(prisma, email, false, "USER_NOT_FOUND", request);
            throw new ApiError(401, genericErrorMessage);
        }

        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
            await recordLoginAttempt(prisma, email, false, "ACCOUNT_LOCKED", request);
            throw new ApiError(429, "Too many login attempts. Please try again later");
        }

        // Check if user is active
        if (!user.isActive) {
            await recordLoginAttempt(prisma, email, false, "USER_INACTIVE", request);
            throw new ApiError(401, genericErrorMessage);
        }

        // NOTE: tenant-active and membership checks are post-login only — license must not block authentication.
        if (!user.tenantIsActive) {
            console.warn("[auth:login] tenant inactive — session will be created but access will be restricted post-login", { email, tenantId: user.tenantId });
        }
        if ((user.membershipStatus || "").toUpperCase() !== "ACTIVE") {
            console.warn("[auth:login] membership not active — session will be created but access will be restricted post-login", { email, membershipStatus: user.membershipStatus });
        }

        // Check if password is set
        if (!user.hashedPassword) {
            await recordLoginAttempt(prisma, email, false, "NO_PASSWORD_SET", request);
            throw new ApiError(401, genericErrorMessage);
        }

        // Verify password
        const passwordValid = await verifyPassword(password, user.hashedPassword);
        if (!passwordValid) {
            await recordLoginAttempt(prisma, email, false, "INVALID_PASSWORD", request);

            try {
                await prisma.$executeRaw`
          UPDATE users
                    SET failed_login_attempts = failed_login_attempts + 1,
                            locked_until = CASE
                                WHEN failed_login_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
                                ELSE locked_until
                            END
          WHERE id = ${user.id}
        `;
            } catch (error) {
                console.error("Failed to increment failed attempts:", error);
            }

            throw new ApiError(401, "Invalid email or password");
        }

        // License / domain / role checks happen post-login (dashboard middleware), not here.
        // Only credentials + user.isActive gate session creation.
        try {
            await prisma.$executeRaw`
        UPDATE users
        SET failed_login_attempts = 0,
            locked_until = NULL,
            auth_provider = 'local_password',
            last_login_at = NOW()
        WHERE id = ${user.id}
      `;
        } catch (error) {
            console.error("Failed to reset failed attempts:", error);
        }

        // Create session
        const session = await createSessionForPasswordUser({
            prisma,
            userId: user.id,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role,
        });

        // Record successful login
        await recordLoginAttempt(prisma, email, true, null, request);

        // Set session cookie
        const response = NextResponse.json({
            accessToken: session.accessToken,
            redirectTo: session.redirectTo,
        });

        const cookieName = getSessionCookieName();
        const ttl = getTokenTtlSeconds();
        response.cookies.set(
            cookieName,
            session.accessToken,
            buildSessionCookieOptions(ttl, request),
        );

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
    } catch (error) {
        return handleApiError(error);
    }
}
