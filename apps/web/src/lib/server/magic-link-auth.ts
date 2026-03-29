import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { platformRoleForUserRole, userTypeForUserRole } from "@/lib/server/roles";
import { createAccessToken, getJwtSecret, getTokenTtlSeconds } from "@/lib/server/auth-token";
import {
    enforceSharedPostAuthAccess,
    extractDomain,
    hasAnyActiveTenantForDomain,
    isTenantDomainAllowed,
    normalizeEmail,
    PostAuthAccessError,
} from "@/lib/server/auth-domain-policy";
import {
    buildWathiqCareEmailHtml,
    buildWathiqCareEmailText,
    sendEmailWithDiagnostics,
} from "@/lib/server/email-provider";

const MAGIC_LINK_TTL_MINUTES = 10;
const DEFAULT_MAGIC_LINK_BASE_URL = "https://wathiqcare.online";

const EMAIL_WINDOW_MS = 10 * 60 * 1000;
const EMAIL_MAX_REQUESTS = 4;
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX_REQUESTS = 20;

type RateEntry = { timestamps: number[] };
const emailRateState = new Map<string, RateEntry>();
const ipRateState = new Map<string, RateEntry>();

export type MagicLinkRequestResult = {
    accepted: boolean;
    deliveryAttempted: boolean;
    userId?: string;
    tenantId?: string;
    rejectionReason?: "INVALID_EMAIL" | "DOMAIN_NOT_ALLOWED" | "USER_NOT_FOUND" | "USER_DOMAIN_MISMATCH";
};

export type MagicLinkRequestDecisionInput = {
    validEmail: boolean;
    domainAllowed: boolean;
    userExists: boolean;
    userDomainEligible: boolean;
};

export function evaluateMagicLinkRequestDecision(input: MagicLinkRequestDecisionInput): MagicLinkRequestResult["rejectionReason"] | null {
    if (!input.validEmail) {
        return "INVALID_EMAIL";
    }
    if (!input.domainAllowed) {
        return "DOMAIN_NOT_ALLOWED";
    }
    if (!input.userExists) {
        return "USER_NOT_FOUND";
    }
    if (!input.userDomainEligible) {
        return "USER_DOMAIN_MISMATCH";
    }

    return null;
}

export type MagicLinkVerifyResult = {
    authenticated: true;
    redirectTo: string;
    userType: "platform_admin" | "tenant_admin" | "tenant_user";
    accessToken: string;
};

export type AccessDeniedError = PostAuthAccessError;

type MagicLinkUserRow = {
    id: string;
    email: string;
    role: string | null;
    tenant_id: string;
    is_active: boolean;
    status: string | null;
    tenant_is_active: boolean;
};

type MagicLinkTokenRow = {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    used: boolean;
};

function hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRawToken(): string {
    return crypto.randomBytes(32).toString("base64url");
}

function readRequestIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for") || "";
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
        return first;
    }
    return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function trimRateWindow(now: number, entry: RateEntry, windowMs: number): void {
    entry.timestamps = entry.timestamps.filter((ts) => now - ts <= windowMs);
}

function isRateLimited(state: Map<string, RateEntry>, key: string, windowMs: number, maxRequests: number): boolean {
    if (!key) {
        return false;
    }

    const now = Date.now();
    const entry = state.get(key) || { timestamps: [] };
    trimRateWindow(now, entry, windowMs);

    if (entry.timestamps.length >= maxRequests) {
        state.set(key, entry);
        return true;
    }

    entry.timestamps.push(now);
    state.set(key, entry);
    return false;
}

function readMagicLinkBaseUrl(): string {
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_BASE_URL?.trim();
    if (configured) {
        return configured.replace(/\/$/, "");
    }

    return DEFAULT_MAGIC_LINK_BASE_URL;
}

async function findUserByEmail(email: string): Promise<MagicLinkUserRow | null> {
    const users = await prisma.$queryRaw<MagicLinkUserRow[]>`
    SELECT
            u.id,
            u.email,
            u.role,
            u.tenant_id,
            u.is_active,
            u.status,
            t.is_active AS tenant_is_active
        FROM users u
        INNER JOIN tenants t ON t.id = u.tenant_id
        WHERE lower(u.email) = ${email}
    LIMIT 1
  `;

    return users[0] ?? null;
}

async function rotateMagicLinkToken(userId: string, tokenHash: string): Promise<{ id: string; expiresAt: Date }> {
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000);

    await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
                    UPDATE magic_link_tokens
                    SET used = TRUE, used_at = NOW()
                    WHERE user_id = ${userId}
                        AND used = FALSE
                        AND expires_at > NOW()
                `;

        await tx.$executeRaw`
                    INSERT INTO magic_link_tokens (id, user_id, token_hash, expires_at, used)
                    VALUES (${id}, ${userId}, ${tokenHash}, ${expiresAt}, FALSE)
                `;
    });

    return { id, expiresAt };
}

export async function issueMagicLinkForUser(userId: string): Promise<{
    tokenId: string;
    rawToken: string;
    magicUrl: string;
    expiresAt: Date;
    expiresMinutes: number;
}> {
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const tokenRecord = await rotateMagicLinkToken(userId, tokenHash);
    const magicUrl = `${readMagicLinkBaseUrl()}/auth/magic?token=${encodeURIComponent(rawToken)}`;
    return {
        tokenId: tokenRecord.id,
        rawToken,
        magicUrl,
        expiresAt: tokenRecord.expiresAt,
        expiresMinutes: MAGIC_LINK_TTL_MINUTES,
    };
}

async function deleteMagicLinkToken(tokenId: string): Promise<void> {
    await prisma.$executeRaw`
    DELETE FROM magic_link_tokens
    WHERE id = ${tokenId}
  `;
}

async function sendMagicLinkEmail(args: {
    to: string;
    magicUrl: string;
    expiresMinutes: number;
    userAgentHint: string | null;
}): Promise<ReturnType<typeof sendEmailWithDiagnostics>> {
    const subject = "Your secure WathiqCare sign-in link";

    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
        You requested a secure one-time sign-in link for your WathiqCare account.
        Click the button below to sign in instantly — no password required.
      </p>
      ${args.userAgentHint ? `<p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6;">Request received from: <span style="font-family:monospace;background:#f1f5f9;padding:2px 6px;border-radius:4px;">${args.userAgentHint.slice(0, 120)}</span></p>` : ""}
    `;

    const html = buildWathiqCareEmailHtml({
        title: "Your Secure Sign-In Link",
        preheader: "Use this one-time link to sign in to WathiqCare. It expires in " + args.expiresMinutes + " minutes.",
        bodyHtml,
        ctaUrl: args.magicUrl,
        ctaText: "Sign in to WathiqCare →",
        expiresNote: `This link expires in ${args.expiresMinutes} minutes and can only be used once.`,
        securityNote: "You are receiving this because a sign-in was requested for your account.",
    });

    const text = buildWathiqCareEmailText({
        title: "Your Secure WathiqCare Sign-In Link",
        bodyLines: [
            "You requested a secure one-time sign-in link for your WathiqCare account.",
            "Use the link below to sign in — no password required.",
            ...(args.userAgentHint ? [`Request from: ${args.userAgentHint.slice(0, 120)}`] : []),
        ],
        ctaUrl: args.magicUrl,
        ctaLabel: "Sign in",
        expiresNote: `This link expires in ${args.expiresMinutes} minutes and can only be used once.`,
        securityNote: "You are receiving this because a sign-in was requested for your account.",
    });

    return sendEmailWithDiagnostics({ to: args.to, subject, html, text });
}

async function enforceUserAccess(user: MagicLinkUserRow): Promise<void> {
    await enforceSharedPostAuthAccess({
        id: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        status: user.status,
    });
}

async function consumeMagicLinkToken(rawToken: string): Promise<MagicLinkTokenRow> {
    const tokenHash = hashToken(rawToken);

    return prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<MagicLinkTokenRow[]>`
      SELECT id, user_id, token_hash, expires_at, used
      FROM magic_link_tokens
      WHERE token_hash = ${tokenHash}
      LIMIT 1
      FOR UPDATE
    `;

        const token = rows[0];
        if (!token) {
            throw new ApiError(400, "Invalid token");
        }

        if (token.used) {
            throw new ApiError(400, "Link already used");
        }

        if (token.expires_at.getTime() <= Date.now()) {
            throw new ApiError(400, "Link expired");
        }

        await tx.$executeRaw`
      UPDATE magic_link_tokens
      SET used = TRUE, used_at = NOW()
      WHERE id = ${token.id}
    `;

        return token;
    });
}

async function createSessionForUser(user: MagicLinkUserRow): Promise<MagicLinkVerifyResult> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenant_id },
        select: { code: true },
    });

    const role = (user.role || "").trim();
    const userType = userTypeForUserRole(role, user.email);
    const platformRole = platformRoleForUserRole(role);

    const secret = getJwtSecret();
    const now = Math.floor(Date.now() / 1000);
    const exp = now + getTokenTtlSeconds();

    const accessToken = createAccessToken(
        {
            sub: user.id,
            email: user.email,
            role,
            user_type:
                userType === "PLATFORM_ADMIN"
                    ? "platform_admin"
                    : userType === "TENANT_ADMIN"
                        ? "tenant_admin"
                        : "tenant_user",
            platform_role: platformRole,
            tenant_id: user.tenant_id,
            tenant_code: tenant?.code ?? null,
            exp,
        },
        secret,
    );

    await prisma.$executeRaw`
    UPDATE users
    SET auth_provider = 'local_magic', last_login_at = NOW()
    WHERE id = ${user.id}
  `;

    return {
        authenticated: true,
        redirectTo: userType === "PLATFORM_ADMIN" ? "/platform" : "/dashboard",
        userType:
            userType === "PLATFORM_ADMIN"
                ? "platform_admin"
                : userType === "TENANT_ADMIN"
                    ? "tenant_admin"
                    : "tenant_user",
        accessToken,
    };
}

function cleanupOldRateEntries(state: Map<string, RateEntry>, windowMs: number): void {
    const now = Date.now();
    for (const [key, entry] of state.entries()) {
        trimRateWindow(now, entry, windowMs);
        if (entry.timestamps.length === 0) {
            state.delete(key);
        }
    }
}

export async function requestMagicLink(emailInput: string, request: Request): Promise<MagicLinkRequestResult> {
    const email = normalizeEmail(emailInput || "");
    console.info("[auth.magic-link.request] received", {
        emailNormalized: !!email,
        host: request.headers.get("host") || request.headers.get("x-forwarded-host") || null,
    });
    if (!email) {
        const rejectionReason = evaluateMagicLinkRequestDecision({
            validEmail: false,
            domainAllowed: false,
            userExists: false,
            userDomainEligible: false,
        });
        return {
            accepted: true,
            deliveryAttempted: false,
            rejectionReason: rejectionReason ?? "INVALID_EMAIL",
        };
    }

    cleanupOldRateEntries(emailRateState, EMAIL_WINDOW_MS);
    cleanupOldRateEntries(ipRateState, IP_WINDOW_MS);

    const ip = readRequestIp(request);
    const emailLimited = isRateLimited(emailRateState, email, EMAIL_WINDOW_MS, EMAIL_MAX_REQUESTS);
    const ipLimited = isRateLimited(ipRateState, ip, IP_WINDOW_MS, IP_MAX_REQUESTS);

    if (emailLimited || ipLimited) {
        return {
            accepted: true,
            deliveryAttempted: false,
        };
    }

    const domain = extractDomain(email);
    if (!domain || !(await hasAnyActiveTenantForDomain(domain))) {
        console.warn("[auth.magic-link.request] rejected: domain", {
            email,
            domain,
        });
        const rejectionReason = evaluateMagicLinkRequestDecision({
            validEmail: true,
            domainAllowed: false,
            userExists: false,
            userDomainEligible: false,
        });
        return {
            accepted: true,
            deliveryAttempted: false,
            rejectionReason: rejectionReason ?? "DOMAIN_NOT_ALLOWED",
        };
    }

    const user = await findUserByEmail(email);
    if (!user) {
        console.warn("[auth.magic-link.request] rejected: user-not-found", { email });
        const rejectionReason = evaluateMagicLinkRequestDecision({
            validEmail: true,
            domainAllowed: true,
            userExists: false,
            userDomainEligible: false,
        });
        return {
            accepted: true,
            deliveryAttempted: false,
            rejectionReason: rejectionReason ?? "USER_NOT_FOUND",
        };
    }

    if (!user.tenant_is_active || !(await isTenantDomainAllowed(user.tenant_id, domain))) {
        console.warn("[auth.magic-link.request] rejected: user-domain-mismatch", {
            userId: user.id,
            tenantId: user.tenant_id,
            domain,
        });
        const rejectionReason = evaluateMagicLinkRequestDecision({
            validEmail: true,
            domainAllowed: true,
            userExists: true,
            userDomainEligible: false,
        });
        return {
            accepted: true,
            deliveryAttempted: false,
            rejectionReason: rejectionReason ?? "USER_DOMAIN_MISMATCH",
        };
    }

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const tokenRecord = await rotateMagicLinkToken(user.id, tokenHash);

    const link = `${readMagicLinkBaseUrl()}/auth/magic?token=${encodeURIComponent(rawToken)}`;
    console.info("[auth.magic-link.request] token-created", {
        userId: user.id,
        tenantId: user.tenant_id,
        tokenId: tokenRecord.id,
        expiresAt: tokenRecord.expiresAt.toISOString(),
        baseUrl: readMagicLinkBaseUrl(),
    });

    try {
        const diagnostics = await sendMagicLinkEmail({
            to: user.email,
            magicUrl: link,
            expiresMinutes: MAGIC_LINK_TTL_MINUTES,
            userAgentHint: request.headers.get("user-agent")?.slice(0, 180) ?? null,
        });
        console.info("MAGIC_LINK_REQUESTED", {
            userId: user.id,
            tenantId: user.tenant_id,
            tokenId: tokenRecord.id,
        });
        console.info("EMAIL_SENT_SUCCESS", {
            event: "magic_link",
            userId: user.id,
            to: user.email,
            provider: diagnostics.provider,
            smtpVerifyOk: diagnostics.smtpVerifyOk,
            smtpAccepted: diagnostics.smtpAccepted,
            messageId: diagnostics.messageId,
        });
    } catch (error) {
        await deleteMagicLinkToken(tokenRecord.id);
        console.error("EMAIL_SENT_FAILURE", {
            event: "magic_link",
            userId: user.id,
            tenantId: user.tenant_id,
            tokenId: tokenRecord.id,
            error: error instanceof Error ? error.message : String(error),
        });
    }

    return {
        accepted: true,
        deliveryAttempted: true,
        userId: user.id,
        tenantId: user.tenant_id,
    };
}

export async function verifyMagicLink(rawToken: string): Promise<{ user: MagicLinkUserRow; session: MagicLinkVerifyResult }> {
    const token = (rawToken || "").trim();
    if (!token) {
        throw new ApiError(400, "Invalid token");
    }

    console.info("[auth.magic-link.verify] received", {
        tokenLength: token.length,
    });

    const consumed = await consumeMagicLinkToken(token);
    console.info("[auth.magic-link.verify] token-consumed", {
        tokenId: consumed.id,
        userId: consumed.user_id,
    });

    const users = await prisma.$queryRaw<MagicLinkUserRow[]>`
    SELECT
            u.id,
            u.email,
            u.role,
            u.tenant_id,
            u.is_active,
            u.status,
            t.is_active AS tenant_is_active
        FROM users u
        INNER JOIN tenants t ON t.id = u.tenant_id
        WHERE u.id = ${consumed.user_id}
    LIMIT 1
  `;

    const user = users[0];
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Only block on account being explicitly deactivated — license/role/membership
    // checks happen post-login and must not prevent session creation.
    if (!user.is_active) {
        throw new ApiError(403, "Account is deactivated");
    }
    if (!user.tenant_is_active) {
        console.warn("[auth.magic-link] tenant inactive — session created but access restricted post-login", { userId: user.id, tenantId: user.tenant_id });
    }

    const session = await createSessionForUser(user);
    console.info("[auth.magic-link.verify] session-created", {
        userId: user.id,
        tenantId: user.tenant_id,
        redirectTo: session.redirectTo,
        userType: session.userType,
    });

    return { user, session };
}

export function isMagicLinkDeniedError(error: unknown): error is AccessDeniedError {
    return error instanceof PostAuthAccessError;
}

export function toAccessDeniedMetadata(error: AccessDeniedError): Prisma.JsonObject {
    return {
        code: error.code,
        message: error.message,
    };
}
