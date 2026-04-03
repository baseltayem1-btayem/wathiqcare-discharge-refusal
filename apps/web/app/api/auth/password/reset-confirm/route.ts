import { NextRequest, NextResponse } from "next/server";
<<<<<<< HEAD
import type { Prisma } from "@prisma/client";
=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { hashPassword, hashResetToken, validatePasswordStrength } from "@/lib/server/password";

type PasswordResetConfirmPayload = {
    token?: string;
    password?: string;
};

<<<<<<< HEAD
async function consumePasswordResetToken(prisma: ReturnType<typeof getPrisma>, rawToken: string): Promise<{ id: string; userId: string }> {
    const tokenHash = hashResetToken(rawToken);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
=======
async function consumePasswordResetToken(prisma: any, rawToken: string): Promise<{ id: string; userId: string }> {
    const tokenHash = hashResetToken(rawToken);

    return prisma.$transaction(async (tx: any) => {
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        const rows = await tx.$queryRaw<Array<{ id: string; user_id: string; expires_at: Date; used: boolean }>>`
      SELECT id, user_id, expires_at, used
      FROM password_reset_tokens
      WHERE token_hash = ${tokenHash}
      LIMIT 1
      FOR UPDATE
    `;

        const token = rows[0];
        if (!token) {
            throw new ApiError(400, "Invalid reset token");
        }

        if (token.used) {
            throw new ApiError(400, "This reset token has already been used");
        }

        if (token.expires_at.getTime() <= Date.now()) {
            throw new ApiError(400, "This reset token has expired");
        }

        await tx.$executeRaw`
      UPDATE password_reset_tokens
      SET used = TRUE, used_at = NOW()
      WHERE id = ${token.id}
    `;

        return { id: token.id, userId: token.user_id };
    });
}

<<<<<<< HEAD
export async function POST(request: NextRequest) {
=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
try {
    const prisma = getPrisma();
    console.info("PASSWORD_RESET_CONFIRM_STARTED");

    const payload = (await request.json().catch(() => null)) as PasswordResetConfirmPayload | null;
    if (!payload) {
        throw new ApiError(400, "Invalid JSON body");
    }

    const { token, password } = payload;

    if (!token || !password) {
        throw new ApiError(400, "Token and password are required");
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
        throw new ApiError(400, passwordValidation.errors.join("; "));
    }

    // Consume token
    const resetToken = await consumePasswordResetToken(prisma, token);

    // Get current password hash to prevent reuse
<<<<<<< HEAD
    const currentUser = await getPrisma().user.findUnique({
=======
    const currentUser = await prisma.user.findUnique({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        where: { id: resetToken.userId },
        select: { hashedPassword: true },
    });

    if (!currentUser) {
        throw new ApiError(404, "User not found");
    }

    // Hash new password
    const newPasswordHash = await hashPassword(password);

    // Store in password history
    if (currentUser.hashedPassword) {
<<<<<<< HEAD
        await getPrisma().$executeRaw`
=======
        await prisma.$executeRaw`
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        INSERT INTO password_history (user_id, password_hash)
        VALUES (${resetToken.userId}, ${currentUser.hashedPassword})
      `;
    }

    // Update user password
<<<<<<< HEAD
    await getPrisma().$executeRaw`
=======
    await prisma.$executeRaw`
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
      UPDATE users
      SET 
        hashed_password = ${newPasswordHash},
        last_password_changed_at = NOW(),
        failed_login_attempts = 0,
        locked_until = NULL
      WHERE id = ${resetToken.userId}
    `;

    console.info("PASSWORD_RESET_COMPLETED", { userId: resetToken.userId, tokenId: resetToken.id });
    return NextResponse.json({ message: "Password has been reset successfully" });
} catch (error) {
    console.error("PASSWORD_RESET_FAILED", {
        error: error instanceof Error ? error.message : String(error),
    });
    return handleApiError(error);
}
}
