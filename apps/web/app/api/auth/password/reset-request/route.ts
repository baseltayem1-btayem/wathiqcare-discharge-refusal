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

async function sendPasswordResetEmail(args: { to: string; resetLink: string; expiresMinutes: number }) {
    const subject = "Reset your WathiqCare password";

    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
        We received a request to reset the password for your WathiqCare account.
        Click the button below to choose a new password.
      </p>
      <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6;">
        If you did not request a password reset, you can safely ignore this email.
        Your password will not be changed.
      </p>
    `;

    const html = buildWathiqCareEmailHtml({
        title: "Reset Your Password",
        preheader: "Reset your WathiqCare password. This link expires in " + args.expiresMinutes + " minutes.",
        bodyHtml,
        ctaUrl: args.resetLink,
        ctaText: "Reset my password →",
        expiresNote: `This link expires in ${args.expiresMinutes} minutes and can only be used once.`,
        securityNote: "You are receiving this because a password reset was requested for your WathiqCare account.",
    });

    const text = buildWathiqCareEmailText({
        title: "Reset Your WathiqCare Password",
        bodyLines: [
            "We received a request to reset the password for your WathiqCare account.",
            "Use the link below to choose a new password.",
            "",
            "If you did not request a password reset, please ignore this email.",
        ],
        ctaUrl: args.resetLink,
        ctaLabel: "Reset password",
        expiresNote: `This link expires in ${args.expiresMinutes} minutes and can only be used once.`,
        securityNote: "You are receiving this because a password reset was requested for your account.",
    });

    return sendEmailWithDiagnostics({ to: args.to, subject, html, text });
}

function readResetBaseUrl(): string {
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_BASE_URL?.trim();
    if (configured) {
        return configured.replace(/\/$/, "");
    }
    return "https://wathiqcare.online";
}

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

    // Store token
    const tokenId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used)
      VALUES (${tokenId}, ${user.id}, ${tokenHash}, ${expiresAt}, FALSE)
    `;

    // Invalidate all previous unused tokens for this user
    await prisma.$executeRaw`
      UPDATE password_reset_tokens
      SET used = TRUE
      WHERE user_id = ${user.id} AND id != ${tokenId}
    `;

    // Build reset link
    const resetLink = `${readResetBaseUrl()}/auth/password-reset?token=${encodeURIComponent(rawToken)}`;

    // Send email
    try {
        console.info("RESET_EMAIL_SEND_STARTED", { tokenId, userId: user.id, to: user.email });
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
