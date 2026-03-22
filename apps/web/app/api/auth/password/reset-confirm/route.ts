import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { hashPassword, hashResetToken, validatePasswordStrength } from "@/lib/server/password";

type PasswordResetConfirmPayload = {
    token?: string;
    password?: string;
};

async function consumePasswordResetToken(rawToken: string): Promise<{ id: string; userId: string }> {
    const tokenHash = hashResetToken(rawToken);

    return prisma.$transaction(async (tx) => {
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

export async function POST(request: NextRequest) {
    try {
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
        const resetToken = await consumePasswordResetToken(token);

        // Get current password hash to prevent reuse
        const currentUser = await prisma.user.findUnique({
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
            await prisma.$executeRaw`
        INSERT INTO password_history (user_id, password_hash)
        VALUES (${resetToken.userId}, ${currentUser.hashedPassword})
      `;
        }

        // Update user password
        await prisma.$executeRaw`
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
