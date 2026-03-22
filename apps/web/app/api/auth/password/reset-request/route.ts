import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { normalizeEmail } from "@/lib/server/auth-domain-policy";
import { generateResetToken, hashResetToken } from "@/lib/server/password";

const PASSWORD_RESET_TTL_MINUTES = 30;

type PasswordResetRequestPayload = {
    email?: string;
};

async function sendPasswordResetEmail(args: { to: string; resetLink: string; expiresMinutes: number }): Promise<void> {
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
        const detail = await tokenResponse.text().catch(() => "");
        throw new Error(`Failed to get Microsoft Graph token (${tokenResponse.status}): ${detail}`);
    }

    const tokenJson = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
        throw new Error("Microsoft Graph token response did not include access_token");
    }

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

    const sendResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`, {
        method: "POST",
        headers: {
            authorization: `Bearer ${tokenJson.access_token}`,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            message: {
                subject: "WathiqCare Password Reset Request",
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
        throw new Error(`Failed to send password reset email (${sendResponse.status}): ${detail}`);
    }
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
            await sendPasswordResetEmail({
                to: user.email,
                resetLink,
                expiresMinutes: PASSWORD_RESET_TTL_MINUTES,
            });
            console.info("RESET_EMAIL_SEND_SUCCESS", { tokenId, userId: user.id, to: user.email });
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
