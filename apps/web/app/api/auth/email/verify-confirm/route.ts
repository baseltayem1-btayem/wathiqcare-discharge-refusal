import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/server/http";
<<<<<<< HEAD
import { getPrisma } from "@/lib/server/prisma";
=======
import { prisma } from "@/lib/server/prisma";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
import { hashResetToken } from "@/lib/server/password";

type EmailVerificationConfirmPayload = {
    token?: string;
};

<<<<<<< HEAD
type ConsumedEmailVerificationToken = {
    id: string;
    userId: string;
    email: string;
};

function assertToken(token?: string): string {
    const normalized = (token ?? "").trim();

    if (!normalized) {
        throw new ApiError(400, "Token is required");
    }

    return normalized;
}

async function consumeEmailVerificationToken(
    rawToken: string,
): Promise<ConsumedEmailVerificationToken> {
    const prisma = getPrisma();
    const tokenHash = hashResetToken(rawToken);

    return getPrisma().$transaction(async (tx) => {
        const rows = await tx.$queryRaw<
            Array<{
                id: string;
                user_id: string;
                expires_at: Date;
                used: boolean;
            }>
        >`
            SELECT evt.id, evt.user_id, evt.expires_at, evt.used
            FROM email_verification_tokens evt
            WHERE evt.token_hash = ${tokenHash}
            LIMIT 1
            FOR UPDATE
        `;

        const token = rows[0];

=======
async function consumeEmailVerificationToken(rawToken: string): Promise<{ id: string; userId: string; email: string }> {
    const tokenHash = hashResetToken(rawToken);

    return prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{ id: string; user_id: string; expires_at: Date; used: boolean }>>`
      SELECT evt.id, evt.user_id, evt.expires_at, evt.used
      FROM email_verification_tokens evt
      WHERE evt.token_hash = ${tokenHash}
      LIMIT 1
      FOR UPDATE
    `;

        const token = rows[0];
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        if (!token) {
            throw new ApiError(400, "Invalid verification token");
        }

        if (token.used) {
            throw new ApiError(400, "This verification token has already been used");
        }

        if (token.expires_at.getTime() <= Date.now()) {
            throw new ApiError(400, "This verification token has expired");
        }

<<<<<<< HEAD
        const userRows = await tx.$queryRaw<Array<{ email: string }>>`
            SELECT email
            FROM users
            WHERE id = ${token.user_id}
        `;

        const user = userRows[0];

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        await tx.$executeRaw`
            UPDATE email_verification_tokens
            SET used = TRUE, used_at = NOW()
            WHERE id = ${token.id}
        `;

        await tx.$executeRaw`
            UPDATE users
            SET email_verified = TRUE, email_verified_at = NOW()
            WHERE id = ${token.user_id}
        `;

        return {
            id: token.id,
            userId: token.user_id,
            email: user.email,
        };
=======
        // Get user email
        const userRows = await tx.$queryRaw<Array<{ email: string }>>`
      SELECT email FROM users WHERE id = ${token.user_id}
    `;

        if (!userRows[0]) {
            throw new ApiError(404, "User not found");
        }

        // Mark token as used
        await tx.$executeRaw`
      UPDATE email_verification_tokens
      SET used = TRUE, used_at = NOW()
      WHERE id = ${token.id}
    `;

        // Mark email as verified
        await tx.$executeRaw`
      UPDATE users
      SET email_verified = TRUE, email_verified_at = NOW()
      WHERE id = ${token.user_id}
    `;

        return { id: token.id, userId: token.user_id, email: userRows[0].email };
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    });
}

export async function POST(request: NextRequest) {
    try {
<<<<<<< HEAD
        const payload = (await request.json().catch(() => null)) as
            | EmailVerificationConfirmPayload
            | null;

=======
        const payload = (await request.json().catch(() => null)) as EmailVerificationConfirmPayload | null;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        if (!payload) {
            throw new ApiError(400, "Invalid JSON body");
        }

<<<<<<< HEAD
        const token = assertToken(payload.token);

=======
        const { token } = payload;

        if (!token) {
            throw new ApiError(400, "Token is required");
        }

        // Consume token
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        const verificationToken = await consumeEmailVerificationToken(token);

        return NextResponse.json({
            message: "Email verified successfully",
            email: verificationToken.email,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
