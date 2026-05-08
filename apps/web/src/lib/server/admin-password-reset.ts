import type { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/server/http";
import { ensurePasswordResetSchema, isMissingTableOrColumnError } from "@/lib/server/auth-reset";
import { getPrisma } from "@/lib/server/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/server/password";

type ResetPasswordResult = {
    userId: string;
    email: string;
};

type UserSecurityActionResult = {
    userId: string;
    email: string;
};

export async function ensureAdminUserSecuritySchema(prisma: ReturnType<typeof getPrisma>): Promise<void> {
    await ensurePasswordResetSchema(prisma);
    await prisma.$executeRawUnsafe(`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS step_up_revoked_at TIMESTAMPTZ NULL
    `);
}

async function resolveUserForSecurityAction(
    tx: Prisma.TransactionClient,
    userId: string,
): Promise<UserSecurityActionResult & { hashedPassword: string | null }> {
    const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            hashedPassword: true,
        },
    });

    if (!currentUser) {
        throw new ApiError(404, "User not found");
    }

    return {
        userId: currentUser.id,
        email: currentUser.email,
        hashedPassword: currentUser.hashedPassword,
    };
}

export async function forceLogoutUserByAdmin(
    prisma: ReturnType<typeof getPrisma>,
    userId: string,
): Promise<UserSecurityActionResult> {
    await ensureAdminUserSecuritySchema(prisma);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const currentUser = await resolveUserForSecurityAction(tx, userId);

        await tx.$executeRaw`
            UPDATE users
            SET session_revoked_at = NOW()
            WHERE id = ${currentUser.userId}
        `;

        return {
            userId: currentUser.userId,
            email: currentUser.email,
        };
    });
}

export async function resetUserMfaByAdmin(
    prisma: ReturnType<typeof getPrisma>,
    userId: string,
): Promise<UserSecurityActionResult> {
    await ensureAdminUserSecuritySchema(prisma);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const currentUser = await resolveUserForSecurityAction(tx, userId);

        await tx.$executeRaw`
            UPDATE users
            SET step_up_revoked_at = NOW()
            WHERE id = ${currentUser.userId}
        `;

        return {
            userId: currentUser.userId,
            email: currentUser.email,
        };
    });
}

export async function setUserPasswordByAdmin(
    prisma: ReturnType<typeof getPrisma>,
    userId: string,
    password: string,
): Promise<ResetPasswordResult> {
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
        throw new ApiError(400, passwordValidation.errors.join("; "));
    }

    await ensureAdminUserSecuritySchema(prisma);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const currentUser = await resolveUserForSecurityAction(tx, userId);

        const passwordHash = await hashPassword(password);

        if (currentUser.hashedPassword) {
            try {
                await tx.$executeRaw`
                    INSERT INTO password_history (user_id, password_hash)
                    VALUES (${currentUser.userId}, ${currentUser.hashedPassword})
                `;
            } catch (historyError) {
                if (!isMissingTableOrColumnError(historyError)) {
                    throw historyError;
                }
            }
        }

        await tx.$executeRaw`
            UPDATE users
            SET hashed_password = ${passwordHash},
                last_password_changed_at = NOW(),
                password_reset_required = FALSE,
                session_revoked_at = NOW(),
                step_up_revoked_at = NOW(),
                failed_login_attempts = 0,
                locked_until = NULL
            WHERE id = ${currentUser.userId}
        `;

        return {
            userId: currentUser.userId,
            email: currentUser.email,
        };
    });
}