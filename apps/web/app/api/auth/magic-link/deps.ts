import type { Prisma } from "@prisma/client";
import { after, type NextRequest } from "next/server";

import { normalizeEmail } from "@/lib/server/auth-domain-policy";
import {
    buildWathiqCareEmailHtml,
    buildWathiqCareEmailText,
    sendEmailWithDiagnostics,
} from "@/lib/server/email-provider";
import type {
    MagicLinkRequestFlowDeps,
    MagicLinkVerifyFlowDeps,
} from "@/lib/server/magic-link-route-flow";
import { issueMagicLinkForUser, magicLinkAuth, verifyMagicLink } from "@/lib/server/magic-link-auth";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { getSessionCookieName } from "@/lib/server/sessionCookie";
import { getTokenTtlSeconds } from "@/lib/server/auth-token";
import { hashResetToken } from "@/lib/server/password";

const MAGIC_LINK_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAGIC_LINK_REQUEST_LIMIT = 5;
const MAGIC_LINK_VERIFY_WINDOW_MS = 10 * 60 * 1000;
const MAGIC_LINK_VERIFY_LIMIT = 10;

function readBooleanEnv(value: string | undefined, fallback: boolean): boolean {
    if (value == null) {
        return fallback;
    }

    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function normalizeClientIp(value: string | null | undefined): string | null {
    const normalized = (value || "").trim().toLowerCase();
    if (!normalized || normalized === "unknown") {
        return null;
    }

    return normalized;
}

function readTrustedClientIp(request: NextRequest): string | null {
    const trustProxyHeaders = readBooleanEnv(
        process.env.AUTH_TRUST_PROXY_HEADERS,
        process.env.NODE_ENV === "production",
    );

    if (!trustProxyHeaders) {
        return null;
    }

    const forwarded = request.headers.get("x-forwarded-for") ?? "";
    const first = forwarded.split(",")[0]?.trim();
    return normalizeClientIp(first) ?? normalizeClientIp(request.headers.get("x-real-ip"));
}

function scheduleAfterResponse(task: () => Promise<void>): void {
    try {
        after(task);
    } catch (error) {
        console.error("MAGIC_LINK_AFTER_FALLBACK", error);
        void task().catch((taskError) => {
            console.error("MAGIC_LINK_ASYNC_TASK_FAILED", taskError);
        });
    }
}

async function recordMagicLinkAttempt(
    prisma: ReturnType<typeof getPrisma>,
    email: string,
    success: boolean,
    reason: string | null,
    request: NextRequest,
): Promise<void> {
    try {
        const trustedIp = readTrustedClientIp(request);
        await prisma.$executeRaw`
            INSERT INTO login_attempts (email, ip_address, user_agent, success, reason)
            VALUES (
                ${email.toLowerCase()},
                ${trustedIp},
                ${request.headers.get("user-agent")},
                ${success},
                ${reason}
            )
        `;
    } catch (error) {
        console.error("MAGIC_LINK_ATTEMPT_RECORD_FAILED", error);
    }
}

async function checkMagicLinkRateLimit(
    prisma: ReturnType<typeof getPrisma>,
    email: string,
    request: NextRequest,
): Promise<{ limited: boolean; waitSeconds?: number }> {
    const trustedIp = readTrustedClientIp(request);
    const windowStartedAt = new Date(Date.now() - MAGIC_LINK_REQUEST_WINDOW_MS);
    try {
        const result = trustedIp
            ? await prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*) AS count
                FROM login_attempts
                WHERE (email = ${email.toLowerCase()} OR ip_address = ${trustedIp})
                  AND reason LIKE 'MAGIC_LINK_%'
                  AND reason NOT LIKE 'MAGIC_LINK_VERIFY_%'
                  AND created_at > ${windowStartedAt}
            `
            : await prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*) AS count
                FROM login_attempts
                WHERE email = ${email.toLowerCase()}
                  AND reason LIKE 'MAGIC_LINK_%'
                  AND reason NOT LIKE 'MAGIC_LINK_VERIFY_%'
                  AND created_at > ${windowStartedAt}
            `;

        const count = Number(result[0]?.count || 0);
        return count >= MAGIC_LINK_REQUEST_LIMIT
            ? { limited: true, waitSeconds: Math.floor(MAGIC_LINK_REQUEST_WINDOW_MS / 1000) }
            : { limited: false };
    } catch (error) {
        console.error("MAGIC_LINK_RATE_LIMIT_CHECK_FAILED", error);
        return { limited: false };
    }
}

function buildMagicLinkVerifyAttemptKey(token: string): string {
    const normalized = token.trim() || "empty";
    return `magic-link-verify:${hashResetToken(normalized).slice(0, 16)}`;
}

async function recordMagicLinkVerifyAttempt(
    prisma: ReturnType<typeof getPrisma>,
    token: string,
    success: boolean,
    reason: string | null,
    request: NextRequest,
): Promise<void> {
    try {
        const trustedIp = readTrustedClientIp(request);
        await prisma.$executeRaw`
            INSERT INTO login_attempts (email, ip_address, user_agent, success, reason)
            VALUES (
                ${buildMagicLinkVerifyAttemptKey(token)},
                ${trustedIp},
                ${request.headers.get("user-agent")},
                ${success},
                ${reason}
            )
        `;
    } catch (error) {
        console.error("MAGIC_LINK_VERIFY_ATTEMPT_RECORD_FAILED", error);
    }
}

async function checkMagicLinkVerifyRateLimit(
    prisma: ReturnType<typeof getPrisma>,
    token: string,
    request: NextRequest,
): Promise<{ limited: boolean; waitSeconds?: number }> {
    const trustedIp = readTrustedClientIp(request);
    const attemptKey = buildMagicLinkVerifyAttemptKey(token);
    const windowStartedAt = new Date(Date.now() - MAGIC_LINK_VERIFY_WINDOW_MS);

    try {
        const result = trustedIp
            ? await prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*) AS count
                FROM login_attempts
                WHERE (email = ${attemptKey} OR ip_address = ${trustedIp})
                  AND reason LIKE 'MAGIC_LINK_VERIFY_%'
                  AND success = FALSE
                  AND created_at > ${windowStartedAt}
            `
            : await prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*) AS count
                FROM login_attempts
                WHERE email = ${attemptKey}
                  AND reason LIKE 'MAGIC_LINK_VERIFY_%'
                  AND success = FALSE
                  AND created_at > ${windowStartedAt}
            `;

        const count = Number(result[0]?.count || 0);
        return count >= MAGIC_LINK_VERIFY_LIMIT
            ? { limited: true, waitSeconds: Math.floor(MAGIC_LINK_VERIFY_WINDOW_MS / 1000) }
            : { limited: false };
    } catch (error) {
        console.error("MAGIC_LINK_VERIFY_RATE_LIMIT_CHECK_FAILED", error);
        return { limited: false };
    }
}

async function sendMagicLinkEmail(args: {
    user: Awaited<ReturnType<typeof magicLinkAuth>>;
    magic: Awaited<ReturnType<typeof issueMagicLinkForUser>>;
}): Promise<void> {
    scheduleAfterResponse(async () => {
        const html = buildWathiqCareEmailHtml({
            title: "Your secure WathiqCare sign-in link",
            preheader: "Use this one-time link to access your WathiqCare account.",
            bodyHtml: `
          <p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.7;">Hello ${args.user.fullName},</p>
          <p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.7;">
            Use the secure link below to sign in to <strong>WathiqCare</strong>. This link can only be used once.
          </p>
        `,
            ctaUrl: args.magic.magicUrl,
            ctaText: "Sign in to WathiqCare",
            expiresNote: `This link expires in ${args.magic.expiresMinutes} minutes and can only be used once.`,
            securityNote: "This link was requested from the WathiqCare sign-in page.",
        });

        const text = buildWathiqCareEmailText({
            title: "Your secure WathiqCare sign-in link",
            bodyLines: [
                `Hello ${args.user.fullName},`,
                "Use the secure link below to sign in to WathiqCare.",
                "This sign-in link is valid for one use only.",
            ],
            ctaUrl: args.magic.magicUrl,
            ctaLabel: "Sign in to WathiqCare",
            expiresNote: `This link expires in ${args.magic.expiresMinutes} minutes.`,
            securityNote: "If you did not request this link, you can safely ignore this email.",
        });

        await sendEmailWithDiagnostics({
            to: args.user.email,
            subject: "Your WathiqCare secure sign-in link",
            html,
            text,
        });
    });
}

async function auditMagicLinkEvent(args: {
    action: string;
    tenantId?: string | null;
    userId?: string | null;
    details: string;
    metadataJson?: Record<string, unknown>;
    request: NextRequest;
}): Promise<void> {
    if (!args.tenantId || !args.userId) {
        return;
    }

    return writeAuditLog({
        tenantId: args.tenantId,
        userId: args.userId,
        entityType: "auth",
        entityId: args.userId,
        action: args.action,
        details: args.details,
        metadataJson: args.metadataJson as JsonInputValue,
        request: args.request,
    });
}

export function createMagicLinkRequestDeps(request: NextRequest): MagicLinkRequestFlowDeps {
    const prisma = getPrisma();

    return {
        normalizeEmail,
        findUser: magicLinkAuth,
        createToken: issueMagicLinkForUser,
        sendEmail: sendMagicLinkEmail,
        auditLog(args) {
            return auditMagicLinkEvent({
                action: args.action,
                tenantId: args.tenantId,
                userId: args.userId,
                details: args.details,
                metadataJson: args.metadataJson,
                request,
            });
        },
        checkRateLimit(email) {
            return checkMagicLinkRateLimit(prisma, email, request);
        },
        recordAttempt(email, success, reason) {
            return recordMagicLinkAttempt(prisma, email, success, reason, request);
        },
    };
}

export function createMagicLinkVerifyDeps(request: NextRequest): MagicLinkVerifyFlowDeps {
    const prisma = getPrisma();

    return {
        checkRateLimit(token) {
            return checkMagicLinkVerifyRateLimit(prisma, token, request);
        },
        recordAttempt(token, success, reason) {
            return recordMagicLinkVerifyAttempt(prisma, token, success, reason, request);
        },
        verifyToken: verifyMagicLink,
        auditLog(args) {
            return auditMagicLinkEvent({
                action: args.action,
                tenantId: args.tenantId,
                userId: args.userId,
                details: args.details,
                metadataJson: args.metadataJson,
                request,
            });
        },
        getSessionCookieName,
        getTokenTtlSeconds,
    };
}