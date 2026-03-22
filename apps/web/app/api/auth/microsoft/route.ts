import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { buildSessionCookieOptions, getSessionCookieName } from "@/lib/server/sessionCookie";
import { createAccessToken, getJwtSecret, getTokenTtlSeconds } from "@/lib/server/auth-token";
import { platformRoleForUserRole, userTypeForUserRole } from "@/lib/server/roles";
import {
    enforceSharedPostAuthAccess,
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
    } catch {
        return null;
    }
}

async function resolveMicrosoftProfile(payload: MicrosoftLoginPayload): Promise<MicrosoftProfile> {
    if (payload.accessToken) {
        const response = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName", {
            headers: {
                Authorization: `Bearer ${payload.accessToken}`,
            },
            cache: "no-store",
        });

        if (!response.ok) {
            throw new ApiError(401, "Microsoft token validation failed");
        }

        const json = (await response.json()) as {
            displayName?: string;
            mail?: string | null;
            userPrincipalName?: string;
        };

        const email = normalizeEmail(json.mail || json.userPrincipalName || "");
        if (!email) {
            throw new ApiError(401, "Microsoft profile did not include an email address");
        }

        return {
            email,
            fullName: (json.displayName || email.split("@")[0] || "Hospital User").trim(),
        };
    }

    const emailFromToken = parseEmailFromIdToken(payload.idToken);
    if (emailFromToken) {
        return {
            email: emailFromToken,
            fullName: emailFromToken.split("@")[0],
        };
    }

    const allowUnsafeAssertion = process.env.MICROSOFT_TRUST_EMAIL_ASSERTION === "true";
    const assertedEmail = normalizeEmail(payload.emailHint);
    if (allowUnsafeAssertion && assertedEmail) {
        return {
            email: assertedEmail,
            fullName: assertedEmail.split("@")[0],
        };
    }

    throw new ApiError(401, "Microsoft login payload is missing a verifiable token");
}

export async function POST(request: NextRequest) {
    try {
        const payload = (await request.json().catch(() => null)) as MicrosoftLoginPayload | null;
        if (!payload) {
            throw new ApiError(400, "Invalid JSON body");
        }

        const profile = await resolveMicrosoftProfile(payload);
        const domain = extractDomain(profile.email);
        if (!domain) {
            throw new ApiError(403, "Unauthorized email domain");
        }

        const user = await prisma.user.findUnique({
            where: { email: profile.email },
            include: {
                primaryTenant: {
                    select: {
                        code: true,
                    },
                },
            },
        });

        if (!user) {
            throw new ApiError(403, "Account is not eligible for Microsoft sign-in");
        }

        const domainAllowed = await isTenantDomainAllowed(user.tenantId, domain);
        if (!domainAllowed) {
            throw new ApiError(403, "Unauthorized Microsoft domain");
        }

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
                },
            });
        }

        await enforceSharedPostAuthAccess({
            id: user.id,
            tenantId: user.tenantId,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            status: null,
        });

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
            secret,
        );

        const response = NextResponse.json({
            authenticated: true,
            provider: "microsoft",
            autoProvisioned: false,
            redirectTo: userType === "PLATFORM_ADMIN" ? "/platform" : "/dashboard",
            userType:
                userType === "PLATFORM_ADMIN"
                    ? "platform_admin"
                    : userType === "TENANT_ADMIN"
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
