import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ApiError, handleApiError } from "@/lib/server/http";
<<<<<<< HEAD
import { getPrisma } from "@/lib/server/prisma";
=======
import { prisma } from "@/lib/server/prisma";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
import { normalizeEmail } from "@/lib/server/auth-domain-policy";
import { generateResetToken, hashResetToken } from "@/lib/server/password";

const EMAIL_VERIFICATION_TTL_MINUTES = 60;

type EmailVerificationRequestPayload = {
    email?: string;
};

<<<<<<< HEAD
function readVerificationBaseUrl(): string {
    const configured =
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.APP_BASE_URL?.trim();

    if (configured) {
        return configured.replace(/\/$/, "");
    }

    return "https://wathiqcare.online";
}

async function sendVerificationEmail(args: {
    to: string;
    verificationLink: string;
    expiresMinutes: number;
}): Promise<void> {
=======
async function sendVerificationEmail(args: { to: string; verificationLink: string; expiresMinutes: number }): Promise<void> {
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    const tenantId = process.env.MICROSOFT_TENANT_ID?.trim();
    const clientId = process.env.MICROSOFT_CLIENT_ID?.trim();
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim();
    const senderEmail = process.env.MICROSOFT_SENDER_EMAIL?.trim().toLowerCase();

    if (!tenantId || !clientId || !clientSecret || !senderEmail) {
        throw new Error("Microsoft Graph email configuration is missing");
    }

<<<<<<< HEAD
    const tokenResponse = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                scope: "https://graph.microsoft.com/.default",
                grant_type: "client_credentials",
            }),
            cache: "no-store",
        }
    );
=======
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
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

    if (!tokenResponse.ok) {
        throw new Error(`Failed to get Microsoft Graph token (${tokenResponse.status})`);
    }

    const tokenJson = (await tokenResponse.json()) as { access_token?: string };
<<<<<<< HEAD

    if (!tokenJson.access_token) {
        throw new Error("Microsoft Graph token response missing access_token");
    }

    const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a;">
      <h2>WathiqCare Email Verification</h2>
      <p>Please verify your email address.</p>
      <a href="${args.verificationLink}" 
         style="background:#0f766e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">
         Verify Email
      </a>
      <p>This link expires in ${args.expiresMinutes} minutes.</p>
    </div>
  `;

    const sendResponse = await fetch(
        `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
        {
            method: "POST",
            headers: {
                authorization: `Bearer ${tokenJson.access_token}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                message: {
                    subject: "WathiqCare Email Verification",
                    body: { contentType: "HTML", content: html },
                    toRecipients: [{ emailAddress: { address: args.to } }],
                },
                saveToSentItems: true,
            }),
            cache: "no-store",
        }
    );

    if (!sendResponse.ok) {
        const detail = await sendResponse.text().catch(() => "");
        throw new Error(`Email send failed (${sendResponse.status}): ${detail}`);
    }
}

export async function POST(request: NextRequest) {
    try {
        const prisma = getPrisma(); // ✅ FIX

        const payload = (await request.json().catch(() => null)) as
            | EmailVerificationRequestPayload
            | null;

=======
    if (!tokenJson.access_token) {
        throw new Error("Microsoft Graph token response did not include access_token");
    }

    const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h2 style="margin-bottom: 12px;">WathiqCare Email Verification</h2>
      <p>Please verify your email address to complete your WathiqCare account setup.</p>
      <p>
        <a href="${args.verificationLink}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Verify your email
        </a>
      </p>
      <p>This link expires in ${args.expiresMinutes} minutes and can only be used once.</p>
      <p style="font-size: 13px; color: #475569;">If you did not request email verification, you can ignore this email.</p>
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
                subject: "WathiqCare Email Verification",
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
        throw new Error(`Failed to send verification email (${sendResponse.status}): ${detail}`);
    }
}

function readVerificationBaseUrl(): string {
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_BASE_URL?.trim();
    if (configured) {
        return configured.replace(/\/$/, "");
    }
    return "https://wathiqcare.online";
}

export async function POST(request: NextRequest) {
    try {
        const payload = (await request.json().catch(() => null)) as EmailVerificationRequestPayload | null;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        if (!payload) {
            throw new ApiError(400, "Invalid JSON body");
        }

<<<<<<< HEAD
        const email = normalizeEmail(payload.email || "");

        // 🔒 Security: do not reveal if user exists
        const genericResponse = {
            message: "If an account exists, a verification email has been sent.",
        };

        if (!email) {
            return NextResponse.json(genericResponse);
        }

        const user = await getPrisma().user.findUnique({
=======
        const { email: emailInput } = payload;
        const email = normalizeEmail(emailInput || "");

        if (!email) {
            return NextResponse.json({ message: "If an account exists, a verification email has been sent." });
        }

        const user = await prisma.user.findUnique({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            where: { email },
            select: { id: true, email: true, emailVerified: true },
        });

        if (!user) {
<<<<<<< HEAD
            return NextResponse.json(genericResponse);
        }

        if (user.emailVerified) {
            return NextResponse.json({
                message: "This email is already verified",
            });
        }

        const rawToken = generateResetToken();
        const tokenHash = hashResetToken(rawToken);
        const expiresAt = new Date(
            Date.now() + EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000
        );

        const tokenId = crypto.randomUUID();

        await getPrisma().$executeRaw`
            INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at, used)
            VALUES (${tokenId}, ${user.id}, ${tokenHash}, ${expiresAt}, FALSE)
        `;

        await getPrisma().$executeRaw`
            UPDATE email_verification_tokens
            SET used = TRUE
            WHERE user_id = ${user.id} AND id != ${tokenId}
        `;

        const verificationLink = `${readVerificationBaseUrl()}/auth/verify-email?token=${encodeURIComponent(
            rawToken
        )}`;

=======
            return NextResponse.json({ message: "If an account exists, a verification email has been sent." });
        }

        if (user.emailVerified) {
            return NextResponse.json({ message: "This email is already verified" });
        }

        // Generate verification token
        const rawToken = generateResetToken();
        const tokenHash = hashResetToken(rawToken);
        const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000);

        // Store token
        const tokenId = crypto.randomUUID();
        await prisma.$executeRaw`
      INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at, used)
      VALUES (${tokenId}, ${user.id}, ${tokenHash}, ${expiresAt}, FALSE)
    `;

        // Mark old tokens as used
        await prisma.$executeRaw`
      UPDATE email_verification_tokens
      SET used = TRUE
      WHERE user_id = ${user.id} AND id != ${tokenId}
    `;

        // Build verification link
        const verificationLink = `${readVerificationBaseUrl()}/auth/verify-email?token=${encodeURIComponent(rawToken)}`;

        // Send email
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        try {
            await sendVerificationEmail({
                to: user.email,
                verificationLink,
                expiresMinutes: EMAIL_VERIFICATION_TTL_MINUTES,
            });
<<<<<<< HEAD
        } catch (err) {
            console.error("EMAIL_SEND_FAILED", err);
            // intentional silent failure
        }

        return NextResponse.json(genericResponse);
=======
        } catch (error) {
            console.error("Failed to send verification email:", error);
            // Still return success to prevent information leakage
        }

        return NextResponse.json({ message: "If an account exists, a verification email has been sent." });
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    } catch (error) {
        return handleApiError(error);
    }
}
