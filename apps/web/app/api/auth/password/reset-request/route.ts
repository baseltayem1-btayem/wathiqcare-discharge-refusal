import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { normalizeEmail } from "@/lib/server/auth-domain-policy";
import { generateResetToken, hashResetToken } from "@/lib/server/password";
import { sendEmailWithDiagnostics } from "@/lib/server/email-provider";

const PASSWORD_RESET_TTL_MINUTES = 30;

type PasswordResetRequestPayload = {
    email?: string;
};

async function sendPasswordResetEmail(args: { to: string; resetLink: string; expiresMinutes: number }) {

    const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h2 style="margin-bottom: 12px;">WathiqCare Password Reset</h2>
      <p>We received a request to reset your WathiqCare password.</p>
      <p>
        <a href="${args.resetLink}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Reset your password
        </a>
      </p>
      <p>This link expires in ${args.expiresMinutes} minutes and can only be used once.</p>
      <p style="font-size: 13px; color: #475569;">If you did not request this password reset, you can ignore this email.</p>
    </div>
  `;

    const text = [
        "WathiqCare Password Reset",
        "",
        `Reset your password using this link: ${args.resetLink}`,
        `This link expires in ${args.expiresMinutes} minutes and can only be used once.`,
        "If you did not request this password reset, you can ignore this email.",
    ].join("\n");

    return sendEmailWithDiagnostics({
        to: args.to,
        subject: "WathiqCare Password Reset Request",
        html,
        text,
    });
}

function readResetBaseUrl(): string {
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_BASE_URL?.trim();
    if (configured) {
        return configured.replace(/\/$/, "");
    }
    return "https://wathiqcare.online";
}

export async function POST(request: NextRequest) {
    try {
        console.info("RESET_REQUEST_RECEIVED");

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
        console.info("RESET_TOKEN_CREATED", { userId: user.id, email: user.email });
        const rawToken = generateResetToken();
        const tokenHash = hashResetToken(rawToken);
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

        // Store token
        const tokenId = crypto.randomUUID();
        await prisma.$executeRaw`
      INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used)
      VALUES (${tokenId}, ${user.id}, ${tokenHash}, ${expiresAt}, FALSE)
    `;
        console.info("RESET_TOKEN_STORED", { tokenId, userId: user.id, expiresAt: expiresAt.toISOString() });

        // Mark old tokens as used
        await prisma.$executeRaw`
      UPDATE password_reset_tokens
      SET used = TRUE
      WHERE user_id = ${user.id} AND id != ${tokenId}
    `;

        // Build reset link
        const resetLink = `${readResetBaseUrl()}/auth/password-reset?token=${encodeURIComponent(rawToken)}`;

        // Send email
        try {
            console.info("RESET_EMAIL_SEND_STARTED", { tokenId, userId: user.id, to: user.email, resetLinkHost: readResetBaseUrl() });
            const diagnostics = await sendPasswordResetEmail({
                to: user.email,
                resetLink,
                expiresMinutes: PASSWORD_RESET_TTL_MINUTES,
            });
            console.info("RESET_EMAIL_SEND_SUCCESS", {
                tokenId,
                userId: user.id,
                to: user.email,
                provider: diagnostics.provider,
                tokenStatus: diagnostics.tokenStatus,
                tokenBody: diagnostics.tokenBody,
                sendStatus: diagnostics.sendStatus,
                sendBody: diagnostics.sendBody,
                smtpVerifyOk: diagnostics.smtpVerifyOk,
                smtpVerifyError: diagnostics.smtpVerifyError,
                smtpSendResponse: diagnostics.smtpSendResponse,
                smtpAccepted: diagnostics.smtpAccepted,
                smtpRejected: diagnostics.smtpRejected,
                messageId: diagnostics.messageId,
            });
        } catch (error) {
            console.error("RESET_EMAIL_SEND_FAILURE", {
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
