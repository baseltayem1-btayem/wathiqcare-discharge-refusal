import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { buildSessionCookieOptions, getSessionCookieName } from "@/lib/server/sessionCookie";
import { createAccessToken, getJwtSecret, getTokenTtlSeconds } from "@/lib/server/auth-token";
import { platformRoleForUserRole, userTypeForUserRole } from "@/lib/server/roles";
import { normalizeEmail } from "@/lib/server/auth-domain-policy";
import { verifyPassword } from "@/lib/server/password";

type PasswordLoginPayload = {
    email?: string;
    password?: string;
};

function readClientIp(request: NextRequest): string {
    const forwarded = request.headers.get("x-forwarded-for") || "";
    const first = forwarded.split(",")[0]?.trim();
    return first || request.headers.get("x-real-ip") || "unknown";
}

async function recordLoginAttempt(
    email: string,
    success: boolean,
    reason: string | null,
    request: NextRequest
): Promise<void> {
    try {
        const ipAddress = readClientIp(request);
        const userAgent = request.headers.get("user-agent");

        await prisma.$executeRaw`
      INSERT INTO login_attempts (email, ip_address, user_agent, success, reason)
      VALUES (${email.toLowerCase()}, ${ipAddress}, ${userAgent}, ${success}, ${reason})
    `;
    } catch (error) {
        console.error("Failed to record login attempt:", error);
        // Non-blocking: don't throw
    }
}

async function checkRateLimit(email: string, request: NextRequest): Promise<{ limited: boolean; waitSeconds?: number }> {
    const ipAddress = readClientIp(request);
    const email_lower = email.toLowerCase();

    // Check recent failed attempts (last 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    try {
        const attempts = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE (email = ${email_lower} OR ip_address = ${ipAddress})
        AND success = false
        AND created_at > ${fifteenMinutesAgo}
    `;

        const failureCount = Number(attempts[0]?.count ?? 0);

        // Allow up to 5 failed attempts per 15 minutes
        if (failureCount >= 5) {
            // Calculate wait time (increase with more failures)
            const waitSeconds = Math.min(30 * (failureCount - 4), 300); // 30s to 5min
            return { limited: true, waitSeconds };
        }

        return { limited: false };
    } catch (error) {
        console.error("Rate limit check failed:", error);
        return { limited: false }; // Fail open on error
    }
}

async function findUserByEmailWithDomain(
    email: string
): Promise<{ id: string; email: string; hashedPassword: string | null; isActive: boolean; tenantId: string; role: string | null; tenantIsActive: boolean; membershipStatus: string | null; status: string | null; emailVerified: boolean; lockedUntil: Date | null } | null> {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;

    const result = await prisma.$queryRaw<Array<{ id: string; email: string; hashed_password: string | null; is_active: boolean; tenant_id: string; role: string | null; tenant_is_active: boolean; membership_status: string | null; status: string | null; email_verified: boolean | null; locked_until: Date | null }>>`
    SELECT
      u.id,
      u.email,
      u.hashed_password,
      u.is_active,
      u.tenant_id,
      u.role,
            tm.status AS membership_status,
            u.status,
            u.email_verified,
            u.locked_until,
            t.is_active as tenant_is_active
    FROM users u
    INNER JOIN tenants t ON t.id = u.tenant_id
        LEFT JOIN tenant_memberships tm ON tm.user_id = u.id AND tm.tenant_id = u.tenant_id
    WHERE LOWER(u.email) = ${normalizedEmail}
    LIMIT 1
  `;

    if (!result[0]) return null;

    return {
        id: result[0].id,
        email: result[0].email,
        hashedPassword: result[0].hashed_password,
        isActive: result[0].is_active,
        tenantId: result[0].tenant_id,
        role: result[0].role,
        membershipStatus: result[0].membership_status,
        status: result[0].status,
        emailVerified: result[0].email_verified ?? false,
        lockedUntil: result[0].locked_until,
        tenantIsActive: result[0].tenant_is_active,
    };
}

async function createSessionForPasswordUser(
    userId: string,
    email: string,
    tenantId: string,
    role: string | null
): Promise<{ accessToken: string; redirectTo: string; userType: string }> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { code: true },
    });

    const normalizedRole = (role || "").trim();
    const userType = userTypeForUserRole(normalizedRole, email);
    const platformRole = platformRoleForUserRole(normalizedRole);

    const secret = getJwtSecret();
    const now = Math.floor(Date.now() / 1000);
    const exp = now + getTokenTtlSeconds();

    const accessToken = createAccessToken(
        {
            sub: userId,
            email,
            role: normalizedRole,
            user_type:
                userType === "PLATFORM_ADMIN"
                    ? "platform_admin"
                    : userType === "TENANT_ADMIN"
                        ? "tenant_admin"
                        : "tenant_user",
            platform_role: platformRole,
            tenant_id: tenantId,
            tenant_code: tenant?.code ?? null,
            exp,
        },
        secret
    );

    // Update last login
    await prisma.$executeRaw`
    UPDATE users
    SET auth_provider = 'local_password', last_login_at = NOW(), last_password_changed_at = COALESCE(last_password_changed_at, NOW())
    WHERE id = ${userId}
  `;

    return {
        accessToken,
        redirectTo: userType === "PLATFORM_ADMIN" ? "/platform" : "/dashboard",
        userType:
            userType === "PLATFORM_ADMIN"
                ? "platform_admin"
                : userType === "TENANT_ADMIN"
                    ? "tenant_admin"
                    : "tenant_user",
    };
}

export async function POST(request: NextRequest) {
    try {
        const genericErrorMessage = "Invalid email or password";
        const payload = (await request.json().catch(() => null)) as PasswordLoginPayload | null;
        if (!payload) {
            throw new ApiError(400, "Invalid JSON body");
        }

        const { email: emailInput, password } = payload;
        const email = normalizeEmail(emailInput || "");

        if (!email || !password) {
            await recordLoginAttempt(email || emailInput || "", false, "MISSING_CREDENTIALS", request);
            throw new ApiError(401, genericErrorMessage);
        }

        // Check rate limiting
        const rateLimitCheck = await checkRateLimit(email, request);
        if (rateLimitCheck.limited) {
            await recordLoginAttempt(email, false, "RATE_LIMITED", request);
            throw new ApiError(429, "Too many login attempts. Please try again later");
        }

        // Find user
        const user = await findUserByEmailWithDomain(email);
        if (!user) {
            await recordLoginAttempt(email, false, "USER_NOT_FOUND", request);
            throw new ApiError(401, genericErrorMessage);
        }

        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
            await recordLoginAttempt(email, false, "ACCOUNT_LOCKED", request);
            throw new ApiError(429, "Too many login attempts. Please try again later");
        }

        // Check if user is active
        if (!user.isActive) {
            await recordLoginAttempt(email, false, "USER_INACTIVE", request);
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
            await recordLoginAttempt(email, false, "NO_PASSWORD_SET", request);
            throw new ApiError(401, genericErrorMessage);
        }

        // Verify password
        const passwordValid = await verifyPassword(password, user.hashedPassword);
        if (!passwordValid) {
            await recordLoginAttempt(email, false, "INVALID_PASSWORD", request);

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
        const session = await createSessionForPasswordUser(user.id, user.email, user.tenantId, user.role);

        // Record successful login
        await recordLoginAttempt(email, true, null, request);

        // Set session cookie
        const response = NextResponse.json({
            accessToken: session.accessToken,
            redirectTo: session.redirectTo,
        });

        response.cookies.set(
            getSessionCookieName(),
            session.accessToken,
            buildSessionCookieOptions(getTokenTtlSeconds(), request),
        );

        return response;
    } catch (error) {
        return handleApiError(error);
    }
}
