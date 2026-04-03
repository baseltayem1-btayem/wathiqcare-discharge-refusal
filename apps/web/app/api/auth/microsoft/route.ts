import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
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
    } catch {
        return null;
    }
}

async function resolveMicrosoftProfile(payload: MicrosoftLoginPayload): Promise<MicrosoftProfile> {
    if (payload.accessToken) {
        const response = await fetch(
            "https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName",
            {
                headers: { Authorization: `Bearer ${payload.accessToken}` },
                cache: "no-store",
            }
        );

        if (!response.ok) {
            throw new ApiError(401, "Microsoft token validation failed");
        }

        const json = await response.json() as {
            displayName?: string;
            mail?: string | null;
            userPrincipalName?: string;
        };

        const email = normalizeEmail(json.mail || json.userPrincipalName || "");

        if (!email) {
            throw new ApiError(401, "Microsoft profile did not include an email");
        }

        return {
            email,
            fullName: (json.displayName || email.split("@")[0]).trim(),
        };
    }

    const emailFromToken = parseEmailFromIdToken(payload.idToken);
    if (emailFromToken) {
        return {
            email: emailFromToken,
            fullName: emailFromToken.split("@")[0],
        };
    }

    const allowUnsafe = process.env.MICROSOFT_TRUST_EMAIL_ASSERTION === "true";
    const asserted = normalizeEmail(payload.emailHint);

    if (allowUnsafe && asserted) {
        return {
            email: asserted,
            fullName: asserted.split("@")[0],
        };
    }

    throw new ApiError(401, "Microsoft login payload invalid");
}

export async function POST(request: NextRequest) {
    try {
        const prisma = getPrisma(); // ✅ FIX

        const payload = (await request.json().catch(() => null)) as MicrosoftLoginPayload | null;

        if (!payload) {
            throw new ApiError(400, "Invalid JSON body");
        }

        const profile = await resolveMicrosoftProfile(payload);

        const domain = extractDomain(profile.email);
        if (!domain) {
            throw new ApiError(403, "Unauthorized email domain");
        }

        const user = await getPrisma().user.findUnique({
            where: { email: profile.email },
            include: {
                primaryTenant: {
                    select: { code: true },
                },
            },
        });

        if (!user) {
            throw new ApiError(403, "Account not eligible for Microsoft login");
        }

        const domainAllowed = await isTenantDomainAllowed(user.tenantId, domain);
        if (!domainAllowed) {
            throw new ApiError(403, "Unauthorized Microsoft domain");
        }

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
                },
            });
        }

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
            getJwtSecret()
        );

        const response = NextResponse.json({
            authenticated: true,
            provider: "microsoft",
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
            buildSessionCookieOptions(getTokenTtlSeconds(), request)
        );

        return response;
    } catch (error) {
        return handleApiError(error);
    }
}
