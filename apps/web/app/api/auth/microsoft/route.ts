import { NextRequest, NextResponse } from "next/server";
import { MembershipStatus, Prisma } from "@prisma/client";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { buildSessionCookieOptions, getSessionCookieName } from "@/lib/server/sessionCookie";
import { createAccessToken, getJwtSecret, getTokenTtlSeconds } from "@/lib/server/auth-token";
import { canonicalizeUserRole, membershipRoleForUserRole, platformRoleForUserRole } from "@/lib/server/roles";
import { enforceSeatLimit, syncActiveUserUsage } from "@/lib/server/saas-services";

type MicrosoftLoginPayload = {
    accessToken?: string;
    idToken?: string;
    emailHint?: string;
};

type MicrosoftProfile = {
    email: string;
    fullName: string;
};

type TenantPolicy = {
    requireApprovalForMicrosoftLogin: boolean;
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
        return email ? email.trim().toLowerCase() : null;
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

        const email = (json.mail || json.userPrincipalName || "").trim().toLowerCase();
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
    const assertedEmail = payload.emailHint?.trim().toLowerCase();
    if (allowUnsafeAssertion && assertedEmail) {
        return {
            email: assertedEmail,
            fullName: assertedEmail.split("@")[0],
        };
    }

    throw new ApiError(401, "Microsoft login payload is missing a verifiable token");
}

function getAllowedDomains(tenant: { domain: string | null; metadata: unknown }): string[] {
    const domains = new Set<string>();
    if (tenant.domain) {
        domains.add(tenant.domain.toLowerCase());
    }

    if (tenant.metadata && typeof tenant.metadata === "object" && !Array.isArray(tenant.metadata)) {
        const metadata = tenant.metadata as Record<string, unknown>;
        const sso = metadata.sso;
        if (sso && typeof sso === "object" && !Array.isArray(sso)) {
            const allowedDomains = (sso as Record<string, unknown>).allowedDomains;
            if (Array.isArray(allowedDomains)) {
                for (const value of allowedDomains) {
                    if (typeof value === "string" && value.trim()) {
                        domains.add(value.trim().toLowerCase());
                    }
                }
            }
        }
    }

    return Array.from(domains);
}

async function resolveTenantForDomain(domain: string) {
    const tenants = await prisma.tenant.findMany({
        where: { isActive: true },
        select: {
            id: true,
            code: true,
            name: true,
            domain: true,
            metadata: true,
        },
    });

    const normalizedDomain = domain.toLowerCase();
    const matched = tenants.find((tenant) => {
        const domains = getAllowedDomains({ domain: tenant.domain, metadata: tenant.metadata });
        return domains.includes(normalizedDomain);
    });

    if (matched) return matched;

    if (normalizedDomain === "imc.med.sa") {
        const imc = tenants.find((tenant) => tenant.code.toUpperCase() === "IMC");
        if (imc) return imc;
    }

    return null;
}

async function resolvePreRegistration(tenantId: string, email: string): Promise<{ role?: string; departmentCode?: string; activate?: boolean } | null> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { metadata: true } });
    if (!tenant?.metadata || typeof tenant.metadata !== "object" || Array.isArray(tenant.metadata)) {
        return null;
    }

    const metadata = tenant.metadata as Record<string, unknown>;
    const adminConfig = metadata.adminConfig;
    if (!adminConfig || typeof adminConfig !== "object" || Array.isArray(adminConfig)) {
        return null;
    }

    const preRegistered = (adminConfig as Record<string, unknown>).preRegisteredUsers;
    if (!Array.isArray(preRegistered)) {
        return null;
    }

    const hit = preRegistered.find((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
        const candidateEmail = String((entry as Record<string, unknown>).email || "").trim().toLowerCase();
        return candidateEmail === email;
    });

    if (!hit || typeof hit !== "object" || Array.isArray(hit)) {
        return null;
    }

    const record = hit as Record<string, unknown>;
    return {
        role: typeof record.role === "string" ? record.role : undefined,
        departmentCode: typeof record.departmentCode === "string" ? record.departmentCode : undefined,
        activate: typeof record.activate === "boolean" ? record.activate : undefined,
    };
}

function resolveTenantPolicy(metadata: unknown): TenantPolicy {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        return { requireApprovalForMicrosoftLogin: false };
    }

    const root = metadata as Record<string, unknown>;
    const adminConfig = root.adminConfig;
    if (!adminConfig || typeof adminConfig !== "object" || Array.isArray(adminConfig)) {
        return { requireApprovalForMicrosoftLogin: false };
    }

    const requireApproval = (adminConfig as Record<string, unknown>).requireApprovalForMicrosoftLogin;
    return {
        requireApprovalForMicrosoftLogin: requireApproval === true,
    };
}

export async function POST(request: NextRequest) {
    try {
        const payload = (await request.json().catch(() => null)) as MicrosoftLoginPayload | null;
        if (!payload) {
            throw new ApiError(400, "Invalid JSON body");
        }

        const profile = await resolveMicrosoftProfile(payload);
        const domain = profile.email.split("@")[1]?.toLowerCase();
        if (!domain) {
            throw new ApiError(403, "Unauthorized email domain");
        }

        const tenant = await resolveTenantForDomain(domain);
        if (!tenant) {
            throw new ApiError(403, "Unauthorized Microsoft domain");
        }

        const preRegistration = await resolvePreRegistration(tenant.id, profile.email);
        const tenantPolicy = resolveTenantPolicy(tenant.metadata);
        const shouldActivate = preRegistration?.activate ?? !tenantPolicy.requireApprovalForMicrosoftLogin;
        const defaultRole = canonicalizeUserRole(preRegistration?.role ?? "viewer");

        let user = await prisma.user.findUnique({ where: { email: profile.email } });

        if (!user) {
            if (shouldActivate) {
                await enforceSeatLimit(tenant.id, 1);
            }
            user = await prisma.user.create({
                data: {
                    tenantId: tenant.id,
                    email: profile.email,
                    fullName: profile.fullName,
                    role: defaultRole,
                    isActive: shouldActivate,
                    hashedPassword: null,
                },
            });
        } else {
            if (user.tenantId !== tenant.id) {
                throw new ApiError(403, "User is linked to a different tenant");
            }
            if (!user.isActive && shouldActivate) {
                throw new ApiError(403, "User account is inactive");
            }

            if (!user.fullName || user.fullName === user.email) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { fullName: profile.fullName },
                });
            }
        }

        const existingMembership = await prisma.tenantMembership.findUnique({
            where: {
                tenantId_userId: {
                    tenantId: tenant.id,
                    userId: user.id,
                },
            },
        });

        if (shouldActivate && (!existingMembership || existingMembership.status !== MembershipStatus.ACTIVE)) {
            await enforceSeatLimit(tenant.id, 1);
        }

        const membershipMetadata: Prisma.JsonObject | undefined = preRegistration?.departmentCode
            ? ({ departmentCode: preRegistration.departmentCode } as Prisma.JsonObject)
            : undefined;

        await prisma.tenantMembership.upsert({
            where: {
                tenantId_userId: {
                    tenantId: tenant.id,
                    userId: user.id,
                },
            },
            update: {
                status: shouldActivate ? MembershipStatus.ACTIVE : MembershipStatus.INVITED,
                role: membershipRoleForUserRole(canonicalizeUserRole(user.role)),
                metadata: membershipMetadata,
            },
            create: {
                tenantId: tenant.id,
                userId: user.id,
                status: shouldActivate ? MembershipStatus.ACTIVE : MembershipStatus.INVITED,
                role: membershipRoleForUserRole(canonicalizeUserRole(user.role)),
                metadata: membershipMetadata,
            },
        });

        await syncActiveUserUsage(tenant.id);

        if (!shouldActivate) {
            throw new ApiError(403, "Account is pending tenant admin approval");
        }

        const secret = getJwtSecret();
        const now = Math.floor(Date.now() / 1000);
        const exp = now + getTokenTtlSeconds();
        const platformRole = platformRoleForUserRole(user.role);

        const accessToken = createAccessToken(
            {
                sub: user.id,
                email: user.email,
                role: user.role,
                platform_role: platformRole,
                tenant_id: user.tenantId,
                tenant_code: tenant.code,
                exp,
            },
            secret,
        );

        const response = NextResponse.json({ authenticated: true, provider: "microsoft", autoProvisioned: true });
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
