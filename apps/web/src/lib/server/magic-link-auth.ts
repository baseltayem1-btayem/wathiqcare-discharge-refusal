import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
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
}): Promise<void> {
    const tenantId = process.env.MICROSOFT_TENANT_ID?.trim();
    const clientId = process.env.MICROSOFT_CLIENT_ID?.trim();
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim();
    const senderEmail = process.env.MICROSOFT_SENDER_EMAIL?.trim().toLowerCase();

    if (!tenantId || !clientId || !clientSecret || !senderEmail) {
        throw new Error("Microsoft Graph email configuration is missing");
    }

    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            scope: "https://graph.microsoft.com/.default",
            grant_type: "client_credentials",
        }),
        cache: "no-store",
    });

    if (!tokenResponse.ok) {
        throw new Error(`Failed to get Microsoft Graph token (${tokenResponse.status})`);
    }

    const tokenJson = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
        throw new Error("Microsoft Graph token response did not include access_token");
    }

    const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h2 style="margin-bottom: 12px;">WathiqCare Secure Login Link</h2>
      <p>Use this secure sign-in link to access your tenant workspace:</p>
      <p>
        <a href="${args.magicUrl}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Sign in securely
        </a>
      </p>
      <p>This link expires in ${args.expiresMinutes} minutes and can only be used once.</p>
      ${args.userAgentHint ? `<p style="font-size: 13px; color: #475569;">Request device hint: ${args.userAgentHint}</p>` : ""}
      <p style="font-size: 13px; color: #475569;">If you did not request this login link, you can ignore this email.</p>
    </div>
  `;

    const text = [
        "WathiqCare Secure Login Link",
        "",
        `Use this secure sign-in link: ${args.magicUrl}`,
        `This link expires in ${args.expiresMinutes} minutes and can only be used once.`,
        args.userAgentHint ? `Request device hint: ${args.userAgentHint}` : null,
        "If you did not request this login link, ignore this email.",
    ]
        .filter(Boolean)
        .join("\n");

    const sendResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`, {
        method: "POST",
        headers: {
            authorization: `Bearer ${tokenJson.access_token}`,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            message: {
                subject: "Your secure WathiqCare sign-in link",
                body: {
                    contentType: "HTML",
                    content: html,
                },
                toRecipients: [{ emailAddress: { address: args.to } }],
            },
            saveToSentItems: true,
        }),
        cache: "no-store",
    });

    if (!sendResponse.ok) {
        const detail = await sendResponse.text().catch(() => "");
        throw new Error(`Failed to send magic-link email (${sendResponse.status}): ${detail}`);
    }

    if (text.length === 0) {
        throw new Error("Email body generation failed");
    }
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

    try {
        await sendMagicLinkEmail({
            to: user.email,
            magicUrl: link,
            expiresMinutes: MAGIC_LINK_TTL_MINUTES,
            userAgentHint: request.headers.get("user-agent")?.slice(0, 180) ?? null,
        });
    } catch (error) {
        await deleteMagicLinkToken(tokenRecord.id);
        console.error("magic-link: failed to deliver email", error);
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

    const consumed = await consumeMagicLinkToken(token);

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

    await enforceUserAccess(user);
    const session = await createSessionForUser(user);

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
