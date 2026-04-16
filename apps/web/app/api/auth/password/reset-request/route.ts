import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { normalizeEmail } from "@/lib/server/auth-domain-policy";
import {
    buildPasswordResetLink,
    createPasswordResetToken,
    getPasswordResetTtlMinutes,
    isMissingTableOrColumnError,
    sendPasswordResetEmail,
} from "@/lib/server/auth-reset";

type PasswordResetRequestPayload = {
    email?: string;
};

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

        const ttlMinutes = getPasswordResetTtlMinutes();
        let usedLegacyUserColumns = false;
        let tokenId = "";
        let rawToken = "";
        try {
            const tokenRecord = await createPasswordResetToken(prisma, {
                userId: user.id,
                reason: "self_service_reset_request",
            });
            tokenId = tokenRecord.tokenId;
            rawToken = tokenRecord.rawToken;
        } catch (tokenStoreError) {
            if (!isMissingTableOrColumnError(tokenStoreError)) {
                throw tokenStoreError;
            }

            // Backward compatibility for environments that still use user-level reset columns.
            usedLegacyUserColumns = true;
            rawToken = crypto.randomBytes(32).toString("base64url");
            const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
            const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordResetTokenHash: tokenHash,
                    passwordResetExpiresAt: expiresAt,
                },
            });
        }

        // Build reset link
        const resetLink = buildPasswordResetLink(rawToken);

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
                expiresMinutes: ttlMinutes,
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
