import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/server/http";
<<<<<<< HEAD
import { getPrisma } from "@/lib/server/prisma";
=======
import { prisma } from "@/lib/server/prisma";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
import { buildSessionCookieOptions, getSessionCookieName } from "@/lib/server/sessionCookie";
import { createAccessToken, getJwtSecret, getTokenTtlSeconds } from "@/lib/server/auth-token";
import { platformRoleForUserRole, userTypeForUserRole } from "@/lib/server/roles";
import {
    extractDomain,
    isTenantDomainAllowed,
    normalizeEmail,
} from "@/lib/server/auth-domain-policy";

type MicrosoftLoginPayload = {
    accessToken?: string;
    idToken?: string;
    emailHint?: string;
};

type MicrosoftProfile = {
    email: string;
    fullName: string;
};

<<<<<<< HEAD
function parseEmailFromIdToken(idToken?: string): string | null {
    if (!idToken || !idToken.includes(".")) return null;

    try {
        const payload = JSON.parse(
            Buffer.from(idToken.split(".")[1], "base64url").toString("utf8")
        ) as Record<string, unknown>;

        return normalizeEmail(
            (payload.preferred_username as string) ||
            (payload.upn as string) ||
            (payload.email as string) ||
            null
        );
=======
function parseEmailFromIdToken(idToken: string | undefined): string | null {
    if (!idToken || !idToken.includes(".")) return null;
    const payloadPart = idToken.split(".")[1];
    if (!payloadPart) return null;

    try {
        const decoded = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as Record<string, unknown>;
        const email =
            (typeof decoded.preferred_username === "string" && decoded.preferred_username) ||
            (typeof decoded.upn === "string" && decoded.upn) ||
            (typeof decoded.email === "string" && decoded.email) ||
            null;
        return normalizeEmail(email);
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    } catch {
        return null;
    }
}

async function resolveMicrosoftProfile(payload: MicrosoftLoginPayload): Promise<MicrosoftProfile> {
    if (payload.accessToken) {
<<<<<<< HEAD
        const response = await fetch(
            "https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName",
            {
                headers: { Authorization: `Bearer ${payload.accessToken}` },
                cache: "no-store",
            }
        );
=======
        const response = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName", {
            headers: {
                Authorization: `Bearer ${payload.accessToken}`,
            },
            cache: "no-store",
        });
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

        if (!response.ok) {
            throw new ApiError(401, "Microsoft token validation failed");
        }

<<<<<<< HEAD
        const json = await response.json() as {
=======
        const json = (await response.json()) as {
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            displayName?: string;
            mail?: string | null;
            userPrincipalName?: string;
        };

        const email = normalizeEmail(json.mail || json.userPrincipalName || "");
<<<<<<< HEAD

        if (!email) {
            throw new ApiError(401, "Microsoft profile did not include an email");
=======
        if (!email) {
            throw new ApiError(401, "Microsoft profile did not include an email address");
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        }

        return {
            email,
<<<<<<< HEAD
            fullName: (json.displayName || email.split("@")[0]).trim(),
=======
            fullName: (json.displayName || email.split("@")[0] || "Hospital User").trim(),
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        };
    }

    const emailFromToken = parseEmailFromIdToken(payload.idToken);
    if (emailFromToken) {
        return {
            email: emailFromToken,
            fullName: emailFromToken.split("@")[0],
        };
    }

<<<<<<< HEAD
    const allowUnsafe = process.env.MICROSOFT_TRUST_EMAIL_ASSERTION === "true";
    const asserted = normalizeEmail(payload.emailHint);

    if (allowUnsafe && asserted) {
        return {
            email: asserted,
            fullName: asserted.split("@")[0],
        };
    }

    throw new ApiError(401, "Microsoft login payload invalid");
=======
    const allowUnsafeAssertion = process.env.MICROSOFT_TRUST_EMAIL_ASSERTION === "true";
    const assertedEmail = normalizeEmail(payload.emailHint);
    if (allowUnsafeAssertion && assertedEmail) {
        return {
            email: assertedEmail,
            fullName: assertedEmail.split("@")[0],
        };
    }

    throw new ApiError(401, "Microsoft login payload is missing a verifiable token");
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
}

export async function POST(request: NextRequest) {
    try {
<<<<<<< HEAD
        const prisma = getPrisma(); // ✅ FIX

        const payload = (await request.json().catch(() => null)) as MicrosoftLoginPayload | null;

=======
        const payload = (await request.json().catch(() => null)) as MicrosoftLoginPayload | null;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        if (!payload) {
            throw new ApiError(400, "Invalid JSON body");
        }

        const profile = await resolveMicrosoftProfile(payload);
<<<<<<< HEAD

=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        const domain = extractDomain(profile.email);
        if (!domain) {
            throw new ApiError(403, "Unauthorized email domain");
        }

<<<<<<< HEAD
        const user = await getPrisma().user.findUnique({
            where: { email: profile.email },
            include: {
                primaryTenant: {
                    select: { code: true },
=======
        const user = await prisma.user.findUnique({
            where: { email: profile.email },
            include: {
                primaryTenant: {
                    select: {
                        code: true,
                    },
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
                },
            },
        });

        if (!user) {
<<<<<<< HEAD
            throw new ApiError(403, "Account not eligible for Microsoft login");
=======
            throw new ApiError(403, "Account is not eligible for Microsoft sign-in");
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        }

        const domainAllowed = await isTenantDomainAllowed(user.tenantId, domain);
        if (!domainAllowed) {
            throw new ApiError(403, "Unauthorized Microsoft domain");
        }

<<<<<<< HEAD
        const expectedUserType = userTypeForUserRole(user.role, user.email);

        if (!user.fullName || user.fullName === user.email) {
            await getPrisma().user.update({
                where: { id: user.id },
                data: {
                    fullName: profile.fullName,
                    userType: expectedUserType,
                },
            });
        } else if (user.userType !== expectedUserType) {
            await getPrisma().user.update({
                where: { id: user.id },
                data: {
                    userType: expectedUserType,
=======
        if (!user.fullName || user.fullName === user.email) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    fullName: profile.fullName,
                    userType: userTypeForUserRole(user.role, user.email),
                },
            });
        } else if (user.userType !== userTypeForUserRole(user.role, user.email)) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    userType: userTypeForUserRole(user.role, user.email),
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
                },
            });
        }

<<<<<<< HEAD
        if (!user.isActive) {
            throw new ApiError(403, "Account is deactivated");
        }

        await getPrisma().$executeRaw`
            UPDATE users
            SET auth_provider = 'microsoft',
                status = 'active',
                last_login_at = NOW()
            WHERE id = ${user.id}
        `;

        const now = Math.floor(Date.now() / 1000);
        const exp = now + getTokenTtlSeconds();

        const userType = userTypeForUserRole(user.role, user.email);
        const platformRole = platformRoleForUserRole(user.role);
=======
        // Only block login if the account is explicitly deactivated.
        // License/role/membership checks happen post-login, not here.
        if (!user.isActive) {
            console.warn("[auth.microsoft] login blocked — user is inactive", { userId: user.id, email: user.email });
            throw new ApiError(403, "Account is deactivated");
        }

        await prisma.$executeRaw`
          UPDATE users
          SET auth_provider = 'microsoft',
              status = 'active',
              last_login_at = NOW()
          WHERE id = ${user.id}
        `;

        const secret = getJwtSecret();
        const now = Math.floor(Date.now() / 1000);
        const exp = now + getTokenTtlSeconds();
        const platformRole = platformRoleForUserRole(user.role);
        const userType = userTypeForUserRole(user.role, user.email);
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

        const accessToken = createAccessToken(
            {
                sub: user.id,
                email: user.email,
                role: user.role,
                user_type:
                    userType === "PLATFORM_ADMIN"
                        ? "platform_admin"
                        : userType === "TENANT_ADMIN"
                            ? "tenant_admin"
                            : "tenant_user",
                platform_role: platformRole,
                tenant_id: user.tenantId,
                tenant_code: user.primaryTenant?.code || null,
                exp,
            },
<<<<<<< HEAD
            getJwtSecret()
=======
            secret,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        );

        const response = NextResponse.json({
            authenticated: true,
            provider: "microsoft",
<<<<<<< HEAD
=======
            autoProvisioned: false,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            redirectTo: userType === "PLATFORM_ADMIN" ? "/platform" : "/dashboard",
            userType:
                userType === "PLATFORM_ADMIN"
                    ? "platform_admin"
                    : userType === "TENANT_ADMIN"
                        ? "tenant_admin"
                        : "tenant_user",
        });
<<<<<<< HEAD

        response.cookies.set(
            getSessionCookieName(),
            accessToken,
            buildSessionCookieOptions(getTokenTtlSeconds(), request)
=======
        response.cookies.set(
            getSessionCookieName(),
            accessToken,
            buildSessionCookieOptions(getTokenTtlSeconds(), request),
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        );

        return response;
    } catch (error) {
        return handleApiError(error);
    }
}
