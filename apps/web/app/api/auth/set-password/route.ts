import { NextRequest, NextResponse } from "next/server";
<<<<<<< HEAD
import type { Prisma } from "@prisma/client";
=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { requireAuth } from "@/lib/server/auth";
import { normalizeEmail } from "@/lib/server/auth-domain-policy";
import { hashPassword, hashResetToken, validatePasswordStrength } from "@/lib/server/password";

type SetPasswordPayload = {
    email?: string;
    password?: string;
    token?: string;
};

<<<<<<< HEAD
async function consumeSetupToken(prisma: ReturnType<typeof getPrisma>, email: string, rawToken: string): Promise<string> {
    const tokenHash = hashResetToken(rawToken);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
=======
async function consumeSetupToken(prisma: any, email: string, rawToken: string): Promise<string> {
    const tokenHash = hashResetToken(rawToken);

    return prisma.$transaction(async (tx: any) => {
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        const userRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM users
      WHERE LOWER(email) = ${email}
      LIMIT 1
      FOR UPDATE
    `;

        const userId = userRows[0]?.id;
        if (!userId) {
            throw new ApiError(404, "User not found");
        }

        const resetRows = await tx.$queryRaw<Array<{ id: string; expires_at: Date; used: boolean }>>`
      SELECT id, expires_at, used
      FROM password_reset_tokens
      WHERE user_id = ${userId} AND token_hash = ${tokenHash}
      LIMIT 1
      FOR UPDATE
    `;

        const verificationRows = resetRows.length === 0
            ? await tx.$queryRaw<Array<{ id: string; expires_at: Date; used: boolean }>>`
          SELECT id, expires_at, used
          FROM email_verification_tokens
          WHERE user_id = ${userId} AND token_hash = ${tokenHash}
          LIMIT 1
          FOR UPDATE
        `
            : [];

        const tokenRow = resetRows[0] ?? verificationRows[0];
        const sourceTable = resetRows[0] ? "password_reset_tokens" : verificationRows[0] ? "email_verification_tokens" : null;

        if (!tokenRow || !sourceTable) {
            throw new ApiError(400, "Invalid setup token");
        }

        if (tokenRow.used) {
            throw new ApiError(400, "This setup token has already been used");
        }

        if (tokenRow.expires_at.getTime() <= Date.now()) {
            throw new ApiError(400, "This setup token has expired");
        }

        if (sourceTable === "password_reset_tokens") {
            await tx.$executeRaw`
        UPDATE password_reset_tokens
        SET used = TRUE, used_at = NOW()
        WHERE id = ${tokenRow.id}
      `;
        } else {
            await tx.$executeRaw`
        UPDATE email_verification_tokens
        SET used = TRUE, used_at = NOW()
        WHERE id = ${tokenRow.id}
      `;
        }

        return userId;
    });
}

<<<<<<< HEAD
export async function POST(request: NextRequest) {
=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
try {
    const prisma = getPrisma();
    const payload = (await request.json().catch(() => null)) as SetPasswordPayload | null;
    if (!payload) {
        throw new ApiError(400, "Invalid JSON body");
    }

    const email = normalizeEmail(payload.email || "");
    const password = payload.password || "";
    const token = payload.token?.trim() || "";

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
        throw new ApiError(400, passwordValidation.errors.join("; "));
    }

    const currentAuth = await requireAuth(request).catch(() => null);

    let userId: string | null = null;
    if (currentAuth?.email && normalizeEmail(currentAuth.email) === email) {
        userId = currentAuth.sub;
    } else if (token) {
        userId = await consumeSetupToken(prisma, email, token);
    } else {
        throw new ApiError(401, "Password setup requires a valid session or setup token");
    }

    const passwordHash = await hashPassword(password);

<<<<<<< HEAD
    await getPrisma().$executeRaw`
=======
    await prisma.$executeRaw`
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
      UPDATE users
      SET hashed_password = ${passwordHash},
          auth_provider = 'local_password',
          last_password_changed_at = NOW(),
          failed_login_attempts = 0,
          locked_until = NULL
      WHERE id = ${userId}
    `;

    return NextResponse.json({
        success: true,
        message: "Password set successfully",
    });
} catch (error) {
    return handleApiError(error);
}
<<<<<<< HEAD
}
=======
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
