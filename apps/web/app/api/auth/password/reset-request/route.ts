import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { normalizeEmail } from "@/lib/server/auth-domain-policy";
import { generateResetToken, hashResetToken } from "@/lib/server/password";
import {
    buildWathiqCareEmailHtml,
    buildWathiqCareEmailText,
    sendEmailWithDiagnostics,
} from "@/lib/server/email-provider";

const PASSWORD_RESET_TTL_MINUTES = 30;

type PasswordResetRequestPayload = {
    email?: string;
};

function isMissingTableOrColumnError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const err = error as { code?: unknown; meta?: { code?: unknown } };
    const code = err.code ? String(err.code) : "";
    const sqlState = err.meta?.code ? String(err.meta.code) : "";
    return (
        code === "P2021" ||
        code === "P2022" ||
        (code === "P2010" && (sqlState === "42P01" || sqlState === "42703"))
    );
}

function readResetBaseUrl(): string {
    const configured =
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.APP_BASE_URL?.trim();
    if (configured) {
        return configured.replace(/\/$/, "");
    }
    return "https://wathiqcare.online";
}

async function sendPasswordResetEmail(args: {
    to: string;
    resetLink: string;
    expiresMinutes: number;
}): Promise<{ [key: string]: unknown }> {
    const html = buildWathiqCareEmailHtml({
        title: "Reset Your WathiqCare Password",
        preheader: "Password reset request",
        bodyHtml: `
            <p>We received a request to reset your WathiqCare password. Click the button below to set a new password:</p>
        `,
        ctaUrl: args.resetLink,
        ctaText: "Reset Password",
        expiresNote: `This link expires in ${args.expiresMinutes} minutes`,
        securityNote: "If you did not request a password reset, you can ignore this email. Your password will remain unchanged.",
    });

    const text = buildWathiqCareEmailText({
        title: "Reset Your WathiqCare Password",
        bodyLines: [
            "We received a request to reset your WathiqCare password.",
            "Click the link below to set a new password:",
        ],
        ctaUrl: args.resetLink,
        ctaLabel: "Reset Password",
        expiresNote: `This link expires in ${args.expiresMinutes} minutes`,
        securityNote: "If you did not request a password reset, you can ignore this email. Your password will remain unchanged.",
    });

    return await sendEmailWithDiagnostics({
        to: args.to,
        subject: "Reset Your WathiqCare Password",
        html,
        text,
    });
}
export async function POST(request: NextRequest) {
    try {
        const prisma = getPrisma();
        console.info("PASSWORD_RESET_REQUESTED");

        const payload = (await request.json().catch(() => null)) as PasswordResetRequestPayload | null;
        if (!payload) {
            throw new ApiError(400, "Invalid JSON body");
        }

        const { email: emailInput } = payload;
        const email = normalizeEmail(emailInput || "");

        if (!email) {
            // Non-specific response to prevent email enumeration
            return NextResponse.json({ message: "If an account exists with this email, a password reset link has been sent." });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, hashedPassword: true },
        });

        // Non-specific response to prevent email enumeration
        if (!user) {
            return NextResponse.json({ message: "If an account exists with this email, a password reset link has been sent." });
        }

        // Generate reset token
        const rawToken = generateResetToken();
        const tokenHash = hashResetToken(rawToken);
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

        const tokenId = crypto.randomUUID();
        let usedLegacyUserColumns = false;
        try {
            // Store token in dedicated table when available.
            await prisma.$executeRaw`
                INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used)
                VALUES (${tokenId}, ${user.id}, ${tokenHash}, ${expiresAt}, FALSE)
            `;

            // Invalidate all previous unused tokens for this user.
            await prisma.$executeRaw`
                UPDATE password_reset_tokens
                SET used = TRUE
                WHERE user_id = ${user.id} AND id != ${tokenId}
            `;
        } catch (tokenStoreError) {
            if (!isMissingTableOrColumnError(tokenStoreError)) {
                throw tokenStoreError;
            }

            // Backward compatibility for environments that still use user-level reset columns.
            usedLegacyUserColumns = true;
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordResetTokenHash: tokenHash,
                    passwordResetExpiresAt: expiresAt,
                },
            });
        }

        // Build reset link
        const resetLink = `${readResetBaseUrl()}/auth/password-reset?token=${encodeURIComponent(rawToken)}`;

        // Send email
        try {
            console.info("RESET_EMAIL_SEND_STARTED", {
                tokenId,
                userId: user.id,
                to: user.email,
                storage: usedLegacyUserColumns ? "legacy_user_columns" : "password_reset_tokens",
            });
            const diagnostics = await sendPasswordResetEmail({
                to: user.email,
                resetLink,
                expiresMinutes: PASSWORD_RESET_TTL_MINUTES,
            });
            console.info("EMAIL_SENT_SUCCESS", {
                event: "password_reset",
                tokenId,
                userId: user.id,
                to: user.email,
                provider: diagnostics.provider,
                smtpVerifyOk: diagnostics.smtpVerifyOk,
                smtpAccepted: diagnostics.smtpAccepted,
                messageId: diagnostics.messageId,
            });
        } catch (error) {
            console.error("EMAIL_SENT_FAILURE", {
                event: "password_reset",
                tokenId,
                userId: user.id,
                to: user.email,
                error: error instanceof Error ? error.message : String(error),
            });
            // Still return success to prevent information leakage
        }

        return NextResponse.json({ message: "If an account exists with this email, a password reset link has been sent." });
    } catch (error) {
        return handleApiError(error);
    }
}
