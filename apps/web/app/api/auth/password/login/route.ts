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

        await getPrisma().$executeRaw`
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
        const result = await getPrisma().$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) AS count
            FROM login_attempts
            WHERE (email = ${email.toLowerCase()} OR ip_address = ${ipAddress})
              AND success = false
              AND created_at > ${fifteenMinutesAgo}
        `;

        const failureCount = Number(result[0]?.count ?? 0);

        if (failureCount >= 5) {
            return {
                limited: true,
                waitSeconds: Math.min(30 * (failureCount - 4), 300),
            };
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

    return {
        accessToken,
        redirectTo: buildRedirectPath(normalizedRole, email),
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

        const email = normalizeEmail(payload.email || "");
        const password = payload.password ?? "";

        if (!email || !password) {
            await recordLoginAttempt(
                prisma,
                email || payload.email || "",
                false,
                "MISSING_CREDENTIALS",
                request,
            );
            throw new ApiError(401, genericErrorMessage);
        }

        const rateLimit = await checkRateLimit(prisma, email, request);
        if (rateLimit.limited) {
            await recordLoginAttempt(prisma, email, false, "RATE_LIMITED", request);
            throw new ApiError(429, "Too many login attempts");
        }

        const user = await getPrisma().user.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: "insensitive",
                },
            },
        });

        if (!user || !user.hashedPassword) {
            await recordLoginAttempt(prisma, email, false, "INVALID_USER", request);
            throw new ApiError(401, genericErrorMessage);
        }

        if (!user.isActive) {
            await recordLoginAttempt(prisma, email, false, "USER_INACTIVE", request);
            throw new ApiError(401, genericErrorMessage);
        }

        const passwordValid = await verifyPassword(password, user.hashedPassword);
        if (!passwordValid) {
            await recordLoginAttempt(prisma, email, false, "INVALID_PASSWORD", request);
            throw new ApiError(401, genericErrorMessage);
        }

        const session = await createSessionForPasswordUser({
            prisma,
            userId: user.id,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role,
        });

        await recordLoginAttempt(prisma, email, true, null, request);

        const ttlSeconds = getTokenTtlSeconds();

        const response = NextResponse.json({
            accessToken: session.accessToken,
            redirectTo: session.redirectTo,
        });

        response.cookies.set(
            getSessionCookieName(),
            session.accessToken,
            buildSessionCookieOptions(ttlSeconds, request),
        );

        return response;
    } catch (error) {
        return handleApiError(error);
    }
}
